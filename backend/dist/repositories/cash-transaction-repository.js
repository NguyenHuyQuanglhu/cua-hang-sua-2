"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cashTransactionRepository = exports.CashTransactionRepository = void 0;
const db_1 = require("../db");
/**
 * CashTransaction repository for managing cash flow transactions
 */
class CashTransactionRepository {
    /**
     * Find all cash transactions with filtering options
     */
    async findAllFiltered(storeId, options) {
        const page = options?.page || 1;
        const pageSize = options?.pageSize || 20;
        const offset = (page - 1) * pageSize;
        let whereClause = 'store_id = @storeId';
        const params = { storeId };
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
        const countResult = await (0, db_1.queryOne)(countQuery, params);
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
        const results = await (0, db_1.query)(dataQuery, { ...params, offset, pageSize });
        return {
            data: results.map(r => ({
                id: r.id,
                storeId: r.store_id,
                type: r.type,
                transactionDate: r.transaction_date instanceof Date
                    ? r.transaction_date.toISOString()
                    : String(r.transaction_date),
                amount: r.amount,
                reason: r.reason,
                category: r.category || undefined,
                relatedInvoiceId: r.related_invoice_id || undefined,
                createdBy: r.created_by || undefined,
                createdAt: r.created_at instanceof Date
                    ? r.created_at.toISOString()
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
    async findById(id, storeId) {
        const result = await (0, db_1.queryOne)(`SELECT * FROM CashTransactions WHERE id = @id AND store_id = @storeId`, { id, storeId });
        if (!result)
            return null;
        return {
            id: result.id,
            storeId: result.store_id,
            type: result.type,
            transactionDate: result.transaction_date instanceof Date
                ? result.transaction_date.toISOString()
                : String(result.transaction_date),
            amount: result.amount,
            reason: result.reason,
            category: result.category || undefined,
            relatedInvoiceId: result.related_invoice_id || undefined,
            createdBy: result.created_by || undefined,
            createdAt: result.created_at instanceof Date
                ? result.created_at.toISOString()
                : String(result.created_at),
        };
    }
    /**
     * Create a new cash transaction
     */
    async create(entity, storeId) {
        const id = crypto.randomUUID();
        await (0, db_1.query)(`INSERT INTO CashTransactions (id, store_id, type, transaction_date, amount, reason, category, related_invoice_id, created_by, created_at)
       VALUES (@id, @storeId, @type, @transactionDate, @amount, @reason, @category, @relatedInvoiceId, @createdBy, GETDATE())`, {
            id,
            storeId,
            type: entity.type,
            transactionDate: new Date(entity.transactionDate),
            amount: entity.amount,
            reason: entity.reason,
            category: entity.category || null,
            relatedInvoiceId: entity.relatedInvoiceId || null,
            createdBy: entity.createdBy || null,
        });
        const created = await this.findById(id, storeId);
        if (!created) {
            throw new Error('Failed to create cash transaction');
        }
        return created;
    }
    /**
     * Update a cash transaction
     */
    async update(id, entity, storeId) {
        const existing = await this.findById(id, storeId);
        if (!existing) {
            throw new Error('Cash transaction not found');
        }
        await (0, db_1.query)(`UPDATE CashTransactions SET 
        type = @type, 
        transaction_date = @transactionDate, 
        amount = @amount, 
        reason = @reason, 
        category = @category, 
        related_invoice_id = @relatedInvoiceId
       WHERE id = @id AND store_id = @storeId`, {
            id,
            storeId,
            type: entity.type ?? existing.type,
            transactionDate: entity.transactionDate ? new Date(entity.transactionDate) : new Date(existing.transactionDate),
            amount: entity.amount ?? existing.amount,
            reason: entity.reason ?? existing.reason,
            category: entity.category ?? existing.category ?? null,
            relatedInvoiceId: entity.relatedInvoiceId ?? existing.relatedInvoiceId ?? null,
        });
        const updated = await this.findById(id, storeId);
        if (!updated) {
            throw new Error('Failed to update cash transaction');
        }
        return updated;
    }
    /**
     * Delete a cash transaction
     */
    async delete(id, storeId) {
        const existing = await this.findById(id, storeId);
        if (!existing) {
            return false;
        }
        await (0, db_1.query)(`DELETE FROM CashTransactions WHERE id = @id AND store_id = @storeId`, { id, storeId });
        return true;
    }
    /**
     * Get cash flow summary for a date range
     */
    async getSummary(storeId, dateFrom, dateTo) {
        let whereClause = 'store_id = @storeId';
        const params = { storeId };
        if (dateFrom) {
            whereClause += ' AND transaction_date >= @dateFrom';
            params.dateFrom = new Date(dateFrom);
        }
        if (dateTo) {
            whereClause += ' AND transaction_date <= @dateTo';
            params.dateTo = new Date(dateTo);
        }
        const result = await (0, db_1.queryOne)(`SELECT 
         ISNULL(SUM(CASE WHEN type = 'thu' THEN amount ELSE 0 END), 0) as TotalIncome,
         ISNULL(SUM(CASE WHEN type = 'chi' THEN amount ELSE 0 END), 0) as TotalExpense,
         SUM(CASE WHEN type = 'thu' THEN 1 ELSE 0 END) as IncomeCount,
         SUM(CASE WHEN type = 'chi' THEN 1 ELSE 0 END) as ExpenseCount
       FROM CashTransactions 
       WHERE ${whereClause}`, params);
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
    async getCategories(storeId) {
        const results = await (0, db_1.query)(`SELECT DISTINCT category FROM CashTransactions 
       WHERE store_id = @storeId AND category IS NOT NULL
       ORDER BY category`, { storeId });
        return results.map(r => r.category);
    }
}
exports.CashTransactionRepository = CashTransactionRepository;
// Export singleton instance
exports.cashTransactionRepository = new CashTransactionRepository();
//# sourceMappingURL=cash-transaction-repository.js.map