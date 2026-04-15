import { query, queryOne, QueryParams } from '../db';

/**
 * CashTransaction entity interface
 */
export interface CashTransaction {
  id: string;
  storeId: string;
  type: 'thu' | 'chi';
  transactionDate: string;
  amount: number;
  reason: string;
  category?: string;
  relatedInvoiceId?: string;
  createdBy?: string;
  createdAt?: string;
}

/**
 * Cash flow summary interface
 */
export interface CashFlowSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeCount: number;
  expenseCount: number;
}

/**
 * Paginated result interface
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * CashTransaction repository for managing cash flow transactions
 */
export class CashTransactionRepository {
  private toSqlLocalIsoString(value: Date | string): string {
    if (!(value instanceof Date)) {
      return String(value);
    }

    // SQL DATETIME columns are timezone-naive; mssql returns them as UTC dates by default.
    // Use UTC getters to preserve the original wall-clock value stored in SQL.
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const day = String(value.getUTCDate()).padStart(2, '0');
    const hours = String(value.getUTCHours()).padStart(2, '0');
    const minutes = String(value.getUTCMinutes()).padStart(2, '0');
    const seconds = String(value.getUTCSeconds()).padStart(2, '0');
    const millis = String(value.getUTCMilliseconds()).padStart(3, '0');

    // Return timezone-free ISO-like string so frontend won't shift to next/previous day.
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${millis}`;
  }

  /**
   * Find all cash transactions with filtering options
   */
  async findAllFiltered(
    storeId: string,
    options?: {
      page?: number;
      pageSize?: number;
      type?: 'thu' | 'chi';
      category?: string;
      dateFrom?: string;
      dateTo?: string;
      orderBy?: string;
      orderDirection?: 'ASC' | 'DESC';
    }
  ): Promise<PaginatedResult<CashTransaction>> {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let whereClause = 'store_id = @storeId';
    const params: QueryParams = { storeId };

    if (options?.type) {
      whereClause += ' AND type = @type';
      params.type = options.type;
    }

    if (options?.category) {
      whereClause += ' AND category = @category';
      params.category = options.category;
    }

    if (options?.dateFrom) {
      whereClause += ' AND transaction_date >= @dateFrom';
      params.dateFrom = new Date(options.dateFrom);
    }

    if (options?.dateTo) {
      whereClause += ' AND transaction_date <= @dateTo';
      params.dateTo = new Date(options.dateTo);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM CashTransactions WHERE ${whereClause}`;
    const countResult = await queryOne<{ total: number }>(countQuery, params);
    const total = countResult?.total ?? 0;

    // Get paginated results
    const orderBy = options?.orderBy === 'TransactionDate' ? 'transaction_date' : (options?.orderBy || 'transaction_date');
    const direction = options?.orderDirection || 'DESC';
    
    const dataQuery = `
      SELECT * FROM CashTransactions 
      WHERE ${whereClause}
      ORDER BY ${orderBy} ${direction}
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `;

    const results = await query<{
      id: string;
      store_id: string;
      type: string;
      transaction_date: Date;
      amount: number;
      reason: string;
      category: string | null;
      related_invoice_id: string | null;
      created_by: string | null;
      created_at: Date;
    }>(dataQuery, { ...params, offset, pageSize });

    return {
      data: results.map(r => ({
        id: r.id,
        storeId: r.store_id,
        type: r.type as 'thu' | 'chi',
        transactionDate: r.transaction_date instanceof Date 
          ? this.toSqlLocalIsoString(r.transaction_date)
          : String(r.transaction_date),
        amount: r.amount,
        reason: r.reason,
        category: r.category || undefined,
        relatedInvoiceId: r.related_invoice_id || undefined,
        createdBy: r.created_by || undefined,
        createdAt: r.created_at instanceof Date 
          ? this.toSqlLocalIsoString(r.created_at)
          : String(r.created_at),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Find by ID
   */
  async findById(id: string, storeId: string): Promise<CashTransaction | null> {
    const result = await queryOne<{
      id: string;
      store_id: string;
      type: string;
      transaction_date: Date;
      amount: number;
      reason: string;
      category: string | null;
      related_invoice_id: string | null;
      created_by: string | null;
      created_at: Date;
    }>(`SELECT * FROM CashTransactions WHERE id = @id AND store_id = @storeId`, { id, storeId });

    if (!result) return null;

    return {
      id: result.id,
      storeId: result.store_id,
      type: result.type as 'thu' | 'chi',
      transactionDate: result.transaction_date instanceof Date 
        ? this.toSqlLocalIsoString(result.transaction_date)
        : String(result.transaction_date),
      amount: result.amount,
      reason: result.reason,
      category: result.category || undefined,
      relatedInvoiceId: result.related_invoice_id || undefined,
      createdBy: result.created_by || undefined,
      createdAt: result.created_at instanceof Date 
        ? this.toSqlLocalIsoString(result.created_at)
        : String(result.created_at),
    };
  }

  /**
   * Create a new cash transaction
   */
  async create(
    entity: Omit<CashTransaction, 'id' | 'createdAt'>,
    storeId: string
  ): Promise<CashTransaction> {
    const id = crypto.randomUUID();
    
    await query(
      `INSERT INTO CashTransactions (id, store_id, type, transaction_date, amount, reason, category, related_invoice_id, created_by, created_at)
       VALUES (@id, @storeId, @type, @transactionDate, @amount, @reason, @category, @relatedInvoiceId, @createdBy, GETDATE())`,
      {
        id,
        storeId,
        type: entity.type,
        transactionDate: new Date(entity.transactionDate),
        amount: entity.amount,
        reason: entity.reason,
        category: entity.category || null,
        relatedInvoiceId: entity.relatedInvoiceId || null,
        createdBy: entity.createdBy || null,
      }
    );

    const created = await this.findById(id, storeId);
    if (!created) {
      throw new Error('Failed to create cash transaction');
    }
    return created;
  }

  /**
   * Update a cash transaction
   */
  async update(
    id: string,
    entity: Partial<CashTransaction>,
    storeId: string
  ): Promise<CashTransaction> {
    const existing = await this.findById(id, storeId);
    if (!existing) {
      throw new Error('Cash transaction not found');
    }

    await query(
      `UPDATE CashTransactions SET 
        type = @type, 
        transaction_date = @transactionDate, 
        amount = @amount, 
        reason = @reason, 
        category = @category, 
        related_invoice_id = @relatedInvoiceId
       WHERE id = @id AND store_id = @storeId`,
      {
        id,
        storeId,
        type: entity.type ?? existing.type,
        transactionDate: entity.transactionDate ? new Date(entity.transactionDate) : new Date(existing.transactionDate),
        amount: entity.amount ?? existing.amount,
        reason: entity.reason ?? existing.reason,
        category: entity.category ?? existing.category ?? null,
        relatedInvoiceId: entity.relatedInvoiceId ?? existing.relatedInvoiceId ?? null,
      }
    );

    const updated = await this.findById(id, storeId);
    if (!updated) {
      throw new Error('Failed to update cash transaction');
    }
    return updated;
  }

  /**
   * Delete a cash transaction
   */
  async delete(id: string, storeId: string): Promise<boolean> {
    const existing = await this.findById(id, storeId);
    if (!existing) {
      return false;
    }

    await query(`DELETE FROM CashTransactions WHERE id = @id AND store_id = @storeId`, { id, storeId });
    return true;
  }

  /**
   * Get cash flow summary for a date range
   */
  async getSummary(
    storeId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<CashFlowSummary> {
    let whereClause = 'store_id = @storeId';
    const params: QueryParams = { storeId };

    if (dateFrom) {
      whereClause += ' AND transaction_date >= @dateFrom';
      params.dateFrom = new Date(dateFrom);
    }

    if (dateTo) {
      whereClause += ' AND transaction_date <= @dateTo';
      params.dateTo = new Date(dateTo);
    }

    const result = await queryOne<{
      TotalIncome: number;
      TotalExpense: number;
      IncomeCount: number;
      ExpenseCount: number;
    }>(
      `SELECT 
         ISNULL(SUM(CASE WHEN type = 'thu' THEN amount ELSE 0 END), 0) as TotalIncome,
         ISNULL(SUM(CASE WHEN type = 'chi' THEN amount ELSE 0 END), 0) as TotalExpense,
         SUM(CASE WHEN type = 'thu' THEN 1 ELSE 0 END) as IncomeCount,
         SUM(CASE WHEN type = 'chi' THEN 1 ELSE 0 END) as ExpenseCount
       FROM CashTransactions 
       WHERE ${whereClause}`,
      params
    );

    const totalIncome = result?.TotalIncome ?? 0;
    const totalExpense = result?.TotalExpense ?? 0;

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      incomeCount: result?.IncomeCount ?? 0,
      expenseCount: result?.ExpenseCount ?? 0,
    };
  }

  /**
   * Get distinct categories used in cash transactions
   */
  async getCategories(storeId: string): Promise<string[]> {
    const results = await query<{ category: string }>(
      `SELECT DISTINCT category FROM CashTransactions 
       WHERE store_id = @storeId AND category IS NOT NULL
       ORDER BY category`,
      { storeId }
    );
    return results.map(r => r.category);
  }
}

// Export singleton instance
export const cashTransactionRepository = new CashTransactionRepository();
