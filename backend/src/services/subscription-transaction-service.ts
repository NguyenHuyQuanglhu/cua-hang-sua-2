/**
 * Subscription Transaction Service
 * 
 * Xử lý lưu lịch sử giao dịch thanh toán gói dịch vụ tự động
 * Cho phép Admin và Quản lý theo dõi các giao dịch
 */

import { query, queryOne } from '../db';
import { withTransaction, transactionQuery } from '../db/transaction';

/**
 * Loại giao dịch gói dịch vụ
 */
export type SubscriptionTransactionType = 'auto_renewal' | 'manual_upgrade' | 'manual_purchase';

/**
 * Trạng thái thanh toán
 */
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

/**
 * Phương thức thanh toán
 */
export type PaymentMethod = 'auto_payment' | 'bank_transfer' | 'credit_card' | 'cash';

/**
 * Vai trò người xử lý
 */
export type ProcessedByRole = 'system' | 'admin' | 'owner' | 'company_manager';

/**
 * Interface cho giao dịch gói dịch vụ
 */
export interface SubscriptionTransaction {
  id: string;
  userId: string;
  tenantId?: string;
  transactionType: SubscriptionTransactionType;
  planId: string;
  previousPlanId?: string;
  maxStores: number;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  transactionReference?: string;
  startDate: Date;
  endDate: Date;
  autoRenewal: boolean;
  processedBy?: string;
  processedByRole: ProcessedByRole;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input để tạo giao dịch mới
 */
export interface CreateSubscriptionTransactionInput {
  userId: string;
  tenantId?: string;
  transactionType: SubscriptionTransactionType;
  planId: string;
  previousPlanId?: string;
  maxStores: number;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentStatus?: PaymentStatus;
  transactionReference?: string;
  startDate: Date;
  endDate: Date;
  autoRenewal?: boolean;
  processedBy?: string;
  processedByRole: ProcessedByRole;
  notes?: string;
  metadata?: Record<string, any>;
}

/**
 * Filter cho tìm kiếm giao dịch
 */
export interface SubscriptionTransactionFilter {
  userId?: string;
  tenantId?: string;
  transactionType?: SubscriptionTransactionType;
  planId?: string;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  processedByRole?: ProcessedByRole;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Thống kê giao dịch
 */
export interface SubscriptionTransactionStats {
  totalTransactions: number;
  totalAmount: number;
  completedTransactions: number;
  completedAmount: number;
  failedTransactions: number;
  pendingTransactions: number;
  autoRenewalCount: number;
  manualUpgradeCount: number;
  byPlan: Record<string, { count: number; amount: number }>;
  byPaymentMethod: Record<string, { count: number; amount: number }>;
}

/**
 * Service xử lý giao dịch gói dịch vụ
 */
export class SubscriptionTransactionService {
  /**
   * Tạo giao dịch mới
   */
  async createTransaction(input: CreateSubscriptionTransactionInput): Promise<SubscriptionTransaction> {
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

    await query(insertQuery, {
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
  async getTransactionById(transactionId: string): Promise<SubscriptionTransaction | null> {
    const selectQuery = `
      SELECT * FROM SubscriptionTransactions 
      WHERE id = @transactionId
    `;

    const result = await queryOne(selectQuery, { transactionId });
    return result ? this.mapToEntity(result) : null;
  }

  /**
   * Lấy danh sách giao dịch với filter
   */
  async getTransactions(filter: SubscriptionTransactionFilter = {}): Promise<SubscriptionTransaction[]> {
    let whereConditions: string[] = [];
    const params: Record<string, any> = {};

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

    const results = await query(selectQuery, params);
    return results.map(row => this.mapToEntity(row));
  }

  /**
   * Cập nhật trạng thái thanh toán
   */
  async updatePaymentStatus(
    transactionId: string, 
    paymentStatus: PaymentStatus, 
    transactionReference?: string,
    notes?: string
  ): Promise<void> {
    const updateQuery = `
      UPDATE SubscriptionTransactions 
      SET 
        payment_status = @paymentStatus,
        transaction_reference = COALESCE(@transactionReference, transaction_reference),
        notes = COALESCE(@notes, notes),
        updated_at = GETDATE()
      WHERE id = @transactionId
    `;

    await query(updateQuery, {
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
  async getTransactionStats(filter: SubscriptionTransactionFilter = {}): Promise<SubscriptionTransactionStats> {
    let whereConditions: string[] = [];
    const params: Record<string, any> = {};

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

    const statsResult = await queryOne(statsQuery, params);

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

    const planStats = await query(planStatsQuery, params);

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

    const paymentMethodStats = await query(paymentMethodStatsQuery, params);

    const byPlan: Record<string, { count: number; amount: number }> = {};
    planStats.forEach(row => {
      const planId = row.plan_id as string;
      const count = row.count as number;
      const amount = row.amount as number;
      byPlan[planId] = { count, amount };
    });

    const byPaymentMethod: Record<string, { count: number; amount: number }> = {};
    paymentMethodStats.forEach(row => {
      const paymentMethod = row.payment_method as string;
      const count = row.count as number;
      const amount = row.amount as number;
      byPaymentMethod[paymentMethod] = { count, amount };
    });

    return {
      totalTransactions: (statsResult?.total_transactions as number) || 0,
      totalAmount: (statsResult?.total_amount as number) || 0,
      completedTransactions: (statsResult?.completed_transactions as number) || 0,
      completedAmount: (statsResult?.completed_amount as number) || 0,
      failedTransactions: (statsResult?.failed_transactions as number) || 0,
      pendingTransactions: (statsResult?.pending_transactions as number) || 0,
      autoRenewalCount: (statsResult?.auto_renewal_count as number) || 0,
      manualUpgradeCount: (statsResult?.manual_upgrade_count as number) || 0,
      byPlan,
      byPaymentMethod,
    };
  }

  /**
   * Lấy thông tin user
   */
  async getUserInfo(userId: string): Promise<{ fullName: string; email: string; phone?: string } | null> {
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

    const result = await queryOne(userQuery, { userId });
    if (!result) {
      return null;
    }

    const email = String(result.email || '').trim();
    const fullName = String(result.full_name || '').trim();
    const accountNameFromEmail = email.includes('@') ? email.split('@')[0] : email;

    return {
      fullName: fullName || accountNameFromEmail,
      email,
      phone: result.phone as string | undefined,
    };
  }

  /**
   * Map database record to entity
   */
  private mapToEntity(record: Record<string, any>): SubscriptionTransaction {
    return {
      id: record.id,
      userId: (record.user_id || record.UserId || '') as string,
      tenantId: (record.tenant_id || record.TenantId) as string | undefined,
      transactionType: (record.transaction_type || record.TransactionType) as SubscriptionTransactionType,
      planId: (record.plan_id || record.PlanId || '') as string,
      previousPlanId: (record.previous_plan_id || record.PreviousPlanId) as string | undefined,
      maxStores: Number(record.max_stores ?? record.MaxStores ?? 1),
      amount: Number(record.amount ?? record.Amount ?? 0),
      currency: (record.currency || record.Currency || 'VND') as string,
      paymentMethod: (record.payment_method || record.PaymentMethod || 'cash') as PaymentMethod,
      paymentStatus: (record.payment_status || record.PaymentStatus || 'completed') as PaymentStatus,
      transactionReference: (record.transaction_reference || record.TransactionReference) as string | undefined,
      startDate: new Date(record.start_date || record.StartDate || record.created_at || record.CreatedAt || Date.now()),
      endDate: new Date(record.end_date || record.EndDate || record.created_at || record.CreatedAt || Date.now()),
      autoRenewal: Boolean(record.auto_renewal ?? record.AutoRenewal),
      processedBy: (record.processed_by || record.ProcessedBy) as string | undefined,
      processedByRole: (record.processed_by_role || record.ProcessedByRole || 'system') as ProcessedByRole,
      notes: record.notes,
      metadata: record.metadata ? JSON.parse(record.metadata) : undefined,
      createdAt: new Date(record.created_at || record.CreatedAt || Date.now()),
      updatedAt: new Date(record.updated_at || record.UpdatedAt || record.created_at || record.CreatedAt || Date.now()),
    };
  }
}

// Export singleton instance
export const subscriptionTransactionService = new SubscriptionTransactionService();