"use strict";
/**
 * User Management API Routes
 *
 * Implements CRUD endpoints for user management with RBAC support.
 *
 * Requirements:
 * - 4.1: Owner/Company Manager can create users with roles below their own
 * - 4.2: Store Manager can only create Salesperson for their managed stores
 * - 4.3: Unique email per tenant
 * - 4.4: Deactivated users immediately lose access
 * - 4.5: All user management actions are logged for audit
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const permission_1 = require("../middleware/permission");
const permission_service_1 = require("../services/permission-service");
const audit_log_repository_1 = require("../repositories/audit-log-repository");
const types_1 = require("../types");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
function normalizeUserRole(role) {
    return role === 'admin' ? 'owner' : role;
}
/**
 * Check if current user can manage target role based on role hierarchy
 * - Owner can manage all roles including other owners
 * - Company Manager can manage other company managers and below
 * - Store Manager can only manage salesperson
 */
function canManageRole(currentUserRole, targetRole) {
    // Owner can manage everyone
    if (currentUserRole === 'owner') {
        return true;
    }
    // Company Manager can manage same level (other company managers) and below
    if (currentUserRole === 'company_manager') {
        return types_1.ROLE_HIERARCHY[currentUserRole] >= types_1.ROLE_HIERARCHY[targetRole];
    }
    // Other roles can only manage roles below them
    return types_1.ROLE_HIERARCHY[currentUserRole] > types_1.ROLE_HIERARCHY[targetRole];
}
/**
 * Get users that current user can see based on role hierarchy
 * - Owner can see all users
 * - Company Manager can see other company managers and below
 * - Store Manager can see store managers and salesperson
 */
function buildUserVisibilityFilter(currentUserRole) {
    if (currentUserRole === 'owner') {
        return "1=1"; // Owner sees all
    }
    if (currentUserRole === 'company_manager') {
        // Company Manager can see other company managers and below
        return "role IN ('company_manager', 'store_manager', 'salesperson')";
    }
    const manageableRoles = (0, types_1.getManageableRoles)(currentUserRole);
    // Include same role level for visibility
    manageableRoles.push(currentUserRole);
    if (manageableRoles.length === 0) {
        return "1=0";
    }
    const roleList = manageableRoles.map(r => `'${r}'`).join(',');
    return `role IN (${roleList})`;
}
const PLAN_PRIORITY_FALLBACK = {
    basic: 1,
    pro: 2,
    enterprise: 3,
};
async function getPlanPriority(planId) {
    if (!planId)
        return 0;
    try {
        const plan = await (0, db_1.queryOne)(`SELECT sort_order, max_stores FROM SubscriptionPlans WHERE id = @planId`, { planId });
        if (plan?.sort_order && Number(plan.sort_order) > 0) {
            return Number(plan.sort_order);
        }
        if (plan?.max_stores && Number(plan.max_stores) > 0) {
            return Number(plan.max_stores);
        }
    }
    catch (error) {
        // Fallback mapping is used when SubscriptionPlans is unavailable in legacy schemas.
        console.warn('Cannot read plan priority from SubscriptionPlans, fallback to default map:', error);
    }
    return PLAN_PRIORITY_FALLBACK[planId] || 0;
}
function buildUserDisplayName(displayName, email, fallbackId) {
    const normalizedDisplayName = String(displayName || '').trim();
    if (normalizedDisplayName) {
        return normalizedDisplayName;
    }
    const normalizedEmail = String(email || '').trim();
    if (normalizedEmail) {
        return normalizedEmail.includes('@') ? normalizedEmail.split('@')[0] : normalizedEmail;
    }
    return fallbackId ? `ID: ${fallbackId.slice(0, 8)}` : 'Nguoi dung khong xac dinh';
}
async function ensureSubscriptionTransactionAuditColumns() {
    await (0, db_1.query)(`
    IF OBJECT_ID('SubscriptionTransactions', 'U') IS NOT NULL
    BEGIN
      IF COL_LENGTH('SubscriptionTransactions', 'processed_by_name') IS NULL
        ALTER TABLE SubscriptionTransactions ADD processed_by_name NVARCHAR(255) NULL;

      IF COL_LENGTH('SubscriptionTransactions', 'processed_by_email') IS NULL
        ALTER TABLE SubscriptionTransactions ADD processed_by_email NVARCHAR(255) NULL;

      IF COL_LENGTH('SubscriptionTransactions', 'user_name_snapshot') IS NULL
        ALTER TABLE SubscriptionTransactions ADD user_name_snapshot NVARCHAR(255) NULL;

      IF COL_LENGTH('SubscriptionTransactions', 'user_email_snapshot') IS NULL
        ALTER TABLE SubscriptionTransactions ADD user_email_snapshot NVARCHAR(255) NULL;

      IF COL_LENGTH('SubscriptionTransactions', 'metadata') IS NULL
        ALTER TABLE SubscriptionTransactions ADD metadata NVARCHAR(MAX) NULL;
    END
  `);
}
async function dropSubscriptionUserForeignKeysForHistoryRetention() {
    await (0, db_1.query)(`
    DECLARE @dropSql NVARCHAR(MAX) = N'';

    SELECT @dropSql = @dropSql
      + N'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(fk.parent_object_id))
      + N'.' + QUOTENAME(OBJECT_NAME(fk.parent_object_id))
      + N' DROP CONSTRAINT ' + QUOTENAME(fk.name) + N';'
    FROM sys.foreign_keys fk
    INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
    INNER JOIN sys.columns parent_col
      ON parent_col.object_id = fkc.parent_object_id
      AND parent_col.column_id = fkc.parent_column_id
    INNER JOIN sys.columns ref_col
      ON ref_col.object_id = fkc.referenced_object_id
      AND ref_col.column_id = fkc.referenced_column_id
    WHERE OBJECT_NAME(fk.parent_object_id) IN ('SubscriptionTransactions', 'SubscriptionHistory')
      AND parent_col.name = 'user_id'
      AND OBJECT_NAME(fk.referenced_object_id) = 'Users'
      AND ref_col.name = 'id';

    IF LEN(@dropSql) > 0
      EXEC sp_executesql @dropSql;
  `);
}
/**
 * GET /api/users/roles/assignable - Get roles that current user can assign
 */
router.get('/roles/assignable', async (req, res) => {
    try {
        const currentUser = req.user;
        const currentUserRole = normalizeUserRole(currentUser.role);
        const assignableRoles = (0, types_1.getManageableRoles)(currentUserRole);
        res.json({ roles: assignableRoles, currentRole: currentUserRole });
    }
    catch (error) {
        console.error('Get assignable roles error:', error);
        res.status(500).json({ error: 'Không thể lấy danh sách roles' });
    }
});
/**
 * GET /api/users/audit-logs - Get audit logs for user management actions
 * Requirements: 4.5
 */
router.get('/audit-logs', (0, permission_1.requireModulePermission)('users', 'view'), async (req, res) => {
    try {
        const currentUser = req.user;
        const currentUserRole = currentUser.role;
        const storeId = req.headers['x-store-id'];
        // Only owner and company_manager can view all audit logs
        if (currentUserRole !== 'owner' && currentUserRole !== 'company_manager') {
            res.status(403).json({ error: 'Bạn không có quyền xem nhật ký kiểm toán', errorCode: 'PERM001' });
            return;
        }
        const { page, pageSize, userId, action, dateFrom, dateTo } = req.query;
        const logs = await audit_log_repository_1.auditLogRepository.findByStore(storeId || 'system', {
            entityType: 'User',
            userId: userId,
            action: action,
            dateFrom: dateFrom,
            dateTo: dateTo,
            page: page ? parseInt(page) : 1,
            pageSize: pageSize ? parseInt(pageSize) : 20,
        });
        // Also include UserStores audit logs
        const userStoreLogs = await audit_log_repository_1.auditLogRepository.findByStore(storeId || 'system', {
            entityType: 'UserStores',
            userId: userId,
            action: action,
            dateFrom: dateFrom,
            dateTo: dateTo,
            page: page ? parseInt(page) : 1,
            pageSize: pageSize ? parseInt(pageSize) : 20,
        });
        // Combine and sort by date
        const combinedLogs = [...logs.data, ...userStoreLogs.data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        res.json({
            data: combinedLogs.slice(0, parseInt(pageSize) || 20),
            total: logs.total + userStoreLogs.total,
            page: parseInt(page) || 1,
            pageSize: parseInt(pageSize) || 20,
        });
    }
    catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({ error: 'Không thể lấy nhật ký kiểm toán' });
    }
});
/**
 * GET /api/users/:id/audit-logs - Get audit logs for a specific user
 * Requirements: 4.5
 */
router.get('/:id/audit-logs', (0, permission_1.requireModulePermission)('users', 'view'), async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;
        const currentUserRole = currentUser.role;
        // Get target user
        const user = await (0, db_1.queryOne)('SELECT id, role FROM Users WHERE id = @id', { id });
        if (!user) {
            res.status(404).json({ error: 'Không tìm thấy người dùng' });
            return;
        }
        // Check role hierarchy
        if (currentUserRole !== 'owner' && !canManageRole(currentUserRole, user.role)) {
            res.status(403).json({ error: 'Bạn không có quyền xem nhật ký của người dùng này', errorCode: 'PERM001' });
            return;
        }
        const { page, pageSize } = req.query;
        // Get audit logs for this user entity
        const userLogs = await audit_log_repository_1.auditLogRepository.findByEntity('User', id);
        const userStoreLogs = await audit_log_repository_1.auditLogRepository.findByEntity('UserStores', id);
        // Combine and sort
        const combinedLogs = [...userLogs, ...userStoreLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const pageNum = parseInt(page) || 1;
        const size = parseInt(pageSize) || 20;
        const start = (pageNum - 1) * size;
        res.json({
            data: combinedLogs.slice(start, start + size),
            total: combinedLogs.length,
            page: pageNum,
            pageSize: size,
        });
    }
    catch (error) {
        console.error('Get user audit logs error:', error);
        res.status(500).json({ error: 'Không thể lấy nhật ký kiểm toán' });
    }
});
/**
 * POST /api/users - Create new user
 * Requirements: 4.1, 4.2, 4.3, 4.5
 */
router.post('/', (0, permission_1.requireModulePermission)('users', 'add'), auth_1.storeContext, async (req, res) => {
    try {
        const { email, password, displayName, role, status, storeIds, subscriptionPlanId, subscriptionMonths, autoRenewal, } = req.body;
        const currentUser = req.user;
        const currentUserRole = normalizeUserRole(currentUser.role);
        const currentStoreId = req.storeId;
        if (!email || !password) {
            res.status(400).json({ error: 'Email và mật khẩu là bắt buộc' });
            return;
        }
        const targetRole = (role || 'salesperson');
        if (!['owner', 'company_manager', 'store_manager', 'salesperson'].includes(targetRole)) {
            res.status(400).json({ error: 'Role không hợp lệ' });
            return;
        }
        // Check role hierarchy - Requirements: 4.1, 4.2
        if (!canManageRole(currentUserRole, targetRole)) {
            res.status(403).json({ error: 'Bạn không có quyền tạo người dùng với role này', errorCode: 'PERM001' });
            return;
        }
        // Store Manager can only create Salesperson - Requirements: 4.2
        if (currentUserRole === 'store_manager' && targetRole !== 'salesperson') {
            res.status(403).json({ error: 'Store Manager chỉ có thể tạo tài khoản Salesperson', errorCode: 'PERM001' });
            return;
        }
        // Check unique email - Requirements: 4.3
        const existingUser = await (0, db_1.queryOne)('SELECT id FROM Users WHERE email = @email', { email });
        if (existingUser) {
            res.status(400).json({ error: 'Email đã được sử dụng' });
            return;
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        let resolvedPlanId = 'basic';
        let resolvedMaxStores = 1;
        let resolvedStartDate = null;
        let resolvedEndDate = null;
        let resolvedSubscriptionStatus = 'active';
        let resolvedAutoRenewal = false;
        let resolvedPlanPrice = 0;
        const shouldAssignSubscription = typeof subscriptionPlanId === 'string' &&
            subscriptionPlanId.trim().length > 0;
        if (shouldAssignSubscription) {
            const now = new Date();
            const months = Number(subscriptionMonths) > 0 ? Math.min(Number(subscriptionMonths), 24) : 1;
            let planFromDb = null;
            try {
                planFromDb = await (0, db_1.queryOne)(`SELECT id, max_stores, price FROM SubscriptionPlans WHERE id = @planId AND is_active = 1`, { planId: subscriptionPlanId });
            }
            catch (planQueryError) {
                console.warn('SubscriptionPlans table unavailable, using fallback plans:', planQueryError);
            }
            const fallbackPlans = {
                basic: { maxStores: 1, price: 199000 },
                pro: { maxStores: 5, price: 499000 },
                enterprise: { maxStores: 999, price: 1999000 },
            };
            const fallback = fallbackPlans[subscriptionPlanId];
            if (planFromDb || fallback) {
                resolvedPlanId = planFromDb?.id || subscriptionPlanId;
                resolvedMaxStores = Number(planFromDb?.max_stores || fallback?.maxStores || 1);
                resolvedPlanPrice = Number(planFromDb?.price || fallback?.price || 0);
                resolvedStartDate = now;
                resolvedEndDate = new Date(now);
                resolvedEndDate.setMonth(resolvedEndDate.getMonth() + months);
                resolvedSubscriptionStatus = 'active';
                resolvedAutoRenewal = autoRenewal === undefined ? true : Boolean(autoRenewal);
            }
        }
        const result = await (0, db_1.query)(`INSERT INTO Users (
         id, email, password_hash, display_name, role, status, failed_login_attempts,
         subscription_plan_id, max_stores, subscription_start_date, subscription_end_date, auto_renewal, subscription_status,
         created_at, updated_at
       )
       OUTPUT INSERTED.*
       VALUES (
         NEWID(), @email, @passwordHash, @displayName, @role, @status, 0,
         @subscriptionPlanId, @maxStores, @subscriptionStartDate, @subscriptionEndDate, @autoRenewal, @subscriptionStatus,
         GETDATE(), GETDATE()
       )`, {
            email,
            passwordHash,
            displayName: displayName || email.split('@')[0],
            role: targetRole,
            status: status || 'active',
            subscriptionPlanId: resolvedPlanId,
            maxStores: resolvedMaxStores,
            subscriptionStartDate: resolvedStartDate,
            subscriptionEndDate: resolvedEndDate,
            autoRenewal: resolvedAutoRenewal ? 1 : 0,
            subscriptionStatus: resolvedSubscriptionStatus,
        });
        const newUser = result[0];
        const assignedStoreIds = [];
        if (storeIds && Array.isArray(storeIds) && storeIds.length > 0) {
            if (targetRole === 'store_manager' || targetRole === 'salesperson') {
                for (const storeId of storeIds) {
                    if (currentUserRole === 'store_manager') {
                        const hasAccess = currentUser.stores?.includes(storeId);
                        if (!hasAccess)
                            continue;
                    }
                    await (0, db_1.query)(`INSERT INTO UserStores (id, user_id, store_id)
             VALUES (NEWID(), @userId, @storeId)`, { userId: newUser.id, storeId });
                    assignedStoreIds.push(storeId);
                }
            }
        }
        else if (currentStoreId && (targetRole === 'store_manager' || targetRole === 'salesperson')) {
            await (0, db_1.query)(`INSERT INTO UserStores (id, user_id, store_id)
         VALUES (NEWID(), @userId, @storeId)`, { userId: newUser.id, storeId: currentStoreId });
            assignedStoreIds.push(currentStoreId);
        }
        // Audit log - Requirements: 4.5
        try {
            await audit_log_repository_1.auditLogRepository.create({
                storeId: currentStoreId || assignedStoreIds[0] || 'system',
                userId: currentUser.id,
                action: 'CREATE',
                entityType: 'User',
                entityId: newUser.id,
                newValues: { email: newUser.email, displayName: newUser.display_name, role: newUser.role, status: newUser.status, assignedStores: assignedStoreIds },
                ipAddress: req.ip || undefined,
                userAgent: req.headers['user-agent'],
            });
        }
        catch (auditError) {
            console.error('Audit log error (non-blocking):', auditError);
        }
        if (resolvedStartDate && resolvedEndDate) {
            try {
                await (0, db_1.query)(`INSERT INTO SubscriptionHistory
             (id, user_id, plan_id, max_stores, amount, payment_method, start_date, end_date, status, auto_renewal, created_at)
           VALUES
             (NEWID(), @userId, @planId, @maxStores, @amount, 'admin_assign', @startDate, @endDate, 'active', @autoRenewal, GETDATE())`, {
                    userId: newUser.id,
                    planId: resolvedPlanId,
                    maxStores: resolvedMaxStores,
                    amount: resolvedPlanPrice,
                    startDate: resolvedStartDate,
                    endDate: resolvedEndDate,
                    autoRenewal: resolvedAutoRenewal ? 1 : 0,
                });
                await ensureSubscriptionTransactionAuditColumns();
                const assignedByName = buildUserDisplayName(currentUser.displayName, currentUser.email, currentUser.id);
                const assignedByEmail = String(currentUser.email || '').trim() || null;
                const assignedToName = buildUserDisplayName(newUser.display_name, newUser.email, String(newUser.id || ''));
                const assignedToEmail = String(newUser.email || '').trim() || null;
                const metadata = JSON.stringify({
                    source: 'admin_assign',
                    assignedBy: {
                        id: currentUser.id,
                        fullName: assignedByName,
                        email: assignedByEmail || '',
                        role: currentUser.role,
                    },
                    assignedTo: {
                        id: String(newUser.id || ''),
                        fullName: assignedToName,
                        email: assignedToEmail || '',
                        role: targetRole,
                    },
                    action: 'create_user',
                });
                await (0, db_1.query)(`IF EXISTS (SELECT * FROM sysobjects WHERE name='SubscriptionTransactions' AND xtype='U')
           BEGIN
             INSERT INTO SubscriptionTransactions
               (id, user_id, transaction_type, plan_id, max_stores, amount, currency, payment_method, payment_status,
                start_date, end_date, auto_renewal, processed_by, processed_by_role,
                processed_by_name, processed_by_email, user_name_snapshot, user_email_snapshot,
                notes, metadata, created_at, updated_at)
             VALUES
               (NEWID(), @userId, 'manual_purchase', @planId, @maxStores, @amount, 'VND', 'admin_assign', 'completed',
                @startDate, @endDate, @autoRenewal, @processedBy, @processedByRole,
                @processedByName, @processedByEmail, @userNameSnapshot, @userEmailSnapshot,
                @notes, @metadata, GETDATE(), GETDATE())
           END`, {
                    userId: newUser.id,
                    planId: resolvedPlanId,
                    maxStores: resolvedMaxStores,
                    amount: resolvedPlanPrice,
                    startDate: resolvedStartDate,
                    endDate: resolvedEndDate,
                    autoRenewal: resolvedAutoRenewal ? 1 : 0,
                    processedBy: currentUser.id,
                    processedByRole: currentUser.role,
                    processedByName: assignedByName,
                    processedByEmail: assignedByEmail,
                    userNameSnapshot: assignedToName,
                    userEmailSnapshot: assignedToEmail,
                    notes: `Cấp gói khi tạo tài khoản (${targetRole})`,
                    metadata,
                });
            }
            catch (subscriptionLogError) {
                console.error('Subscription history log error (non-blocking):', subscriptionLogError);
            }
        }
        res.status(201).json({
            id: newUser.id, email: newUser.email, displayName: newUser.display_name,
            role: newUser.role, status: newUser.status, createdAt: newUser.created_at, stores: assignedStoreIds,
        });
    }
    catch (error) {
        console.error('Create user error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: `Không thể tạo người dùng: ${errorMessage}` });
    }
});
/**
 * GET /api/users - List users (filtered by role hierarchy)
 * Requirements: 4.1, 4.2
 */
router.get('/', (0, permission_1.requireModulePermission)('users', 'view'), async (req, res) => {
    try {
        const currentUser = req.user;
        const currentUserRole = normalizeUserRole(currentUser.role);
        console.log('[GET /api/users] Current user:', currentUser.email, 'Role:', currentUserRole);
        let whereClause = '1=1';
        // Owner can see all users
        if (currentUserRole !== 'owner') {
            whereClause = buildUserVisibilityFilter(currentUserRole);
        }
        console.log('[GET /api/users] Where clause:', whereClause);
        if (currentUserRole === 'store_manager' && currentUser.stores && currentUser.stores.length > 0) {
            const storeList = currentUser.stores.map(s => `'${s}'`).join(',');
            whereClause += ` AND (role IN ('owner', 'company_manager') OR id IN (
        SELECT user_id FROM UserStores WHERE store_id IN (${storeList})
      ))`;
        }
        const users = await (0, db_1.query)(`SELECT id, email, display_name, role, permissions, status, created_at, photo_url,
              subscription_plan_id, max_stores, subscription_start_date, subscription_end_date, auto_renewal, subscription_status
       FROM Users WHERE ${whereClause} ORDER BY created_at DESC`);
        const usersWithStores = await Promise.all(users.map(async (u) => {
            // Query without role_override column (may not exist in legacy databases)
            const stores = await (0, db_1.query)(`SELECT s.id as storeId, s.name as storeName, s.slug as storeCode
           FROM UserStores us JOIN Stores s ON us.store_id = s.id WHERE us.user_id = @userId`, { userId: u.id });
            return {
                id: u.id, email: u.email, displayName: u.display_name, role: u.role,
                permissions: u.permissions ? JSON.parse(u.permissions) : undefined,
                status: u.status, createdAt: u.created_at, photoURL: u.photo_url || undefined,
                subscriptionPlanId: u.subscription_plan_id || undefined,
                maxStores: Number(u.max_stores || 1),
                subscriptionStartDate: u.subscription_start_date || undefined,
                subscriptionEndDate: u.subscription_end_date || undefined,
                autoRenewal: Boolean(u.auto_renewal),
                subscriptionStatus: u.subscription_status || undefined,
                stores: stores.map((s) => ({
                    storeId: s.storeId, storeName: s.storeName, storeCode: s.storeCode,
                })),
            };
        }));
        res.json(usersWithStores);
    }
    catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Không thể lấy danh sách người dùng' });
    }
});
/**
 * GET /api/users/:id - Get user by ID
 */
router.get('/:id', (0, permission_1.requireModulePermission)('users', 'view'), async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;
        const currentUserRole = normalizeUserRole(currentUser.role);
        const user = await (0, db_1.queryOne)(`SELECT id, email, display_name, role, permissions, status, created_at, photo_url,
              subscription_plan_id, max_stores, subscription_start_date, subscription_end_date, auto_renewal, subscription_status
       FROM Users WHERE id = @id`, { id });
        if (!user) {
            res.status(404).json({ error: 'Không tìm thấy người dùng' });
            return;
        }
        if (currentUserRole !== 'owner' && !canManageRole(currentUserRole, normalizeUserRole(user.role))) {
            res.status(403).json({ error: 'Bạn không có quyền xem thông tin người dùng này', errorCode: 'PERM001' });
            return;
        }
        const stores = await (0, db_1.query)(`SELECT s.id as storeId, s.name as storeName, s.slug as storeCode
       FROM UserStores us JOIN Stores s ON us.store_id = s.id WHERE us.user_id = @userId`, { userId: id });
        res.json({
            id: user.id, email: user.email, displayName: user.display_name, role: user.role,
            permissions: user.permissions ? JSON.parse(user.permissions) : null,
            status: user.status, createdAt: user.created_at, photoURL: user.photo_url || undefined,
            subscriptionPlanId: user.subscription_plan_id || undefined,
            maxStores: Number(user.max_stores || 1),
            subscriptionStartDate: user.subscription_start_date || undefined,
            subscriptionEndDate: user.subscription_end_date || undefined,
            autoRenewal: Boolean(user.auto_renewal),
            subscriptionStatus: user.subscription_status || undefined,
            stores: stores.map((s) => ({
                storeId: s.storeId, storeName: s.storeName, storeCode: s.storeCode,
            })),
        });
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Không thể lấy thông tin người dùng' });
    }
});
/**
 * PUT /api/users/:id - Update user
 * Requirements: 4.1, 4.2, 4.4, 4.5
 */
router.put('/:id', (0, permission_1.requireModulePermission)('users', 'edit'), async (req, res) => {
    try {
        const { id } = req.params;
        const { displayName, role, status, storeIds, permissions, password, photoURL, subscriptionPlanId, subscriptionMonths, autoRenewal } = req.body;
        const currentUser = req.user;
        const currentUserRole = normalizeUserRole(currentUser.role);
        const currentStoreId = req.headers['x-store-id'];
        console.log('[PUT /api/users/:id] Request body:', JSON.stringify({ displayName, role, status, storeIds, permissions: permissions ? 'provided' : 'undefined', password: password ? 'provided' : 'undefined', photoURL: photoURL ? 'provided' : 'undefined' }));
        console.log('[PUT /api/users/:id] Current user:', currentUser.email, 'Role:', currentUserRole);
        const user = await (0, db_1.queryOne)(`SELECT id, email, display_name, role, permissions, status,
              subscription_plan_id, max_stores, subscription_start_date, subscription_end_date, auto_renewal, subscription_status
       FROM Users WHERE id = @id`, { id });
        if (!user) {
            res.status(404).json({ error: 'Không tìm thấy người dùng' });
            return;
        }
        const isEditingSelf = id === currentUser.id;
        const targetUserRole = normalizeUserRole(user.role);
        // Check role hierarchy - Requirements: 4.1, 4.2
        // Owner can edit other owners, users can edit themselves (limited fields)
        // Other roles can only edit users below their hierarchy
        const canEdit = currentUserRole === 'owner' ||
            isEditingSelf ||
            canManageRole(currentUserRole, targetUserRole);
        if (!canEdit) {
            res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa người dùng này', errorCode: 'PERM001' });
            return;
        }
        // Non-owner editing self can only change displayName, password, and photoURL
        if (isEditingSelf && currentUserRole !== 'owner') {
            if (role || status || storeIds || permissions || subscriptionPlanId !== undefined || subscriptionMonths !== undefined || autoRenewal !== undefined) {
                res.status(403).json({ error: 'Bạn chỉ có thể thay đổi tên hiển thị, mật khẩu và ảnh đại diện của mình', errorCode: 'PERM001' });
                return;
            }
        }
        const normalizedTargetRole = role ? normalizeUserRole(role) : targetUserRole;
        if (role && normalizeUserRole(role) !== targetUserRole && !canManageRole(currentUserRole, normalizeUserRole(role))) {
            res.status(403).json({ error: 'Bạn không có quyền gán role này', errorCode: 'PERM001' });
            return;
        }
        const oldValues = {
            displayName: user.display_name, role: user.role, status: user.status,
            permissions: user.permissions ? JSON.parse(user.permissions) : null,
            subscriptionPlanId: user.subscription_plan_id,
            subscriptionEndDate: user.subscription_end_date,
            autoRenewal: user.auto_renewal,
        };
        const roleChanged = role && role !== user.role;
        const permissionsChanged = permissions !== undefined;
        const statusChanged = status && status !== user.status;
        let updateFields = `display_name = COALESCE(@displayName, display_name), role = COALESCE(@role, role),
      status = COALESCE(@status, status), updated_at = GETDATE()`;
        const params = { id, displayName, role, status };
        const shouldUpdateSubscription = subscriptionPlanId !== undefined ||
            subscriptionMonths !== undefined ||
            autoRenewal !== undefined;
        let subscriptionUpdateLog = null;
        if (shouldUpdateSubscription) {
            const fallbackPlans = {
                basic: { maxStores: 1 },
                pro: { maxStores: 5 },
                enterprise: { maxStores: 999 },
            };
            const requestedPlanId = typeof subscriptionPlanId === 'string' ? subscriptionPlanId.trim() : '';
            const finalPlanId = requestedPlanId || user.subscription_plan_id || '';
            if (requestedPlanId && user.subscription_plan_id && requestedPlanId !== user.subscription_plan_id) {
                const [currentPriority, requestedPriority] = await Promise.all([
                    getPlanPriority(user.subscription_plan_id),
                    getPlanPriority(requestedPlanId),
                ]);
                if (requestedPriority > 0 && currentPriority > 0 && requestedPriority < currentPriority) {
                    res.status(400).json({
                        error: 'Không thể cấp gói thấp hơn gói hiện tại của người dùng',
                    });
                    return;
                }
            }
            if (!finalPlanId) {
                updateFields += `,
          subscription_plan_id = NULL,
          max_stores = 1,
          subscription_start_date = NULL,
          subscription_end_date = NULL,
          auto_renewal = 0,
          subscription_status = 'inactive'`;
            }
            else {
                const months = Number(subscriptionMonths) > 0 ? Math.min(Number(subscriptionMonths), 24) : 1;
                const startDate = new Date();
                const endDate = new Date(startDate);
                endDate.setMonth(endDate.getMonth() + months);
                let maxStores = 1;
                let planPrice = 0;
                try {
                    const planFromDb = await (0, db_1.queryOne)(`SELECT max_stores, price FROM SubscriptionPlans WHERE id = @planId`, { planId: finalPlanId });
                    maxStores = Number(planFromDb?.max_stores || fallbackPlans[finalPlanId]?.maxStores || 1);
                    planPrice = Number(planFromDb?.price || 0);
                }
                catch (planLookupError) {
                    maxStores = Number(fallbackPlans[finalPlanId]?.maxStores || 1);
                    const fallbackPrices = {
                        basic: 199000,
                        pro: 499000,
                        enterprise: 1999000,
                    };
                    planPrice = Number(fallbackPrices[finalPlanId] || 0);
                    console.warn('Subscription plan lookup failed, using fallback max stores:', planLookupError);
                }
                updateFields += `,
          subscription_plan_id = @subscriptionPlanId,
          max_stores = @maxStores,
          subscription_start_date = @subscriptionStartDate,
          subscription_end_date = @subscriptionEndDate,
          auto_renewal = @autoRenewal,
          subscription_status = 'active'`;
                params.subscriptionPlanId = finalPlanId;
                params.maxStores = maxStores;
                params.subscriptionStartDate = startDate;
                params.subscriptionEndDate = endDate;
                params.autoRenewal = autoRenewal === undefined ? Number(Boolean(user.auto_renewal)) : Number(Boolean(autoRenewal));
                subscriptionUpdateLog = {
                    planId: finalPlanId,
                    maxStores,
                    amount: planPrice,
                    startDate,
                    endDate,
                    autoRenewal: Number(params.autoRenewal),
                };
            }
        }
        if (permissions !== undefined) {
            // Save permissions as-is (empty object {} means user explicitly cleared all permissions)
            // null means never set (use default role permissions)
            updateFields += `, permissions = @permissions`;
            params.permissions = JSON.stringify(permissions);
            console.log('[PUT /api/users/:id] Updating permissions:', JSON.stringify(permissions));
        }
        if (password) {
            const passwordHash = await bcryptjs_1.default.hash(password, 10);
            updateFields += `, password_hash = @passwordHash`;
            params.passwordHash = passwordHash;
        }
        if (photoURL !== undefined) {
            updateFields += `, photo_url = @photoURL`;
            params.photoURL = photoURL;
            console.log('[PUT /api/users/:id] Updating photo URL');
        }
        await (0, db_1.query)(`UPDATE Users SET ${updateFields} WHERE id = @id`, params);
        if (storeIds !== undefined && Array.isArray(storeIds)) {
            await (0, db_1.query)('DELETE FROM UserStores WHERE user_id = @id', { id });
            for (const storeId of storeIds) {
                await (0, db_1.query)(`INSERT INTO UserStores (id, user_id, store_id)
           VALUES (NEWID(), @userId, @storeId)`, { userId: id, storeId });
            }
        }
        if (subscriptionUpdateLog) {
            try {
                await (0, db_1.query)(`INSERT INTO SubscriptionHistory
             (id, user_id, plan_id, max_stores, amount, payment_method, start_date, end_date, status, auto_renewal, created_at)
           VALUES
             (NEWID(), @userId, @planId, @maxStores, @amount, 'admin_assign', @startDate, @endDate, 'active', @autoRenewal, GETDATE())`, {
                    userId: id,
                    planId: subscriptionUpdateLog.planId,
                    maxStores: subscriptionUpdateLog.maxStores,
                    amount: subscriptionUpdateLog.amount,
                    startDate: subscriptionUpdateLog.startDate,
                    endDate: subscriptionUpdateLog.endDate,
                    autoRenewal: subscriptionUpdateLog.autoRenewal,
                });
                await ensureSubscriptionTransactionAuditColumns();
                const assignedByName = buildUserDisplayName(currentUser.displayName, currentUser.email, currentUser.id);
                const assignedByEmail = String(currentUser.email || '').trim() || null;
                const assignedToName = buildUserDisplayName(typeof displayName === 'string' ? displayName : user.display_name, user.email, id);
                const assignedToEmail = String(user.email || '').trim() || null;
                const metadata = JSON.stringify({
                    source: 'admin_assign',
                    assignedBy: {
                        id: currentUser.id,
                        fullName: assignedByName,
                        email: assignedByEmail || '',
                        role: currentUser.role,
                    },
                    assignedTo: {
                        id,
                        fullName: assignedToName,
                        email: assignedToEmail || '',
                        role: normalizedTargetRole,
                    },
                    action: 'update_user',
                });
                await (0, db_1.query)(`IF EXISTS (SELECT * FROM sysobjects WHERE name='SubscriptionTransactions' AND xtype='U')
           BEGIN
             INSERT INTO SubscriptionTransactions
               (id, user_id, transaction_type, plan_id, max_stores, amount, currency, payment_method, payment_status,
                start_date, end_date, auto_renewal, processed_by, processed_by_role,
                processed_by_name, processed_by_email, user_name_snapshot, user_email_snapshot,
                notes, metadata, created_at, updated_at)
             VALUES
               (NEWID(), @userId, 'manual_purchase', @planId, @maxStores, @amount, 'VND', 'admin_assign', 'completed',
                @startDate, @endDate, @autoRenewal, @processedBy, @processedByRole,
                @processedByName, @processedByEmail, @userNameSnapshot, @userEmailSnapshot,
                @notes, @metadata, GETDATE(), GETDATE())
           END`, {
                    userId: id,
                    planId: subscriptionUpdateLog.planId,
                    maxStores: subscriptionUpdateLog.maxStores,
                    amount: subscriptionUpdateLog.amount,
                    startDate: subscriptionUpdateLog.startDate,
                    endDate: subscriptionUpdateLog.endDate,
                    autoRenewal: subscriptionUpdateLog.autoRenewal,
                    processedBy: currentUser.id,
                    processedByRole: currentUser.role,
                    processedByName: assignedByName,
                    processedByEmail: assignedByEmail,
                    userNameSnapshot: assignedToName,
                    userEmailSnapshot: assignedToEmail,
                    notes: `Cấp gói khi cập nhật tài khoản (${normalizedTargetRole})`,
                    metadata,
                });
            }
            catch (subscriptionLogError) {
                console.error('Subscription update history log error (non-blocking):', subscriptionLogError);
            }
        }
        if (roleChanged || permissionsChanged || storeIds !== undefined) {
            (0, permission_service_1.invalidateUserPermissionCache)(id);
        }
        // Deactivate user - Requirements: 4.4
        if (statusChanged && status === 'inactive') {
            await (0, db_1.query)('DELETE FROM Sessions WHERE user_id = @userId', { userId: id });
            (0, permission_service_1.invalidateUserPermissionCache)(id);
        }
        // Audit log - Requirements: 4.5
        const newValues = {};
        if (displayName !== undefined)
            newValues.displayName = displayName;
        if (role !== undefined)
            newValues.role = role;
        if (status !== undefined)
            newValues.status = status;
        if (permissions !== undefined)
            newValues.permissions = permissions;
        if (storeIds !== undefined)
            newValues.storeIds = storeIds;
        if (subscriptionPlanId !== undefined)
            newValues.subscriptionPlanId = subscriptionPlanId;
        if (subscriptionMonths !== undefined)
            newValues.subscriptionMonths = subscriptionMonths;
        if (autoRenewal !== undefined)
            newValues.autoRenewal = autoRenewal;
        if (password)
            newValues.passwordChanged = true;
        try {
            await audit_log_repository_1.auditLogRepository.create({
                storeId: currentStoreId || 'system',
                userId: currentUser.id,
                action: 'UPDATE',
                entityType: 'User',
                entityId: id,
                oldValues,
                newValues,
                ipAddress: req.ip || undefined,
                userAgent: req.headers['user-agent'],
            });
        }
        catch (auditError) {
            console.error('Audit log error (non-blocking):', auditError);
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Update user error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: `Không thể cập nhật người dùng: ${errorMessage}` });
    }
});
/**
 * POST /api/users/:id/reset-password - Reset user password
 * Requirements: 4.1, 4.2, 4.5
 * Admin can reset password for users they can manage
 */
router.post('/:id/reset-password', (0, permission_1.requireModulePermission)('users', 'edit'), async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;
        const currentUserRole = currentUser.role;
        const currentStoreId = req.headers['x-store-id'];
        console.log('[RESET PASSWORD] Request:', { userId: id, currentUser: currentUser.email, currentUserRole });
        // Cannot reset own password through this endpoint
        if (id === currentUser.id) {
            console.log('[RESET PASSWORD] Error: Cannot reset own password');
            return res.status(400).json({ error: 'Không thể đặt lại mật khẩu của chính mình qua chức năng này' });
        }
        // Get target user
        console.log('[RESET PASSWORD] Fetching user:', id);
        const user = await (0, db_1.queryOne)(`SELECT id, email, display_name, role, status FROM Users WHERE id = @id`, { id });
        if (!user) {
            console.log('[RESET PASSWORD] Error: User not found');
            return res.status(404).json({ error: 'Không tìm thấy người dùng' });
        }
        console.log('[RESET PASSWORD] User found:', { email: user.email, role: user.role });
        // Check if current user can manage target user's role
        const targetRole = user.role;
        if (!canManageRole(currentUserRole, targetRole)) {
            console.log('[RESET PASSWORD] Error: Cannot manage role', { currentUserRole, targetRole });
            return res.status(403).json({ error: 'Bạn không có quyền đặt lại mật khẩu cho người dùng này' });
        }
        // Generate a temporary password (user should change it after first login)
        const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();
        const hashedPassword = await bcryptjs_1.default.hash(tempPassword, 10);
        console.log('[RESET PASSWORD] Updating password for user:', user.email);
        // Update password
        await (0, db_1.query)(`UPDATE Users SET password_hash = @passwordHash, updated_at = GETDATE() WHERE id = @id`, { id, passwordHash: hashedPassword });
        console.log('[RESET PASSWORD] Password updated successfully');
        // Delete all sessions for this user (force re-login with new password)
        await (0, db_1.query)('DELETE FROM Sessions WHERE user_id = @userId', { userId: id });
        console.log('[RESET PASSWORD] All sessions deleted for user');
        // Invalidate user's permission cache
        try {
            (0, permission_service_1.invalidateUserPermissionCache)(id);
        }
        catch (cacheError) {
            console.error('[RESET PASSWORD] Cache invalidation error (non-blocking):', cacheError);
        }
        // Log audit - temporarily disabled for debugging
        /*
        try {
          await auditLogRepository.create({
            tenantId: currentUser.tenantId || null,
            storeId: currentStoreId || 'system',
            userId: currentUser.id,
            action: 'reset_password',
            entityType: 'User',
            entityId: id,
            newValues: { resetBy: currentUser.email },
            ipAddress: (req.ip as string) || undefined,
            userAgent: req.headers['user-agent'],
          });
        } catch (auditError) {
          console.error('[RESET PASSWORD] Audit log error (non-blocking):', auditError);
        }
        */
        // In production, you would send an email with the temporary password
        // For now, return it in the response (NOT RECOMMENDED for production)
        console.log(`[RESET PASSWORD] Success - User: ${user.email}, Temp Password: ${tempPassword}`);
        res.json({
            success: true,
            message: 'Mật khẩu đã được đặt lại thành công. Người dùng cần đăng nhập lại với mật khẩu mới.',
            // TODO: Remove this in production - send via email instead
            tempPassword: tempPassword,
            note: 'Mật khẩu tạm thời đã được tạo. Vui lòng gửi mật khẩu này cho người dùng. Họ sẽ cần đăng nhập lại và nên đổi mật khẩu ngay sau đó.'
        });
    }
    catch (error) {
        console.error('[RESET PASSWORD] Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : '';
        console.error('[RESET PASSWORD] Stack:', errorStack);
        res.status(500).json({ error: `Không thể đặt lại mật khẩu: ${errorMessage}` });
    }
});
/**
 * POST /api/users/change-password - Change own password
 * User can change their own password
 */
router.post('/change-password', auth_1.authenticate, async (req, res) => {
    try {
        const currentUser = req.user;
        const { currentPassword, newPassword } = req.body;
        console.log('[CHANGE PASSWORD] Request from user:', currentUser.email);
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
        }
        // Get user with password hash
        const user = await (0, db_1.queryOne)(`SELECT id, email, password_hash FROM Users WHERE id = @id`, { id: currentUser.id });
        if (!user) {
            return res.status(404).json({ error: 'Không tìm thấy người dùng' });
        }
        // Verify current password
        const isValidPassword = await bcryptjs_1.default.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
            console.log('[CHANGE PASSWORD] Invalid current password');
            return res.status(401).json({ error: 'Mật khẩu hiện tại không đúng' });
        }
        // Hash new password
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        // Update password
        await (0, db_1.query)(`UPDATE Users SET password_hash = @passwordHash, updated_at = GETDATE() WHERE id = @id`, { id: currentUser.id, passwordHash: hashedPassword });
        console.log('[CHANGE PASSWORD] Password updated successfully for:', user.email);
        // Invalidate user's permission cache
        try {
            (0, permission_service_1.invalidateUserPermissionCache)(currentUser.id);
        }
        catch (cacheError) {
            console.error('[CHANGE PASSWORD] Cache invalidation error (non-blocking):', cacheError);
        }
        res.json({
            success: true,
            message: 'Mật khẩu đã được thay đổi thành công'
        });
    }
    catch (error) {
        console.error('[CHANGE PASSWORD] Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: `Không thể đổi mật khẩu: ${errorMessage}` });
    }
});
/**
 * DELETE /api/users/:id - Delete user permanently
 * Requirements: 4.1, 4.2, 4.4, 4.5
 */
router.delete('/:id', (0, permission_1.requireModulePermission)('users', 'delete'), async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;
        const currentUserRole = normalizeUserRole(currentUser.role);
        const currentStoreId = req.headers['x-store-id'];
        console.log('[DELETE USER] Request received:', {
            targetUserId: id,
            currentUserId: currentUser.id,
            currentUserRole,
            currentStoreId
        });
        if (id === currentUser.id) {
            console.log('[DELETE USER] Error: Cannot delete self');
            res.status(400).json({ error: 'Không thể xóa tài khoản của chính mình' });
            return;
        }
        const user = await (0, db_1.queryOne)('SELECT id, email, display_name, role, status FROM Users WHERE id = @id', { id });
        if (!user) {
            console.log('[DELETE USER] Error: User not found');
            res.status(404).json({ error: 'Không tìm thấy người dùng' });
            return;
        }
        console.log('[DELETE USER] Target user found:', {
            id: user.id,
            email: user.email,
            role: user.role,
            status: user.status
        });
        // Check role hierarchy - Requirements: 4.1, 4.2
        const targetUserRole = normalizeUserRole(user.role);
        const canManage = canManageRole(currentUserRole, targetUserRole);
        console.log('[DELETE USER] Role hierarchy check:', {
            currentUserRole,
            targetUserRole,
            canManage
        });
        if (!canManage) {
            console.log('[DELETE USER] Error: Cannot manage role');
            res.status(403).json({ error: 'Bạn không có quyền xóa người dùng này', errorCode: 'PERM001' });
            return;
        }
        // Prevent deleting owner of stores
        const storesTableExists = await (0, db_1.queryOne)(`SELECT CASE WHEN OBJECT_ID('Stores', 'U') IS NOT NULL THEN 1 ELSE 0 END AS hasTable`);
        let ownedStoresResult = { count: 0 };
        if ((storesTableExists?.hasTable || 0) === 1) {
            const hasSnakeOwnerId = await (0, db_1.queryOne)(`SELECT CASE WHEN COL_LENGTH('Stores', 'owner_id') IS NOT NULL THEN 1 ELSE 0 END AS hasColumn`);
            if ((hasSnakeOwnerId?.hasColumn || 0) === 1) {
                ownedStoresResult = await (0, db_1.queryOne)(`SELECT COUNT(*) AS count FROM Stores WHERE owner_id = @userId`, { userId: id });
            }
            else {
                const hasPascalOwnerId = await (0, db_1.queryOne)(`SELECT CASE WHEN COL_LENGTH('Stores', 'OwnerId') IS NOT NULL THEN 1 ELSE 0 END AS hasColumn`);
                if ((hasPascalOwnerId?.hasColumn || 0) === 1) {
                    ownedStoresResult = await (0, db_1.queryOne)(`SELECT COUNT(*) AS count FROM Stores WHERE OwnerId = @userId`, { userId: id });
                }
            }
        }
        if ((ownedStoresResult?.count || 0) > 0) {
            res.status(400).json({
                error: 'Người dùng đang là chủ cửa hàng. Vui lòng chuyển quyền sở hữu trước khi xóa.',
            });
            return;
        }
        // Prevent deleting users tied to core business history
        let shiftCountResult = { count: 0 };
        const shiftsTableExists = await (0, db_1.queryOne)(`SELECT CASE WHEN OBJECT_ID('Shifts', 'U') IS NOT NULL THEN 1 ELSE 0 END AS hasTable`);
        if ((shiftsTableExists?.hasTable || 0) === 1) {
            const shiftsHasSnakeUserId = await (0, db_1.queryOne)(`SELECT CASE WHEN COL_LENGTH('Shifts', 'user_id') IS NOT NULL THEN 1 ELSE 0 END AS hasColumn`);
            if ((shiftsHasSnakeUserId?.hasColumn || 0) === 1) {
                shiftCountResult = await (0, db_1.queryOne)(`SELECT COUNT(*) AS count FROM Shifts WHERE user_id = @userId`, { userId: id });
            }
            else {
                const shiftsHasPascalUserId = await (0, db_1.queryOne)(`SELECT CASE WHEN COL_LENGTH('Shifts', 'UserId') IS NOT NULL THEN 1 ELSE 0 END AS hasColumn`);
                if ((shiftsHasPascalUserId?.hasColumn || 0) === 1) {
                    shiftCountResult = await (0, db_1.queryOne)(`SELECT COUNT(*) AS count FROM Shifts WHERE UserId = @userId`, { userId: id });
                }
            }
        }
        if ((shiftCountResult?.count || 0) > 0) {
            res.status(400).json({
                error: 'Người dùng đã có lịch sử ca làm việc. Không thể xóa vĩnh viễn.',
            });
            return;
        }
        let salesCountResult = { count: 0 };
        const salesTableExists = await (0, db_1.queryOne)(`SELECT CASE WHEN OBJECT_ID('Sales', 'U') IS NOT NULL THEN 1 ELSE 0 END AS hasTable`);
        if ((salesTableExists?.hasTable || 0) === 1) {
            const salesHasSnakeCreatedBy = await (0, db_1.queryOne)(`SELECT CASE WHEN COL_LENGTH('Sales', 'created_by') IS NOT NULL THEN 1 ELSE 0 END AS hasColumn`);
            if ((salesHasSnakeCreatedBy?.hasColumn || 0) === 1) {
                salesCountResult = await (0, db_1.queryOne)(`SELECT COUNT(*) AS count FROM Sales WHERE created_by = @userId`, { userId: id });
            }
            else {
                const salesHasPascalCreatedBy = await (0, db_1.queryOne)(`SELECT CASE WHEN COL_LENGTH('Sales', 'CreatedBy') IS NOT NULL THEN 1 ELSE 0 END AS hasColumn`);
                if ((salesHasPascalCreatedBy?.hasColumn || 0) === 1) {
                    salesCountResult = await (0, db_1.queryOne)(`SELECT COUNT(*) AS count FROM Sales WHERE CreatedBy = @userId`, { userId: id });
                }
            }
        }
        if ((salesCountResult?.count || 0) > 0) {
            res.status(400).json({
                error: 'Người dùng đã có lịch sử đơn bán hàng. Không thể xóa vĩnh viễn.',
            });
            return;
        }
        console.log('[DELETE USER] Performing hard delete...');
        // Clean up child records first to satisfy foreign keys across schema variants.
        const sessionsTableExists = await (0, db_1.queryOne)(`SELECT CASE WHEN OBJECT_ID('Sessions', 'U') IS NOT NULL THEN 1 ELSE 0 END AS hasTable`);
        if ((sessionsTableExists?.hasTable || 0) === 1) {
            const sessionsHasSnakeUserId = await (0, db_1.queryOne)(`SELECT CASE WHEN COL_LENGTH('Sessions', 'user_id') IS NOT NULL THEN 1 ELSE 0 END AS hasColumn`);
            if ((sessionsHasSnakeUserId?.hasColumn || 0) === 1) {
                await (0, db_1.query)(`DELETE FROM Sessions WHERE user_id = @userId`, { userId: id });
            }
            else {
                const sessionsHasPascalUserId = await (0, db_1.queryOne)(`SELECT CASE WHEN COL_LENGTH('Sessions', 'UserId') IS NOT NULL THEN 1 ELSE 0 END AS hasColumn`);
                if ((sessionsHasPascalUserId?.hasColumn || 0) === 1) {
                    await (0, db_1.query)(`DELETE FROM Sessions WHERE UserId = @userId`, { userId: id });
                }
            }
        }
        const userStoresTableExists = await (0, db_1.queryOne)(`SELECT CASE WHEN OBJECT_ID('UserStores', 'U') IS NOT NULL THEN 1 ELSE 0 END AS hasTable`);
        if ((userStoresTableExists?.hasTable || 0) === 1) {
            const userStoresHasSnakeUserId = await (0, db_1.queryOne)(`SELECT CASE WHEN COL_LENGTH('UserStores', 'user_id') IS NOT NULL THEN 1 ELSE 0 END AS hasColumn`);
            if ((userStoresHasSnakeUserId?.hasColumn || 0) === 1) {
                await (0, db_1.query)(`DELETE FROM UserStores WHERE user_id = @userId`, { userId: id });
            }
            else {
                const userStoresHasPascalUserId = await (0, db_1.queryOne)(`SELECT CASE WHEN COL_LENGTH('UserStores', 'UserId') IS NOT NULL THEN 1 ELSE 0 END AS hasColumn`);
                if ((userStoresHasPascalUserId?.hasColumn || 0) === 1) {
                    await (0, db_1.query)(`DELETE FROM UserStores WHERE UserId = @userId`, { userId: id });
                }
            }
        }
        const permissionsTableExists = await (0, db_1.queryOne)(`SELECT CASE WHEN OBJECT_ID('Permissions', 'U') IS NOT NULL THEN 1 ELSE 0 END AS hasTable`);
        if ((permissionsTableExists?.hasTable || 0) === 1) {
            const permissionsHasSnakeUserId = await (0, db_1.queryOne)(`SELECT CASE WHEN COL_LENGTH('Permissions', 'user_id') IS NOT NULL THEN 1 ELSE 0 END AS hasColumn`);
            if ((permissionsHasSnakeUserId?.hasColumn || 0) === 1) {
                await (0, db_1.query)(`DELETE FROM Permissions WHERE user_id = @userId`, { userId: id });
            }
            else {
                const permissionsHasPascalUserId = await (0, db_1.queryOne)(`SELECT CASE WHEN COL_LENGTH('Permissions', 'UserId') IS NOT NULL THEN 1 ELSE 0 END AS hasColumn`);
                if ((permissionsHasPascalUserId?.hasColumn || 0) === 1) {
                    await (0, db_1.query)(`DELETE FROM Permissions WHERE UserId = @userId`, { userId: id });
                }
            }
        }
        const deletedUserNameSnapshot = buildUserDisplayName(user.display_name, user.email, id);
        const deletedUserEmailSnapshot = String(user.email || '').trim() || null;
        await ensureSubscriptionTransactionAuditColumns();
        await (0, db_1.query)(`IF OBJECT_ID('SubscriptionTransactions', 'U') IS NOT NULL
       BEGIN
         UPDATE st
         SET
           processed_by_name = CASE
             WHEN st.processed_by = @userId
               THEN COALESCE(NULLIF(st.processed_by_name, ''), @snapshotName)
             ELSE st.processed_by_name
           END,
           processed_by_email = CASE
             WHEN st.processed_by = @userId
               THEN COALESCE(NULLIF(st.processed_by_email, ''), @snapshotEmail)
             ELSE st.processed_by_email
           END,
           user_name_snapshot = CASE
             WHEN st.user_id = @userId
               THEN COALESCE(NULLIF(st.user_name_snapshot, ''), @snapshotName)
             ELSE st.user_name_snapshot
           END,
           user_email_snapshot = CASE
             WHEN st.user_id = @userId
               THEN COALESCE(NULLIF(st.user_email_snapshot, ''), @snapshotEmail)
             ELSE st.user_email_snapshot
           END
         FROM SubscriptionTransactions st
         WHERE st.processed_by = @userId OR st.user_id = @userId;
       END`, {
            userId: id,
            snapshotName: deletedUserNameSnapshot,
            snapshotEmail: deletedUserEmailSnapshot,
        });
        await dropSubscriptionUserForeignKeysForHistoryRetention();
        await (0, db_1.query)('DELETE FROM Users WHERE id = @id', { id });
        (0, permission_service_1.invalidateUserPermissionCache)(id);
        // Audit log - Requirements: 4.5
        try {
            await audit_log_repository_1.auditLogRepository.create({
                storeId: currentStoreId || 'system',
                userId: currentUser.id,
                action: 'DELETE',
                entityType: 'User',
                entityId: id,
                oldValues: { email: user.email, displayName: user.display_name, role: user.role, status: user.status },
                newValues: { deleted: true },
                ipAddress: req.ip || undefined,
                userAgent: req.headers['user-agent'],
            });
        }
        catch (auditError) {
            console.error('Audit log error (non-blocking):', auditError);
        }
        console.log('[DELETE USER] Success');
        res.json({ success: true, hardDeleted: true });
    }
    catch (error) {
        console.error('Delete user error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: `Không thể xóa người dùng: ${errorMessage}` });
    }
});
/**
 * POST /api/users/:id/stores - Assign stores to user
 * Requirements: 3.4, 3.5
 */
router.post('/:id/stores', (0, permission_1.requireModulePermission)('users', 'edit'), async (req, res) => {
    try {
        const { id } = req.params;
        const { storeIds, roleOverride, permissionsOverride } = req.body;
        const currentUser = req.user;
        const currentUserRole = currentUser.role;
        const currentStoreId = req.headers['x-store-id'];
        if (!storeIds || !Array.isArray(storeIds)) {
            res.status(400).json({ error: 'storeIds là bắt buộc và phải là mảng' });
            return;
        }
        // Get target user
        const user = await (0, db_1.queryOne)('SELECT id, role, email FROM Users WHERE id = @id', { id });
        if (!user) {
            res.status(404).json({ error: 'Không tìm thấy người dùng' });
            return;
        }
        const targetUserRole = user.role;
        // Check role hierarchy - Owner can manage other owners
        const canManage = currentUserRole === 'owner' || canManageRole(currentUserRole, targetUserRole);
        if (!canManage) {
            res.status(403).json({ error: 'Bạn không có quyền quản lý người dùng này', errorCode: 'PERM001' });
            return;
        }
        // Store Manager can only assign their own stores
        if (currentUserRole === 'store_manager') {
            for (const storeId of storeIds) {
                if (!currentUser.stores?.includes(storeId)) {
                    res.status(403).json({ error: 'Bạn không có quyền gán cửa hàng này', errorCode: 'PERM002' });
                    return;
                }
            }
        }
        // Get old stores for audit log
        const oldStores = await (0, db_1.query)('SELECT store_id FROM UserStores WHERE user_id = @userId', { userId: id });
        // Delete all existing store assignments and re-add selected ones
        await (0, db_1.query)('DELETE FROM UserStores WHERE user_id = @userId', { userId: id });
        const assignedStores = [];
        for (const storeId of storeIds) {
            // Check if store exists
            const store = await (0, db_1.queryOne)('SELECT id FROM Stores WHERE id = @id', { id: storeId });
            if (!store)
                continue;
            // Create new assignment
            await (0, db_1.query)(`INSERT INTO UserStores (id, user_id, store_id)
         VALUES (NEWID(), @userId, @storeId)`, { userId: id, storeId });
            assignedStores.push(storeId);
        }
        // Invalidate permission cache
        (0, permission_service_1.invalidateUserPermissionCache)(id);
        // Audit log
        try {
            await audit_log_repository_1.auditLogRepository.create({
                storeId: currentStoreId || assignedStores[0] || 'system',
                userId: currentUser.id,
                action: 'UPDATE',
                entityType: 'UserStores',
                entityId: id,
                oldValues: { stores: oldStores.map((s) => s.store_id) },
                newValues: { assignedStores, roleOverride, permissionsOverride },
                ipAddress: req.ip || undefined,
                userAgent: req.headers['user-agent'],
            });
        }
        catch (auditError) {
            console.error('Audit log error (non-blocking):', auditError);
        }
        res.json({ success: true, assignedStores });
    }
    catch (error) {
        console.error('Assign stores error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: `Không thể gán cửa hàng cho người dùng: ${errorMessage}` });
    }
});
/**
 * GET /api/users/:id/stores - Get stores assigned to user
 * Requirements: 3.4, 3.5
 */
router.get('/:id/stores', (0, permission_1.requireModulePermission)('users', 'view'), async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;
        const currentUserRole = currentUser.role;
        // Get target user
        const user = await (0, db_1.queryOne)('SELECT id, role FROM Users WHERE id = @id', { id });
        if (!user) {
            res.status(404).json({ error: 'Không tìm thấy người dùng' });
            return;
        }
        // Check role hierarchy (allow viewing own stores)
        if (id !== currentUser.id && currentUserRole !== 'owner' && !canManageRole(currentUserRole, user.role)) {
            res.status(403).json({ error: 'Bạn không có quyền xem thông tin người dùng này', errorCode: 'PERM001' });
            return;
        }
        const stores = await (0, db_1.query)(`SELECT s.id as storeId, s.name as storeName, s.slug as storeCode, s.address,
              us.created_at as assignedAt
       FROM UserStores us
       JOIN Stores s ON us.store_id = s.id
       WHERE us.user_id = @userId AND s.status = 'active'
       ORDER BY s.name`, { userId: id });
        res.json(stores.map((s) => ({
            storeId: s.storeId,
            storeName: s.storeName,
            storeCode: s.storeCode,
            address: s.address,
            assignedAt: s.assignedAt,
        })));
    }
    catch (error) {
        console.error('Get user stores error:', error);
        res.status(500).json({ error: 'Không thể lấy danh sách cửa hàng của người dùng' });
    }
});
/**
 * DELETE /api/users/:id/stores/:storeId - Remove store access from user
 * Requirements: 3.4, 3.5
 */
router.delete('/:id/stores/:storeId', (0, permission_1.requireModulePermission)('users', 'edit'), async (req, res) => {
    try {
        const { id, storeId } = req.params;
        const currentUser = req.user;
        const currentUserRole = currentUser.role;
        const currentStoreIdHeader = req.headers['x-store-id'];
        // Get target user
        const user = await (0, db_1.queryOne)('SELECT id, role, email FROM Users WHERE id = @id', { id });
        if (!user) {
            res.status(404).json({ error: 'Không tìm thấy người dùng' });
            return;
        }
        // Check role hierarchy
        if (!canManageRole(currentUserRole, user.role)) {
            res.status(403).json({ error: 'Bạn không có quyền quản lý người dùng này', errorCode: 'PERM001' });
            return;
        }
        // Store Manager can only remove access to their own stores
        if (currentUserRole === 'store_manager' && !currentUser.stores?.includes(storeId)) {
            res.status(403).json({ error: 'Bạn không có quyền quản lý cửa hàng này', errorCode: 'PERM002' });
            return;
        }
        // Check if assignment exists
        const existing = await (0, db_1.queryOne)('SELECT id FROM UserStores WHERE user_id = @userId AND store_id = @storeId', { userId: id, storeId });
        if (!existing) {
            res.status(404).json({ error: 'Người dùng không được gán cho cửa hàng này' });
            return;
        }
        // Delete assignment
        await (0, db_1.query)('DELETE FROM UserStores WHERE user_id = @userId AND store_id = @storeId', { userId: id, storeId });
        // Invalidate permission cache
        (0, permission_service_1.invalidateUserPermissionCache)(id);
        // Audit log
        try {
            await audit_log_repository_1.auditLogRepository.create({
                storeId: currentStoreIdHeader || storeId,
                userId: currentUser.id,
                action: 'DELETE',
                entityType: 'UserStores',
                entityId: id,
                oldValues: { storeId },
                newValues: undefined,
                ipAddress: req.ip || undefined,
                userAgent: req.headers['user-agent'],
            });
        }
        catch (auditError) {
            console.error('Audit log error (non-blocking):', auditError);
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Remove store access error:', error);
        res.status(500).json({ error: 'Không thể xóa quyền truy cập cửa hàng' });
    }
});
/**
 * PUT /api/users/:id/shift-hours - Update max shift hours for user
 * Allows managers to configure maximum working hours per shift for employees
 */
router.put('/:id/shift-hours', (0, permission_1.requireModulePermission)('users', 'edit'), async (req, res) => {
    try {
        const { id } = req.params;
        const { maxShiftHours } = req.body;
        const currentUser = req.user;
        const currentUserRole = currentUser.role;
        const currentStoreId = req.headers['x-store-id'];
        if (maxShiftHours === undefined || maxShiftHours === null) {
            res.status(400).json({ error: 'maxShiftHours là bắt buộc' });
            return;
        }
        if (typeof maxShiftHours !== 'number' || maxShiftHours <= 0 || maxShiftHours > 24) {
            res.status(400).json({ error: 'maxShiftHours phải là số từ 0.1 đến 24' });
            return;
        }
        // Get target user
        const user = await (0, db_1.queryOne)('SELECT id, role, email, max_shift_hours FROM Users WHERE id = @id', { id });
        if (!user) {
            res.status(404).json({ error: 'Không tìm thấy người dùng' });
            return;
        }
        // Check role hierarchy
        if (!canManageRole(currentUserRole, user.role)) {
            res.status(403).json({ error: 'Bạn không có quyền cấu hình người dùng này', errorCode: 'PERM001' });
            return;
        }
        const oldMaxShiftHours = user.max_shift_hours;
        // Update max shift hours
        await (0, db_1.query)('UPDATE Users SET max_shift_hours = @maxShiftHours, updated_at = GETDATE() WHERE id = @id', { id, maxShiftHours });
        // Audit log
        try {
            await audit_log_repository_1.auditLogRepository.create({
                storeId: currentStoreId || 'system',
                userId: currentUser.id,
                action: 'UPDATE',
                entityType: 'User',
                entityId: id,
                oldValues: { maxShiftHours: oldMaxShiftHours },
                newValues: { maxShiftHours },
                ipAddress: req.ip || undefined,
                userAgent: req.headers['user-agent'],
            });
        }
        catch (auditError) {
            console.error('Audit log error (non-blocking):', auditError);
        }
        res.json({
            success: true,
            message: `Đã cập nhật thời gian làm việc tối đa cho ${user.email}: ${maxShiftHours} giờ`,
            maxShiftHours
        });
    }
    catch (error) {
        console.error('Update max shift hours error:', error);
        res.status(500).json({ error: 'Không thể cập nhật thời gian làm việc' });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map