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
/**
 * GET /api/users/roles/assignable - Get roles that current user can assign
 */
router.get('/roles/assignable', async (req, res) => {
    try {
        const currentUser = req.user;
        const currentUserRole = currentUser.role;
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
        const { email, password, displayName, role, status, storeIds } = req.body;
        const currentUser = req.user;
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
        if (!canManageRole(currentUser.role, targetRole)) {
            res.status(403).json({ error: 'Bạn không có quyền tạo người dùng với role này', errorCode: 'PERM001' });
            return;
        }
        // Store Manager can only create Salesperson - Requirements: 4.2
        if (currentUser.role === 'store_manager' && targetRole !== 'salesperson') {
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
        const result = await (0, db_1.query)(`INSERT INTO Users (id, email, password_hash, display_name, role, status, failed_login_attempts, created_at, updated_at)
       OUTPUT INSERTED.*
       VALUES (NEWID(), @email, @passwordHash, @displayName, @role, @status, 0, GETDATE(), GETDATE())`, { email, passwordHash, displayName: displayName || email.split('@')[0], role: targetRole, status: status || 'active' });
        const newUser = result[0];
        const assignedStoreIds = [];
        if (storeIds && Array.isArray(storeIds) && storeIds.length > 0) {
            if (targetRole === 'store_manager' || targetRole === 'salesperson') {
                for (const storeId of storeIds) {
                    if (currentUser.role === 'store_manager') {
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
        const currentUserRole = currentUser.role;
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
        const users = await (0, db_1.query)(`SELECT id, email, display_name, role, permissions, status, created_at FROM Users WHERE ${whereClause} ORDER BY created_at DESC`);
        const usersWithStores = await Promise.all(users.map(async (u) => {
            // Query without role_override column (may not exist in legacy databases)
            const stores = await (0, db_1.query)(`SELECT s.id as storeId, s.name as storeName, s.slug as storeCode
           FROM UserStores us JOIN Stores s ON us.store_id = s.id WHERE us.user_id = @userId`, { userId: u.id });
            return {
                id: u.id, email: u.email, displayName: u.display_name, role: u.role,
                permissions: u.permissions ? JSON.parse(u.permissions) : undefined,
                status: u.status, createdAt: u.created_at,
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
        const currentUserRole = currentUser.role;
        const user = await (0, db_1.queryOne)('SELECT id, email, display_name, role, permissions, status, created_at FROM Users WHERE id = @id', { id });
        if (!user) {
            res.status(404).json({ error: 'Không tìm thấy người dùng' });
            return;
        }
        if (currentUserRole !== 'owner' && !canManageRole(currentUserRole, user.role)) {
            res.status(403).json({ error: 'Bạn không có quyền xem thông tin người dùng này', errorCode: 'PERM001' });
            return;
        }
        const stores = await (0, db_1.query)(`SELECT s.id as storeId, s.name as storeName, s.slug as storeCode
       FROM UserStores us JOIN Stores s ON us.store_id = s.id WHERE us.user_id = @userId`, { userId: id });
        res.json({
            id: user.id, email: user.email, displayName: user.display_name, role: user.role,
            permissions: user.permissions ? JSON.parse(user.permissions) : null,
            status: user.status, createdAt: user.created_at,
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
        const { displayName, role, status, storeIds, permissions, password } = req.body;
        const currentUser = req.user;
        const currentUserRole = currentUser.role;
        const currentStoreId = req.headers['x-store-id'];
        console.log('[PUT /api/users/:id] Request body:', JSON.stringify({ displayName, role, status, storeIds, permissions: permissions ? 'provided' : 'undefined', password: password ? 'provided' : 'undefined' }));
        console.log('[PUT /api/users/:id] Current user:', currentUser.email, 'Role:', currentUserRole);
        const user = await (0, db_1.queryOne)('SELECT id, email, display_name, role, permissions, status FROM Users WHERE id = @id', { id });
        if (!user) {
            res.status(404).json({ error: 'Không tìm thấy người dùng' });
            return;
        }
        const isEditingSelf = id === currentUser.id;
        const targetUserRole = user.role;
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
        // Non-owner editing self can only change displayName and password
        if (isEditingSelf && currentUserRole !== 'owner') {
            if (role || status || storeIds || permissions) {
                res.status(403).json({ error: 'Bạn chỉ có thể thay đổi tên hiển thị và mật khẩu của mình', errorCode: 'PERM001' });
                return;
            }
        }
        if (role && role !== user.role && !canManageRole(currentUserRole, role)) {
            res.status(403).json({ error: 'Bạn không có quyền gán role này', errorCode: 'PERM001' });
            return;
        }
        const oldValues = {
            displayName: user.display_name, role: user.role, status: user.status,
            permissions: user.permissions ? JSON.parse(user.permissions) : null,
        };
        const roleChanged = role && role !== user.role;
        const permissionsChanged = permissions !== undefined;
        const statusChanged = status && status !== user.status;
        let updateFields = `display_name = COALESCE(@displayName, display_name), role = COALESCE(@role, role),
      status = COALESCE(@status, status), updated_at = GETDATE()`;
        const params = { id, displayName, role, status };
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
        await (0, db_1.query)(`UPDATE Users SET ${updateFields} WHERE id = @id`, params);
        if (storeIds !== undefined && Array.isArray(storeIds)) {
            await (0, db_1.query)('DELETE FROM UserStores WHERE user_id = @id', { id });
            for (const storeId of storeIds) {
                await (0, db_1.query)(`INSERT INTO UserStores (id, user_id, store_id)
           VALUES (NEWID(), @userId, @storeId)`, { userId: id, storeId });
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
 * DELETE /api/users/:id - Deactivate user (soft delete)
 * Requirements: 4.1, 4.2, 4.4, 4.5
 */
router.delete('/:id', (0, permission_1.requireModulePermission)('users', 'delete'), async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;
        const currentUserRole = currentUser.role;
        const currentStoreId = req.headers['x-store-id'];
        if (id === currentUser.id) {
            res.status(400).json({ error: 'Không thể xóa tài khoản của chính mình' });
            return;
        }
        const user = await (0, db_1.queryOne)('SELECT id, email, display_name, role, status FROM Users WHERE id = @id', { id });
        if (!user) {
            res.status(404).json({ error: 'Không tìm thấy người dùng' });
            return;
        }
        // Check role hierarchy - Requirements: 4.1, 4.2
        if (!canManageRole(currentUserRole, user.role)) {
            res.status(403).json({ error: 'Bạn không có quyền xóa người dùng này', errorCode: 'PERM001' });
            return;
        }
        // Soft delete - Requirements: 4.4
        await (0, db_1.query)(`UPDATE Users SET status = 'inactive', updated_at = GETDATE() WHERE id = @id`, { id });
        (0, permission_service_1.invalidateUserPermissionCache)(id);
        await (0, db_1.query)('DELETE FROM Sessions WHERE user_id = @userId', { userId: id });
        // Audit log - Requirements: 4.5
        try {
            await audit_log_repository_1.auditLogRepository.create({
                storeId: currentStoreId || 'system',
                userId: currentUser.id,
                action: 'DELETE',
                entityType: 'User',
                entityId: id,
                oldValues: { email: user.email, displayName: user.display_name, role: user.role, status: user.status },
                newValues: { status: 'inactive' },
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
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Không thể xóa người dùng' });
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
exports.default = router;
//# sourceMappingURL=users.js.map