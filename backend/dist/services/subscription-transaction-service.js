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
    auditSchemaEnsured = false;
    async ensureSubscriptionTransactionAuditSchema() {
        if (this.auditSchemaEnsured) {
            return;
        }
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
        this.auditSchemaEnsured = true;
    }
    parseMetadata(rawMetadata) {
        if (!rawMetadata) {
            return undefined;
        }
        if (typeof rawMetadata === 'object') {
            return rawMetadata;
        }
        if (typeof rawMetadata !== 'string') {
            return undefined;
        }
        try {
            return JSON.parse(rawMetadata);
        }
        catch {
            return undefined;
        }
    }
    /**
     * Tạo giao dịch mới
     */
    async createTransaction(input) {
        await this.ensureSubscriptionTransactionAuditSchema();
        const transactionId = crypto.randomUUID();
        const insertQuery = `
      INSERT INTO SubscriptionTransactions (
        id, user_id, tenant_id, transaction_type, plan_id, previous_plan_id,
        max_stores, amount, currency, payment_method, payment_status,
        transaction_reference, start_date, end_date, auto_renewal,
        processed_by, processed_by_role, processed_by_name, processed_by_email,
        user_name_snapshot, user_email_snapshot,
        notes, metadata, created_at, updated_at
      ) VALUES (
        @transactionId, @userId, @tenantId, @transactionType, @planId, @previousPlanId,
        @maxStores, @amount, 'VND', @paymentMethod, @paymentStatus,
        @transactionReference, @startDate, @endDate, @autoRenewal,
        @processedBy, @processedByRole, @processedByName, @processedByEmail,
        @userNameSnapshot, @userEmailSnapshot,
        @notes, @metadata, GETDATE(), GETDATE()
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
            processedByName: input.processedByName || null,
            processedByEmail: input.processedByEmail || null,
            userNameSnapshot: input.userNameSnapshot || null,
            userEmailSnapshot: input.userEmailSnapshot || null,
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
        if (!userId) {
            return null;
        }
        const userQuery = `
      DECLARE @userIdText NVARCHAR(64) = LTRIM(RTRIM(@userId));

      IF EXISTS (
        SELECT 1
        FROM Users
        WHERE CAST(id AS NVARCHAR(64)) = @userIdText
           OR LEFT(CAST(id AS NVARCHAR(64)), 8) = @userIdText
      )
      BEGIN
        IF COL_LENGTH('Users', 'phone') IS NOT NULL
          SELECT TOP 1
            COALESCE(NULLIF(display_name, ''), NULLIF(email, ''), @userIdText) AS full_name,
            email,
            phone
          FROM Users
          WHERE CAST(id AS NVARCHAR(64)) = @userIdText
             OR LEFT(CAST(id AS NVARCHAR(64)), 8) = @userIdText
          ORDER BY CASE WHEN CAST(id AS NVARCHAR(64)) = @userIdText THEN 0 ELSE 1 END
        ELSE
          SELECT TOP 1
            COALESCE(NULLIF(display_name, ''), NULLIF(email, ''), @userIdText) AS full_name,
            email,
            CAST(NULL AS NVARCHAR(50)) AS phone
          FROM Users
          WHERE CAST(id AS NVARCHAR(64)) = @userIdText
             OR LEFT(CAST(id AS NVARCHAR(64)), 8) = @userIdText
          ORDER BY CASE WHEN CAST(id AS NVARCHAR(64)) = @userIdText THEN 0 ELSE 1 END
      END
      ELSE IF OBJECT_ID('TenantUsers', 'U') IS NOT NULL
      BEGIN
        IF COL_LENGTH('Users', 'phone') IS NOT NULL
          SELECT TOP 1
            COALESCE(NULLIF(u.display_name, ''), NULLIF(u.email, ''), @userIdText) AS full_name,
            u.email,
            u.phone
          FROM TenantUsers tu
          JOIN Users u ON LOWER(u.email) = LOWER(tu.email)
          WHERE CAST(tu.id AS NVARCHAR(64)) = @userIdText
             OR LEFT(CAST(tu.id AS NVARCHAR(64)), 8) = @userIdText
          ORDER BY CASE WHEN CAST(tu.id AS NVARCHAR(64)) = @userIdText THEN 0 ELSE 1 END
        ELSE
          SELECT TOP 1
            COALESCE(NULLIF(u.display_name, ''), NULLIF(u.email, ''), @userIdText) AS full_name,
            u.email,
            CAST(NULL AS NVARCHAR(50)) AS phone
          FROM TenantUsers tu
          JOIN Users u ON LOWER(u.email) = LOWER(tu.email)
          WHERE CAST(tu.id AS NVARCHAR(64)) = @userIdText
             OR LEFT(CAST(tu.id AS NVARCHAR(64)), 8) = @userIdText
          ORDER BY CASE WHEN CAST(tu.id AS NVARCHAR(64)) = @userIdText THEN 0 ELSE 1 END
      END
      ELSE IF OBJECT_ID('Tenants', 'U') IS NOT NULL
      BEGIN
        IF COL_LENGTH('Users', 'phone') IS NOT NULL
          SELECT TOP 1
            COALESCE(NULLIF(u.display_name, ''), NULLIF(u.email, ''), @userIdText) AS full_name,
            u.email,
            u.phone
          FROM Tenants t
          JOIN Users u ON LOWER(u.email) = LOWER(t.email)
          WHERE CAST(t.id AS NVARCHAR(64)) = @userIdText
             OR LEFT(CAST(t.id AS NVARCHAR(64)), 8) = @userIdText
          ORDER BY CASE WHEN CAST(t.id AS NVARCHAR(64)) = @userIdText THEN 0 ELSE 1 END
        ELSE
          SELECT TOP 1
            COALESCE(NULLIF(u.display_name, ''), NULLIF(u.email, ''), @userIdText) AS full_name,
            u.email,
            CAST(NULL AS NVARCHAR(50)) AS phone
          FROM Tenants t
          JOIN Users u ON LOWER(u.email) = LOWER(t.email)
          WHERE CAST(t.id AS NVARCHAR(64)) = @userIdText
             OR LEFT(CAST(t.id AS NVARCHAR(64)), 8) = @userIdText
          ORDER BY CASE WHEN CAST(t.id AS NVARCHAR(64)) = @userIdText THEN 0 ELSE 1 END
      END
    `;
        const result = await (0, db_1.queryOne)(userQuery, { userId });
        if (!result) {
            return null;
        }
        const email = String(result.email || '').trim();
        const fullName = String(result.full_name || '').trim();
        const accountNameFromEmail = email.includes('@') ? email.split('@')[0] : email;
        return {
            fullName: fullName || accountNameFromEmail,
            email,
            phone: result.phone,
        };
    }
    /**
     * Map database record to entity
     */
    mapToEntity(record) {
        const metadata = this.parseMetadata(record.metadata || record.Metadata);
        const assignedBy = metadata && typeof metadata.assignedBy === 'object'
            ? metadata.assignedBy
            : null;
        const assignedTo = metadata && typeof metadata.assignedTo === 'object'
            ? metadata.assignedTo
            : null;
        const metadataProcessedByName = assignedBy && typeof assignedBy.fullName === 'string'
            ? assignedBy.fullName
            : undefined;
        const metadataProcessedByEmail = assignedBy && typeof assignedBy.email === 'string'
            ? assignedBy.email
            : undefined;
        const metadataUserName = assignedTo && typeof assignedTo.fullName === 'string'
            ? assignedTo.fullName
            : undefined;
        const metadataUserEmail = assignedTo && typeof assignedTo.email === 'string'
            ? assignedTo.email
            : undefined;
        return {
            id: record.id,
            userId: (record.user_id || record.UserId || ''),
            tenantId: (record.tenant_id || record.TenantId),
            transactionType: (record.transaction_type || record.TransactionType),
            planId: (record.plan_id || record.PlanId || ''),
            previousPlanId: (record.previous_plan_id || record.PreviousPlanId),
            maxStores: Number(record.max_stores ?? record.MaxStores ?? 1),
            amount: Number(record.amount ?? record.Amount ?? 0),
            currency: (record.currency || record.Currency || 'VND'),
            paymentMethod: (record.payment_method || record.PaymentMethod || 'cash'),
            paymentStatus: (record.payment_status || record.PaymentStatus || 'completed'),
            transactionReference: (record.transaction_reference || record.TransactionReference),
            startDate: new Date(record.start_date || record.StartDate || record.created_at || record.CreatedAt || Date.now()),
            endDate: new Date(record.end_date || record.EndDate || record.created_at || record.CreatedAt || Date.now()),
            autoRenewal: Boolean(record.auto_renewal ?? record.AutoRenewal),
            processedBy: (record.processed_by || record.ProcessedBy),
            processedByRole: (record.processed_by_role || record.ProcessedByRole || 'system'),
            processedByName: (record.processed_by_name || record.ProcessedByName || metadataProcessedByName),
            processedByEmail: (record.processed_by_email || record.ProcessedByEmail || metadataProcessedByEmail),
            userNameSnapshot: (record.user_name_snapshot || record.UserNameSnapshot || metadataUserName),
            userEmailSnapshot: (record.user_email_snapshot || record.UserEmailSnapshot || metadataUserEmail),
            notes: record.notes,
            metadata,
            createdAt: new Date(record.created_at || record.CreatedAt || Date.now()),
            updatedAt: new Date(record.updated_at || record.UpdatedAt || record.created_at || record.CreatedAt || Date.now()),
        };
    }
}
exports.SubscriptionTransactionService = SubscriptionTransactionService;
// Export singleton instance
exports.subscriptionTransactionService = new SubscriptionTransactionService();
//# sourceMappingURL=subscription-transaction-service.js.map