"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const subscription_transaction_service_1 = require("../services/subscription-transaction-service");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
const DEFAULT_SUBSCRIPTION_PLANS = [
    {
        id: 'basic',
        name: 'Gói Cơ Bản',
        description: 'Phù hợp cửa hàng nhỏ mới bắt đầu',
        maxStores: 1,
        price: 199000,
        sortOrder: 1,
        features: [
            '1 cửa hàng',
            'Quản lý sản phẩm không giới hạn',
            'Quản lý bán hàng cơ bản',
            'Báo cáo doanh thu',
            'Quản lý tồn kho',
            'Hỗ trợ qua email',
        ],
    },
    {
        id: 'pro',
        name: 'Gói Chuyên Nghiệp',
        description: 'Phù hợp chuỗi cửa hàng vừa và nhỏ',
        maxStores: 5,
        price: 499000,
        sortOrder: 2,
        features: [
            'Tối đa 5 cửa hàng',
            'Tất cả tính năng Gói Cơ Bản',
            'Báo cáo nâng cao (lợi nhuận, công nợ)',
            'Phân tích xu hướng bán hàng',
            'Quản lý nhân viên và phân quyền',
            'Xuất dữ liệu Excel',
            'Hỗ trợ ưu tiên',
        ],
    },
    {
        id: 'enterprise',
        name: 'Gói Doanh Nghiệp',
        description: 'Phù hợp doanh nghiệp lớn, nhiều chi nhánh',
        maxStores: 999,
        price: 1999000,
        sortOrder: 3,
        features: [
            'Không giới hạn cửa hàng',
            'Tất cả tính năng Gói Chuyên Nghiệp',
            'Báo cáo tùy chỉnh theo yêu cầu',
            'Phân tích AI và dự đoán doanh thu',
            'Tích hợp API với hệ thống khác',
            'Hỗ trợ 24/7 qua điện thoại',
            'Đào tạo nhân viên miễn phí',
            'Tư vấn vận hành',
        ],
    },
];
const LEGACY_DEFAULT_PLAN_NAMES = {
    basic: 'Goi Co Ban',
    pro: 'Goi Chuyen Nghiep',
    enterprise: 'Goi Doanh Nghiep',
};
function canManagePlans(req) {
    const role = req.user?.role;
    return role === 'owner' || role === 'admin' || role === 'company_manager';
}
function parsePlanFeatures(rawFeatures) {
    if (!rawFeatures || typeof rawFeatures !== 'string') {
        return [];
    }
    try {
        const parsed = JSON.parse(rawFeatures);
        return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
    }
    catch {
        return [];
    }
}
async function ensureSubscriptionPlansTable() {
    await (0, db_1.query)(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SubscriptionPlans' AND xtype='U')
    BEGIN
      CREATE TABLE SubscriptionPlans (
        id NVARCHAR(50) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        description NVARCHAR(500) NULL,
        max_stores INT NOT NULL,
        price DECIMAL(18,2) NOT NULL,
        features NVARCHAR(MAX) NULL,
        is_active BIT NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        created_by NVARCHAR(36) NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
      );

      CREATE INDEX IX_SubscriptionPlans_ActiveSort ON SubscriptionPlans(is_active, sort_order);
    END
  `);
    const countResult = await (0, db_1.queryOne)('SELECT COUNT(*) AS count FROM SubscriptionPlans');
    if ((countResult?.count || 0) === 0) {
        for (const plan of DEFAULT_SUBSCRIPTION_PLANS) {
            await (0, db_1.query)(`INSERT INTO SubscriptionPlans (id, name, description, max_stores, price, features, is_active, sort_order)
         VALUES (@id, @name, @description, @maxStores, @price, @features, 1, @sortOrder)`, {
                id: plan.id,
                name: plan.name,
                description: plan.description,
                maxStores: plan.maxStores,
                price: plan.price,
                features: JSON.stringify(plan.features),
                sortOrder: plan.sortOrder,
            });
        }
    }
    // Migrate legacy default plan labels without accents to accented Vietnamese.
    for (const plan of DEFAULT_SUBSCRIPTION_PLANS) {
        const legacyName = LEGACY_DEFAULT_PLAN_NAMES[plan.id];
        if (!legacyName)
            continue;
        await (0, db_1.query)(`UPDATE SubscriptionPlans
       SET name = @name,
           description = @description,
           features = @features,
           updated_at = GETDATE()
       WHERE id = @id AND name = @legacyName`, {
            id: plan.id,
            legacyName,
            name: plan.name,
            description: plan.description,
            features: JSON.stringify(plan.features),
        });
    }
}
async function getPlanPrice(planId) {
    await ensureSubscriptionPlansTable();
    const plan = await (0, db_1.queryOne)('SELECT price FROM SubscriptionPlans WHERE id = @planId AND is_active = 1', { planId });
    if (plan?.price) {
        return Number(plan.price);
    }
    const fallback = {
        basic: 199000,
        pro: 499000,
        enterprise: 1999000,
    };
    return fallback[planId] || 0;
}
// GET /api/subscription/plans - Get available plans
router.get('/plans', async (req, res) => {
    try {
        await ensureSubscriptionPlansTable();
        const includeInactive = req.query.includeInactive === 'true' && canManagePlans(req);
        const plans = await (0, db_1.query)(`
      SELECT id, name, description, max_stores, price, features, is_active, sort_order
      FROM SubscriptionPlans
      ${includeInactive ? '' : 'WHERE is_active = 1'}
      ORDER BY sort_order ASC, price ASC
    `);
        res.json({
            plans: plans.map((plan) => ({
                id: plan.id,
                name: plan.name,
                description: plan.description,
                maxStores: Number(plan.max_stores),
                price: Number(plan.price),
                features: parsePlanFeatures(plan.features),
                isActive: Boolean(plan.is_active),
                sortOrder: Number(plan.sort_order),
            })),
        });
    }
    catch (error) {
        console.error('Get subscription plans error:', error);
        res.status(500).json({ error: 'Failed to get subscription plans' });
    }
});
// POST /api/subscription/plans - Create plan (owner/admin/company_manager)
router.post('/plans', async (req, res) => {
    try {
        if (!canManagePlans(req)) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        await ensureSubscriptionPlansTable();
        const { id, name, description, maxStores, price, features, isActive = true, sortOrder = 0 } = req.body;
        if (!name || typeof name !== 'string') {
            res.status(400).json({ error: 'Name is required' });
            return;
        }
        if (!Number.isFinite(Number(maxStores)) || Number(maxStores) <= 0) {
            res.status(400).json({ error: 'maxStores must be greater than 0' });
            return;
        }
        if (!Number.isFinite(Number(price)) || Number(price) < 0) {
            res.status(400).json({ error: 'price must be >= 0' });
            return;
        }
        const planId = typeof id === 'string' && id.trim() ? id.trim().toLowerCase() : crypto.randomUUID();
        const normalizedFeatures = Array.isArray(features)
            ? features.filter((feature) => typeof feature === 'string' && feature.trim().length > 0)
            : [];
        const existingPlan = await (0, db_1.queryOne)('SELECT id FROM SubscriptionPlans WHERE id = @planId', { planId });
        if (existingPlan) {
            res.status(400).json({ error: 'Plan ID already exists' });
            return;
        }
        await (0, db_1.query)(`INSERT INTO SubscriptionPlans
       (id, name, description, max_stores, price, features, is_active, sort_order, created_by, created_at, updated_at)
       VALUES
       (@planId, @name, @description, @maxStores, @price, @features, @isActive, @sortOrder, @createdBy, GETDATE(), GETDATE())`, {
            planId,
            name: name.trim(),
            description: typeof description === 'string' ? description : null,
            maxStores: Number(maxStores),
            price: Number(price),
            features: JSON.stringify(normalizedFeatures),
            isActive: Boolean(isActive),
            sortOrder: Number(sortOrder) || 0,
            createdBy: req.user?.id || null,
        });
        res.status(201).json({
            success: true,
            plan: {
                id: planId,
                name: name.trim(),
                description: typeof description === 'string' ? description : null,
                maxStores: Number(maxStores),
                price: Number(price),
                features: normalizedFeatures,
                isActive: Boolean(isActive),
                sortOrder: Number(sortOrder) || 0,
            },
        });
    }
    catch (error) {
        console.error('Create subscription plan error:', error);
        res.status(500).json({ error: 'Failed to create subscription plan' });
    }
});
// PUT /api/subscription/plans/:id - Update plan (owner/admin/company_manager)
router.put('/plans/:id', async (req, res) => {
    try {
        if (!canManagePlans(req)) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        await ensureSubscriptionPlansTable();
        const { id } = req.params;
        const updates = [];
        const params = { id };
        if (typeof req.body.name === 'string') {
            updates.push('name = @name');
            params.name = req.body.name.trim();
        }
        if (typeof req.body.description === 'string' || req.body.description === null) {
            updates.push('description = @description');
            params.description = req.body.description;
        }
        if (req.body.maxStores !== undefined) {
            const maxStores = Number(req.body.maxStores);
            if (!Number.isFinite(maxStores) || maxStores <= 0) {
                res.status(400).json({ error: 'maxStores must be greater than 0' });
                return;
            }
            updates.push('max_stores = @maxStores');
            params.maxStores = maxStores;
        }
        if (req.body.price !== undefined) {
            const price = Number(req.body.price);
            if (!Number.isFinite(price) || price < 0) {
                res.status(400).json({ error: 'price must be >= 0' });
                return;
            }
            updates.push('price = @price');
            params.price = price;
        }
        if (req.body.features !== undefined) {
            if (!Array.isArray(req.body.features)) {
                res.status(400).json({ error: 'features must be an array' });
                return;
            }
            const normalizedFeatures = req.body.features.filter((feature) => typeof feature === 'string' && feature.trim().length > 0);
            updates.push('features = @features');
            params.features = JSON.stringify(normalizedFeatures);
        }
        if (req.body.isActive !== undefined) {
            updates.push('is_active = @isActive');
            params.isActive = Boolean(req.body.isActive);
        }
        if (req.body.sortOrder !== undefined) {
            updates.push('sort_order = @sortOrder');
            params.sortOrder = Number(req.body.sortOrder) || 0;
        }
        if (updates.length === 0) {
            res.status(400).json({ error: 'No valid fields to update' });
            return;
        }
        await (0, db_1.query)(`UPDATE SubscriptionPlans
       SET ${updates.join(', ')}, updated_at = GETDATE()
       WHERE id = @id`, params);
        const updatedPlan = await (0, db_1.queryOne)(`SELECT id, name, description, max_stores, price, features, is_active, sort_order
       FROM SubscriptionPlans WHERE id = @id`, { id });
        if (!updatedPlan) {
            res.status(404).json({ error: 'Plan not found' });
            return;
        }
        res.json({
            success: true,
            plan: {
                id: updatedPlan.id,
                name: updatedPlan.name,
                description: updatedPlan.description,
                maxStores: Number(updatedPlan.max_stores),
                price: Number(updatedPlan.price),
                features: parsePlanFeatures(updatedPlan.features),
                isActive: Boolean(updatedPlan.is_active),
                sortOrder: Number(updatedPlan.sort_order),
            },
        });
    }
    catch (error) {
        console.error('Update subscription plan error:', error);
        res.status(500).json({ error: 'Failed to update subscription plan' });
    }
});
// DELETE /api/subscription/plans/:id - Delete plan (owner/admin/company_manager)
router.delete('/plans/:id', async (req, res) => {
    try {
        if (!canManagePlans(req)) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        await ensureSubscriptionPlansTable();
        const { id } = req.params;
        const planInUse = await (0, db_1.queryOne)(`SELECT COUNT(*) AS count FROM Users
       WHERE subscription_plan_id = @id AND subscription_status = 'active'`, { id });
        if ((planInUse?.count || 0) > 0) {
            res.status(400).json({ error: 'Plan is in use and cannot be deleted' });
            return;
        }
        await (0, db_1.query)('DELETE FROM SubscriptionPlans WHERE id = @id', { id });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Delete subscription plan error:', error);
        res.status(500).json({ error: 'Failed to delete subscription plan' });
    }
});
// GET /api/subscription/history - Current user purchase history
router.get('/history', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const limit = Math.min(parseInt(String(req.query.limit || 20), 10) || 20, 100);
        try {
            await ensureSubscriptionPlansTable();
            const transactions = await (0, db_1.query)(`SELECT TOP (@limit)
           st.id,
           st.plan_id,
           st.amount,
           st.payment_method,
           st.payment_status,
           st.start_date,
           st.end_date,
           st.created_at,
           sp.name AS plan_name
         FROM SubscriptionTransactions st
         LEFT JOIN SubscriptionPlans sp ON st.plan_id = sp.id
         WHERE st.user_id = @userId
         ORDER BY st.created_at DESC`, { userId, limit });
            const fallbackHistory = await (0, db_1.query)(`SELECT TOP (@limit)
           id,
           plan_id,
           amount,
           payment_method,
           status,
           start_date,
           end_date,
           created_at
         FROM SubscriptionHistory
         WHERE user_id = @userId
         ORDER BY created_at DESC`, { userId, limit });
            const normalizedTransactions = transactions.map((item) => ({
                id: item.id,
                planId: item.plan_id,
                planName: item.plan_name || item.plan_id,
                amount: Number(item.amount || 0),
                paymentMethod: item.payment_method,
                paymentStatus: item.payment_status,
                startDate: item.start_date ? new Date(item.start_date).toISOString() : null,
                endDate: item.end_date ? new Date(item.end_date).toISOString() : null,
                createdAt: item.created_at ? new Date(item.created_at).toISOString() : null,
            }));
            const existingKeys = new Set(normalizedTransactions.map((item) => [item.planId, item.amount, item.paymentMethod, item.startDate, item.endDate].join('|')));
            const normalizedFallback = fallbackHistory
                .map((item) => ({
                id: item.id,
                planId: item.plan_id,
                planName: item.plan_id,
                amount: Number(item.amount || 0),
                paymentMethod: item.payment_method || 'direct',
                paymentStatus: item.status || 'completed',
                startDate: item.start_date ? new Date(item.start_date).toISOString() : null,
                endDate: item.end_date ? new Date(item.end_date).toISOString() : null,
                createdAt: item.created_at ? new Date(item.created_at).toISOString() : null,
            }))
                .filter((item) => {
                const key = [item.planId, item.amount, item.paymentMethod, item.startDate, item.endDate].join('|');
                return !existingKeys.has(key);
            });
            const mergedHistory = [...normalizedTransactions, ...normalizedFallback]
                .sort((a, b) => {
                const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return bTime - aTime;
            })
                .slice(0, limit);
            res.json({
                history: mergedHistory,
            });
        }
        catch (transactionTableError) {
            const fallbackHistory = await (0, db_1.query)(`SELECT TOP (@limit)
           id,
           plan_id,
           amount,
           payment_method,
           status,
           start_date,
           end_date,
           created_at
         FROM SubscriptionHistory
         WHERE user_id = @userId
         ORDER BY created_at DESC`, { userId, limit });
            res.json({
                history: fallbackHistory.map((item) => ({
                    id: item.id,
                    planId: item.plan_id,
                    planName: item.plan_id,
                    amount: Number(item.amount || 0),
                    paymentMethod: item.payment_method || 'direct',
                    paymentStatus: item.status || 'completed',
                    startDate: item.start_date ? new Date(item.start_date).toISOString() : null,
                    endDate: item.end_date ? new Date(item.end_date).toISOString() : null,
                    createdAt: item.created_at ? new Date(item.created_at).toISOString() : null,
                })),
                source: 'SubscriptionHistory',
            });
            console.warn('Fallback to SubscriptionHistory in /subscription/history:', transactionTableError);
        }
    }
    catch (error) {
        console.error('Get subscription history error:', error);
        res.status(500).json({ error: 'Failed to get subscription history' });
    }
});
// GET /api/subscription/current - Get current subscription plan
router.get('/current', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        // Get user's subscription details
        const userQuery = `
      SELECT 
        ISNULL(max_stores, 999) as max_stores,
        subscription_plan_id,
        subscription_start_date,
        subscription_end_date,
        auto_renewal,
        subscription_status
      FROM Users
      WHERE id = @userId
    `;
        const user = await (0, db_1.queryOne)(userQuery, { userId });
        const maxStores = user?.max_stores || 999;
        const planId = user?.subscription_plan_id || 'basic';
        const startDate = user?.subscription_start_date;
        const endDate = user?.subscription_end_date;
        // Handle auto_renewal: convert to boolean properly
        // SQL Server BIT can return true/false or 1/0 depending on driver
        const autoRenewal = user?.auto_renewal === null ? true : Boolean(user?.auto_renewal);
        const status = user?.subscription_status || 'active';
        // Count current stores
        const storesQuery = `
      SELECT COUNT(DISTINCT us.store_id) as count
      FROM UserStores us
      INNER JOIN Stores s ON us.store_id = s.id
      WHERE us.user_id = @userId AND s.status = 'active'
    `;
        const storesResult = await (0, db_1.queryOne)(storesQuery, { userId });
        const currentStores = storesResult?.count || 0;
        // Calculate days remaining
        let daysRemaining = null;
        let isExpired = false;
        if (endDate) {
            const now = new Date();
            const end = new Date(endDate);
            const diffTime = end.getTime() - now.getTime();
            daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            isExpired = daysRemaining < 0;
        }
        res.json({
            maxStores,
            currentStores,
            planId,
            startDate: startDate ? new Date(startDate).toISOString() : null,
            endDate: endDate ? new Date(endDate).toISOString() : null,
            daysRemaining,
            isExpired,
            autoRenewal,
            status,
        });
    }
    catch (error) {
        console.error('Get subscription error:', error);
        res.status(500).json({ error: 'Failed to get subscription' });
    }
});
// POST /api/subscription/upgrade - Upgrade subscription plan
router.post('/upgrade', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { planId, maxStores, paymentMethod } = req.body;
        const normalizedPaymentMethod = paymentMethod === 'cash' || paymentMethod === 'bank_transfer'
            ? paymentMethod
            : 'bank_transfer';
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        if (!planId) {
            res.status(400).json({ error: 'Missing planId' });
            return;
        }
        await ensureSubscriptionPlansTable();
        const selectedPlan = await (0, db_1.queryOne)(`SELECT id, name, max_stores, price
       FROM SubscriptionPlans
       WHERE id = @planId AND is_active = 1`, { planId });
        const resolvedMaxStores = selectedPlan?.max_stores || Number(maxStores);
        if (!resolvedMaxStores || !Number.isFinite(Number(resolvedMaxStores))) {
            res.status(400).json({ error: 'Invalid maxStores for selected plan' });
            return;
        }
        console.log(`[Subscription] User ${userId} upgrading to plan ${planId} (${resolvedMaxStores} stores) via ${normalizedPaymentMethod}`);
        // Get current plan for comparison
        const currentUser = await (0, db_1.queryOne)('SELECT subscription_plan_id, max_stores FROM Users WHERE id = @userId', { userId });
        // For bank transfer, update immediately
        const now = new Date();
        const startDate = now;
        const endDate = new Date(now);
        endDate.setMonth(endDate.getMonth() + 1); // Add 1 month
        const updateQuery = `
      UPDATE Users
      SET max_stores = @maxStores,
          subscription_plan_id = @planId,
          subscription_start_date = @startDate,
          subscription_end_date = @endDate,
          subscription_status = 'active',
          auto_renewal = 1,
          updated_at = GETDATE()
      WHERE id = @userId
    `;
        await (0, db_1.query)(updateQuery, {
            userId,
            maxStores: resolvedMaxStores,
            planId,
            startDate,
            endDate,
        });
        // Create subscription history record
        const planPrice = selectedPlan?.price ? Number(selectedPlan.price) : await getPlanPrice(planId);
        await (0, db_1.query)(`INSERT INTO SubscriptionHistory (id, user_id, plan_id, max_stores, amount, payment_method, start_date, end_date, status, auto_renewal, created_at)
       VALUES (NEWID(), @userId, @planId, @maxStores, @amount, @paymentMethod, @startDate, @endDate, 'active', 1, GETDATE())`, {
            userId,
            planId,
            maxStores: resolvedMaxStores,
            amount: planPrice,
            paymentMethod: normalizedPaymentMethod,
            startDate,
            endDate,
        });
        // Lưu lịch sử giao dịch để Admin/Quản lý theo dõi.
        // Nếu ghi vào SubscriptionTransactions lỗi tạm thời,
        // vẫn giữ giao dịch mua thành công vì đã có SubscriptionHistory làm nguồn dự phòng.
        let transactionLogged = true;
        try {
            await subscription_transaction_service_1.subscriptionTransactionService.createTransaction({
                userId,
                transactionType: currentUser?.subscription_plan_id && currentUser?.subscription_plan_id !== 'basic'
                    ? 'manual_upgrade'
                    : 'manual_purchase',
                planId,
                previousPlanId: currentUser?.subscription_plan_id || undefined,
                maxStores: resolvedMaxStores,
                amount: planPrice,
                paymentMethod: normalizedPaymentMethod === 'bank_transfer' ? 'bank_transfer' : 'cash',
                paymentStatus: 'completed',
                startDate,
                endDate,
                autoRenewal: true,
                processedByRole: 'system',
                notes: `Mua goi ${selectedPlan?.name || planId} (${resolvedMaxStores} cua hang) qua ${normalizedPaymentMethod}`,
                metadata: {
                    upgradeSource: 'manual',
                    previousMaxStores: currentUser?.max_stores || 0,
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                }
            });
        }
        catch (transactionError) {
            transactionLogged = false;
            console.warn('[Subscription] createTransaction failed, fallback to SubscriptionHistory only:', transactionError);
        }
        // Log the subscription change
        await (0, db_1.query)(`INSERT INTO AuditLogs (id, user_id, action, entity_type, entity_id, details, created_at)
       VALUES (NEWID(), @userId, 'subscription_upgrade', 'subscription', @planId, @details, GETDATE())`, {
            userId,
            planId,
            details: JSON.stringify({
                planId,
                maxStores: resolvedMaxStores,
                paymentMethod: normalizedPaymentMethod,
                planPrice,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                timestamp: new Date().toISOString()
            })
        });
        res.json({
            success: true,
            message: 'Subscription upgraded successfully',
            maxStores: resolvedMaxStores,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            transactionLogged,
        });
    }
    catch (error) {
        console.error('Upgrade subscription error:', error);
        res.status(500).json({ error: 'Failed to upgrade subscription' });
    }
});
// POST /api/subscription/toggle-auto-renewal - Toggle auto-renewal
router.post('/toggle-auto-renewal', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { autoRenewal } = req.body;
        console.log('[Toggle Auto-Renewal] Request received:', { userId, autoRenewal, body: req.body });
        if (!userId) {
            console.log('[Toggle Auto-Renewal] Unauthorized - no userId');
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        if (typeof autoRenewal !== 'boolean') {
            console.log('[Toggle Auto-Renewal] Invalid autoRenewal type:', typeof autoRenewal);
            res.status(400).json({ error: 'autoRenewal must be a boolean' });
            return;
        }
        console.log('[Toggle Auto-Renewal] Updating user:', { userId, autoRenewal: autoRenewal ? 1 : 0 });
        await (0, db_1.query)(`UPDATE Users SET auto_renewal = @autoRenewal, updated_at = GETDATE() WHERE id = @userId`, { userId, autoRenewal: autoRenewal ? 1 : 0 });
        console.log('[Toggle Auto-Renewal] Update successful');
        // Log the change
        await (0, db_1.query)(`INSERT INTO AuditLogs (id, user_id, action, entity_type, entity_id, details, created_at)
       VALUES (NEWID(), @userId, 'subscription_auto_renewal_toggle', 'subscription', @userId, @details, GETDATE())`, {
            userId,
            details: JSON.stringify({
                autoRenewal,
                timestamp: new Date().toISOString()
            })
        });
        console.log('[Toggle Auto-Renewal] Audit log created');
        res.json({
            success: true,
            autoRenewal,
            message: autoRenewal ? 'Đã bật tự động gia hạn' : 'Đã tắt tự động gia hạn',
        });
    }
    catch (error) {
        console.error('[Toggle Auto-Renewal] Error:', error);
        res.status(500).json({ error: 'Failed to toggle auto-renewal' });
    }
});
// POST /api/subscription/cancel - Cancel subscription
router.post('/cancel', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        // Get current subscription
        const user = await (0, db_1.queryOne)(`SELECT subscription_plan_id, subscription_end_date FROM Users WHERE id = @userId`, { userId });
        if (!user || user.subscription_plan_id === 'basic') {
            res.status(400).json({ error: 'Cannot cancel basic plan' });
            return;
        }
        // Update subscription status to cancelled and disable auto-renewal
        await (0, db_1.query)(`UPDATE Users 
       SET subscription_status = 'cancelled',
           auto_renewal = 0,
           updated_at = GETDATE()
       WHERE id = @userId`, { userId });
        // Update subscription history
        await (0, db_1.query)(`UPDATE SubscriptionHistory
       SET status = 'cancelled'
       WHERE user_id = @userId AND status = 'active'`, { userId });
        // Log the cancellation
        await (0, db_1.query)(`INSERT INTO AuditLogs (id, user_id, action, entity_type, entity_id, details, created_at)
       VALUES (NEWID(), @userId, 'subscription_cancelled', 'subscription', @userId, @details, GETDATE())`, {
            userId,
            details: JSON.stringify({
                planId: user.subscription_plan_id,
                endDate: user.subscription_end_date,
                timestamp: new Date().toISOString()
            })
        });
        res.json({
            success: true,
            message: 'Đã hủy gói dịch vụ. Gói sẽ hết hạn vào ngày đã thanh toán.',
            endDate: user.subscription_end_date,
        });
    }
    catch (error) {
        console.error('Cancel subscription error:', error);
        res.status(500).json({ error: 'Failed to cancel subscription' });
    }
});
exports.default = router;
//# sourceMappingURL=subscription.js.map