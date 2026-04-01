"use strict";
/**
 * Subscription Transaction Service
 *
 * Xử lý lưu lịch sử giao dịch thanh toán gói dịch vụ tự động
 * Cho phép Admin và Quản lý theo dõi các giao dịch
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionTransactionService = exports.SubscriptionTransactionService = void 0;
const db_1 = require("../db");
/**
 * Service xử lý giao dịch gói dịch vụ
 */
class SubscriptionTransactionService {
    /**
     * Tạo giao dịch mới
     */
    async createTransaction(input) {
        const transactionId = crypto.randomUUID();
        const insertQuery = `
      INSERT INTO SubscriptionTransactions (
        id, user_id, tenant_id, transaction_type, plan_id, previous_plan_id,
        max_stores, amount, currency, payment_method, payment_status,
        transaction_reference, start_date, end_date, auto_renewal,
        processed_by, processed_by_role, notes, metadata, created_at, updated_at
      ) VALUES (
        @transactionId, @userId, @tenantId, @transactionType, @planId, @previousPlanId,
        @maxStores, @amount, 'VND', @paymentMethod, @paymentStatus,
        @transactionReference, @startDate, @endDate, @autoRenewal,
        @processedBy, @processedByRole, @notes, @metadata, GETDATE(), GETDATE()
      )
    `;
        await (0, db_1.query)(insertQuery, {
            transactionId,
            userId: input.userId,
            tenantId: input.tenantId || null,
            transactionType: input.transactionType,
            planId: input.planId,
            previousPlanId: input.previousPlanId || null,
            maxStores: input.maxStores,
            amount: input.amount,
            paymentMethod: input.paymentMethod,
            paymentStatus: input.paymentStatus || 'pending',
            transactionReference: input.transactionReference || null,
            startDate: input.startDate,
            endDate: input.endDate,
            autoRenewal: input.autoRenewal !== false,
            processedBy: input.processedBy || null,
            processedByRole: input.processedByRole,
            notes: input.notes || null,
            metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        });
        // Lấy giao dịch vừa tạo
        const transaction = await this.getTransactionById(transactionId);
        if (!transaction) {
            throw new Error('Failed to create subscription transaction');
        }
        console.log(`[SubscriptionTransaction] Created transaction ${transactionId} for user ${input.userId}: ${input.transactionType} - ${input.planId}`);
        return transaction;
    }
    /**
     * Lấy giao dịch theo ID
     */
    async getTransactionById(transactionId) {
        const selectQuery = `
      SELECT * FROM SubscriptionTransactions 
      WHERE id = @transactionId
    `;
        const result = await (0, db_1.queryOne)(selectQuery, { transactionId });
        return result ? this.mapToEntity(result) : null;
    }
    /**
     * Lấy danh sách giao dịch với filter
     */
    async getTransactions(filter = {}) {
        let whereConditions = [];
        const params = {};
        if (filter.userId) {
            whereConditions.push('user_id = @userId');
            params.userId = filter.userId;
        }
        if (filter.tenantId) {
            whereConditions.push('tenant_id = @tenantId');
            params.tenantId = filter.tenantId;
        }
        if (filter.transactionType) {
            whereConditions.push('transaction_type = @transactionType');
            params.transactionType = filter.transactionType;
        }
        if (filter.planId) {
            whereConditions.push('plan_id = @planId');
            params.planId = filter.planId;
        }
        if (filter.paymentStatus) {
            whereConditions.push('payment_status = @paymentStatus');
            params.paymentStatus = filter.paymentStatus;
        }
        if (filter.paymentMethod) {
            whereConditions.push('payment_method = @paymentMethod');
            params.paymentMethod = filter.paymentMethod;
        }
        if (filter.processedByRole) {
            whereConditions.push('processed_by_role = @processedByRole');
            params.processedByRole = filter.processedByRole;
        }
        if (filter.fromDate) {
            whereConditions.push('created_at >= @fromDate');
            params.fromDate = filter.fromDate;
        }
        if (filter.toDate) {
            whereConditions.push('created_at <= @toDate');
            params.toDate = filter.toDate;
        }
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        const limit = filter.limit || 100;
        const offset = filter.offset || 0;
        const selectQuery = `
      SELECT * FROM SubscriptionTransactions 
      ${whereClause}
      ORDER BY created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;
        params.offset = offset;
        params.limit = limit;
        const results = await (0, db_1.query)(selectQuery, params);
        return results.map(row => this.mapToEntity(row));
    }
    /**
     * Cập nhật trạng thái thanh toán
     */
    async updatePaymentStatus(transactionId, paymentStatus, transactionReference, notes) {
        const updateQuery = `
      UPDATE SubscriptionTransactions 
      SET 
        payment_status = @paymentStatus,
        transaction_reference = COALESCE(@transactionReference, transaction_reference),
        notes = COALESCE(@notes, notes),
        updated_at = GETDATE()
      WHERE id = @transactionId
    `;
        await (0, db_1.query)(updateQuery, {
            transactionId,
            paymentStatus,
            transactionReference: transactionReference || null,
            notes: notes || null,
        });
        console.log(`[SubscriptionTransaction] Updated payment status for ${transactionId}: ${paymentStatus}`);
    }
    /**
     * Lấy thống kê giao dịch
     */
    async getTransactionStats(filter = {}) {
        let whereConditions = [];
        const params = {};
        // Apply same filters as getTransactions
        if (filter.userId) {
            whereConditions.push('user_id = @userId');
            params.userId = filter.userId;
        }
        if (filter.tenantId) {
            whereConditions.push('tenant_id = @tenantId');
            params.tenantId = filter.tenantId;
        }
        if (filter.fromDate) {
            whereConditions.push('created_at >= @fromDate');
            params.fromDate = filter.fromDate;
        }
        if (filter.toDate) {
            whereConditions.push('created_at <= @toDate');
            params.toDate = filter.toDate;
        }
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        const statsQuery = `
      SELECT 
        COUNT(*) as total_transactions,
        SUM(amount) as total_amount,
        SUM(CASE WHEN payment_status = 'completed' THEN 1 ELSE 0 END) as completed_transactions,
        SUM(CASE WHEN payment_status = 'completed' THEN amount ELSE 0 END) as completed_amount,
        SUM(CASE WHEN payment_status = 'failed' THEN 1 ELSE 0 END) as failed_transactions,
        SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) as pending_transactions,
        SUM(CASE WHEN transaction_type = 'auto_renewal' THEN 1 ELSE 0 END) as auto_renewal_count,
        SUM(CASE WHEN transaction_type = 'manual_upgrade' THEN 1 ELSE 0 END) as manual_upgrade_count
      FROM SubscriptionTransactions 
      ${whereClause}
    `;
        const statsResult = await (0, db_1.queryOne)(statsQuery, params);
        // Get breakdown by plan
        const planStatsQuery = `
      SELECT 
        plan_id,
        COUNT(*) as count,
        SUM(amount) as amount
      FROM SubscriptionTransactions 
      ${whereClause}
      GROUP BY plan_id
    `;
        const planStats = await (0, db_1.query)(planStatsQuery, params);
        // Get breakdown by payment method
        const paymentMethodStatsQuery = `
      SELECT 
        payment_method,
        COUNT(*) as count,
        SUM(amount) as amount
      FROM SubscriptionTransactions 
      ${whereClause}
      GROUP BY payment_method
    `;
        const paymentMethodStats = await (0, db_1.query)(paymentMethodStatsQuery, params);
        const byPlan = {};
        planStats.forEach(row => {
            const planId = row.plan_id;
            const count = row.count;
            const amount = row.amount;
            byPlan[planId] = { count, amount };
        });
        const byPaymentMethod = {};
        paymentMethodStats.forEach(row => {
            const paymentMethod = row.payment_method;
            const count = row.count;
            const amount = row.amount;
            byPaymentMethod[paymentMethod] = { count, amount };
        });
        return {
            totalTransactions: statsResult?.total_transactions || 0,
            totalAmount: statsResult?.total_amount || 0,
            completedTransactions: statsResult?.completed_transactions || 0,
            completedAmount: statsResult?.completed_amount || 0,
            failedTransactions: statsResult?.failed_transactions || 0,
            pendingTransactions: statsResult?.pending_transactions || 0,
            autoRenewalCount: statsResult?.auto_renewal_count || 0,
            manualUpgradeCount: statsResult?.manual_upgrade_count || 0,
            byPlan,
            byPaymentMethod,
        };
    }
    /**
     * Lấy thông tin user
     */
    async getUserInfo(userId) {
        const userQuery = `
      SELECT full_name, email, phone 
      FROM Users 
      WHERE id = @userId
    `;
        const result = await (0, db_1.queryOne)(userQuery, { userId });
        return result ? {
            fullName: result.full_name,
            email: result.email,
            phone: result.phone,
        } : null;
    }
    /**
     * Map database record to entity
     */
    mapToEntity(record) {
        return {
            id: record.id,
            userId: record.user_id,
            tenantId: record.tenant_id,
            transactionType: record.transaction_type,
            planId: record.plan_id,
            previousPlanId: record.previous_plan_id,
            maxStores: record.max_stores,
            amount: record.amount,
            currency: record.currency,
            paymentMethod: record.payment_method,
            paymentStatus: record.payment_status,
            transactionReference: record.transaction_reference,
            startDate: new Date(record.start_date),
            endDate: new Date(record.end_date),
            autoRenewal: Boolean(record.auto_renewal),
            processedBy: record.processed_by,
            processedByRole: record.processed_by_role,
            notes: record.notes,
            metadata: record.metadata ? JSON.parse(record.metadata) : undefined,
            createdAt: new Date(record.created_at),
            updatedAt: new Date(record.updated_at),
        };
    }
}
exports.SubscriptionTransactionService = SubscriptionTransactionService;
// Export singleton instance
exports.subscriptionTransactionService = new SubscriptionTransactionService();
//# sourceMappingURL=subscription-transaction-service.js.map