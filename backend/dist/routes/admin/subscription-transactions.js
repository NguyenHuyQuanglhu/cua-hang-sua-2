"use strict";
/**
 * Admin Subscription Transactions Routes
 *
 * API cho Admin và Quản lý xem lịch sử giao dịch gói dịch vụ
 * Chỉ có quyền owner, company_manager mới được truy cập
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const permission_1 = require("../../middleware/permission");
const subscription_transaction_service_1 = require("../../services/subscription-transaction-service");
const auto_renewal_service_1 = require("../../services/auto-renewal-service");
const db_1 = require("../../db");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// GET /api/admin/subscription-transactions - Lấy danh sách giao dịch gói dịch vụ
router.get('/', (0, permission_1.requireModulePermission)('users', 'view'), async (req, res) => {
    try {
        const { userId, tenantId, transactionType, planId, paymentStatus, paymentMethod, processedByRole, fromDate, toDate, limit = 50, offset = 0, } = req.query;
        const filter = {};
        if (userId && typeof userId === 'string')
            filter.userId = userId;
        if (tenantId && typeof tenantId === 'string')
            filter.tenantId = tenantId;
        if (transactionType && typeof transactionType === 'string') {
            filter.transactionType = transactionType;
        }
        if (planId && typeof planId === 'string')
            filter.planId = planId;
        if (paymentStatus && typeof paymentStatus === 'string') {
            filter.paymentStatus = paymentStatus;
        }
        if (paymentMethod && typeof paymentMethod === 'string') {
            filter.paymentMethod = paymentMethod;
        }
        if (processedByRole && typeof processedByRole === 'string') {
            filter.processedByRole = processedByRole;
        }
        if (fromDate && typeof fromDate === 'string') {
            filter.fromDate = new Date(fromDate);
        }
        if (toDate && typeof toDate === 'string') {
            filter.toDate = new Date(toDate);
        }
        filter.limit = Math.min(parseInt(limit) || 50, 200); // Max 200 records
        filter.offset = parseInt(offset) || 0;
        let transactions = [];
        try {
            transactions = await subscription_transaction_service_1.subscriptionTransactionService.getTransactions(filter);
        }
        catch (transactionQueryError) {
            console.warn('Primary query SubscriptionTransactions failed, fallback to SubscriptionHistory:', transactionQueryError);
            transactions = [];
        }
        try {
            const fallbackRows = await (0, db_1.query)(`SELECT TOP (@limit)
           h.id,
           h.user_id,
           h.plan_id,
           h.max_stores,
           h.amount,
           h.payment_method,
           h.status,
           h.start_date,
           h.end_date,
           h.auto_renewal,
           h.created_at
         FROM SubscriptionHistory h
         ORDER BY h.created_at DESC`, { limit: filter.limit || 50 });
            const fallbackTransactions = fallbackRows.map((row) => {
                const rawStatus = String(row.status || '').toLowerCase();
                const paymentStatus = ['pending', 'completed', 'failed', 'refunded'].includes(rawStatus)
                    ? rawStatus
                    : 'completed';
                return ({
                    id: `history_${String(row.id)}`,
                    userId: row.user_id,
                    transactionType: 'manual_purchase',
                    planId: row.plan_id,
                    maxStores: Number(row.max_stores || 1),
                    amount: Number(row.amount || 0),
                    currency: 'VND',
                    paymentMethod: row.payment_method || 'cash',
                    paymentStatus,
                    startDate: new Date(row.start_date),
                    endDate: new Date(row.end_date),
                    autoRenewal: Boolean(row.auto_renewal),
                    processedByRole: 'system',
                    notes: String(row.payment_method || '').toLowerCase() === 'admin_assign'
                        ? 'Cap goi (nguon SubscriptionHistory)'
                        : 'Nguon du lieu: SubscriptionHistory',
                    createdAt: new Date(row.created_at),
                    updatedAt: new Date(row.created_at),
                });
            });
            const existingKeys = new Set(transactions.map((t) => `${t.userId}|${t.planId}|${Number(t.amount || 0)}|${new Date(t.startDate).toISOString()}`));
            const missingFallbackTransactions = fallbackTransactions.filter((t) => {
                const key = `${t.userId}|${t.planId}|${Number(t.amount || 0)}|${new Date(t.startDate).toISOString()}`;
                return !existingKeys.has(key);
            });
            transactions = [...transactions, ...missingFallbackTransactions]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, filter.limit || 50);
        }
        catch (fallbackError) {
            console.warn('Fallback query SubscriptionHistory failed:', fallbackError);
        }
        // Lấy thông tin user cho mỗi giao dịch
        const transactionsWithUserInfo = await Promise.all(transactions.map(async (transaction) => {
            const fallbackUserLabel = transaction.userId
                ? `ID: ${String(transaction.userId).slice(0, 8)}`
                : 'Nguoi dung khong xac dinh';
            try {
                const userInfo = await subscription_transaction_service_1.subscriptionTransactionService.getUserInfo(transaction.userId);
                return {
                    ...transaction,
                    userInfo: {
                        fullName: userInfo?.fullName || fallbackUserLabel,
                        email: userInfo?.email || '-',
                        phone: userInfo?.phone || null,
                    }
                };
            }
            catch (error) {
                console.error(`Failed to get user info for ${transaction.userId}:`, error);
                return {
                    ...transaction,
                    userInfo: {
                        fullName: fallbackUserLabel,
                        email: '-',
                        phone: null,
                    }
                };
            }
        }));
        res.json({
            transactions: transactionsWithUserInfo,
            pagination: {
                limit: filter.limit,
                offset: filter.offset,
                hasMore: transactions.length === filter.limit,
            }
        });
    }
    catch (error) {
        console.error('Get subscription transactions error:', error);
        res.status(500).json({ error: 'Failed to get subscription transactions' });
    }
});
// GET /api/admin/subscription-transactions/stats - Lấy thống kê giao dịch
router.get('/stats', (0, permission_1.requireModulePermission)('users', 'view'), async (req, res) => {
    try {
        const { userId, tenantId, fromDate, toDate, } = req.query;
        const filter = {};
        if (userId && typeof userId === 'string')
            filter.userId = userId;
        if (tenantId && typeof tenantId === 'string')
            filter.tenantId = tenantId;
        if (fromDate && typeof fromDate === 'string') {
            filter.fromDate = new Date(fromDate);
        }
        if (toDate && typeof toDate === 'string') {
            filter.toDate = new Date(toDate);
        }
        const stats = await subscription_transaction_service_1.subscriptionTransactionService.getTransactionStats(filter);
        res.json(stats);
    }
    catch (error) {
        console.error('Get subscription transaction stats error:', error);
        res.status(500).json({ error: 'Failed to get subscription transaction stats' });
    }
});
// GET /api/admin/subscription-transactions/:id - Lấy chi tiết giao dịch
router.get('/:id', (0, permission_1.requireModulePermission)('users', 'view'), async (req, res) => {
    try {
        const { id } = req.params;
        const transaction = await subscription_transaction_service_1.subscriptionTransactionService.getTransactionById(id);
        if (!transaction) {
            res.status(404).json({ error: 'Transaction not found' });
            return;
        }
        // Lấy thông tin user
        const userInfo = await subscription_transaction_service_1.subscriptionTransactionService.getUserInfo(transaction.userId);
        res.json({
            ...transaction,
            userInfo: {
                fullName: userInfo?.fullName || 'N/A',
                email: userInfo?.email || 'N/A',
                phone: userInfo?.phone || null,
            }
        });
    }
    catch (error) {
        console.error('Get subscription transaction error:', error);
        res.status(500).json({ error: 'Failed to get subscription transaction' });
    }
});
// PUT /api/admin/subscription-transactions/:id/status - Cập nhật trạng thái thanh toán
router.put('/:id/status', (0, permission_1.requireModulePermission)('users', 'edit'), async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentStatus, transactionReference, notes } = req.body;
        if (!paymentStatus || !['pending', 'completed', 'failed', 'refunded'].includes(paymentStatus)) {
            res.status(400).json({ error: 'Invalid payment status' });
            return;
        }
        await subscription_transaction_service_1.subscriptionTransactionService.updatePaymentStatus(id, paymentStatus, transactionReference, notes);
        res.json({
            success: true,
            message: 'Payment status updated successfully'
        });
    }
    catch (error) {
        console.error('Update payment status error:', error);
        res.status(500).json({ error: 'Failed to update payment status' });
    }
});
// GET /api/admin/subscription-transactions/expiring/list - Lấy danh sách gói sắp hết hạn
router.get('/expiring/list', (0, permission_1.requireModulePermission)('users', 'view'), async (req, res) => {
    try {
        const expiringSubscriptions = await auto_renewal_service_1.autoRenewalService.getExpiringSubscriptions();
        res.json({
            subscriptions: expiringSubscriptions,
            count: expiringSubscriptions.length,
        });
    }
    catch (error) {
        console.error('Get expiring subscriptions error:', error);
        res.status(500).json({ error: 'Failed to get expiring subscriptions' });
    }
});
// GET /api/admin/subscription-transactions/expired/list - Lấy danh sách gói đã hết hạn
router.get('/expired/list', (0, permission_1.requireModulePermission)('users', 'view'), async (req, res) => {
    try {
        const expiredSubscriptions = await auto_renewal_service_1.autoRenewalService.getExpiredSubscriptions();
        res.json({
            subscriptions: expiredSubscriptions,
            count: expiredSubscriptions.length,
        });
    }
    catch (error) {
        console.error('Get expired subscriptions error:', error);
        res.status(500).json({ error: 'Failed to get expired subscriptions' });
    }
});
// POST /api/admin/subscription-transactions/auto-renewal/run - Chạy quy trình tự động gia hạn (manual trigger)
router.post('/auto-renewal/run', (0, permission_1.requireModulePermission)('users', 'edit'), async (req, res) => {
    try {
        const result = await auto_renewal_service_1.autoRenewalService.runAutoRenewalProcess();
        res.json({
            success: true,
            message: 'Auto-renewal process completed',
            result,
        });
    }
    catch (error) {
        console.error('Run auto-renewal process error:', error);
        res.status(500).json({ error: 'Failed to run auto-renewal process' });
    }
});
// POST /api/admin/subscription-transactions/expired/mark - Đánh dấu gói hết hạn
router.post('/expired/mark', (0, permission_1.requireModulePermission)('users', 'edit'), async (req, res) => {
    try {
        const affectedRows = await auto_renewal_service_1.autoRenewalService.markSubscriptionsAsExpired();
        res.json({
            success: true,
            message: `Marked ${affectedRows} subscriptions as expired`,
            affectedRows,
        });
    }
    catch (error) {
        console.error('Mark expired subscriptions error:', error);
        res.status(500).json({ error: 'Failed to mark expired subscriptions' });
    }
});
exports.default = router;
//# sourceMappingURL=subscription-transactions.js.map