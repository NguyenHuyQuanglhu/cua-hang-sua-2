"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.salesRepository = exports.SalesRepository = void 0;
/**
 * @deprecated This repository uses inline SQL queries.
 * For new code, use SalesSPRepository from './sales-sp-repository' which uses stored procedures.
 * This file is kept for backward compatibility and type exports.
 * Requirements: 2.1-2.5 - All sales operations should use stored procedures.
 */
const base_repository_1 = require("./base-repository");
const db_1 = require("../db");
/**
 * Sales repository for managing sales transactions
 */
class SalesRepository extends base_repository_1.BaseRepository {
    constructor() {
        super('Sales', 'id');
    }
    /**
     * Map database record to Sale entity
     */
    mapToEntity(record) {
        const r = record;
        return {
            id: r.id,
            storeId: r.store_id,
            invoiceNumber: r.invoice_number,
            customerId: r.customer_id || undefined,
            shiftId: r.shift_id || undefined,
            transactionDate: r.transaction_date
                ? r.transaction_date instanceof Date
                    ? r.transaction_date.toISOString()
                    : String(r.transaction_date)
                : new Date().toISOString(),
            status: r.status || 'pending',
            totalAmount: r.total_amount || 0,
            vatAmount: r.vat_amount || 0,
            finalAmount: r.final_amount || 0,
            discount: r.discount || 0,
            discountType: r.discount_type || undefined,
            discountValue: r.discount_value ?? undefined,
            tierDiscountPercentage: r.tier_discount_percentage ?? undefined,
            tierDiscountAmount: r.tier_discount_amount ?? undefined,
            pointsUsed: r.points_used || 0,
            pointsDiscount: r.points_discount || 0,
            customerPayment: r.customer_payment ?? undefined,
            previousDebt: r.previous_debt ?? undefined,
            remainingDebt: r.remaining_debt ?? undefined,
            createdAt: r.created_at
                ? r.created_at instanceof Date
                    ? r.created_at.toISOString()
                    : String(r.created_at)
                : undefined,
            updatedAt: r.updated_at
                ? r.updated_at instanceof Date
                    ? r.updated_at.toISOString()
                    : String(r.updated_at)
                : undefined,
        };
    }
    /**
     * Find all sales for a store
     */
    async findAll(storeId, options) {
        let queryString = `SELECT * FROM Sales WHERE store_id = @storeId`;
        if (options?.orderBy) {
            const direction = options.orderDirection || 'DESC';
            queryString += ` ORDER BY ${options.orderBy} ${direction}`;
        }
        else {
            queryString += ` ORDER BY transaction_date DESC`;
        }
        const results = await (0, db_1.query)(queryString, { storeId });
        return results.map((r) => this.mapToEntity(r));
    }
    /**
     * Find sale by ID
     */
    async findById(id, storeId) {
        const result = await (0, db_1.queryOne)(`SELECT * FROM Sales WHERE id = @id AND store_id = @storeId`, { id, storeId });
        return result ? this.mapToEntity(result) : null;
    }
    /**
     * Find sales by date range
     */
    async findByDateRange(storeId, dateFrom, dateTo) {
        const results = await (0, db_1.query)(`SELECT * FROM Sales 
       WHERE store_id = @storeId 
         AND transaction_date >= @dateFrom 
         AND transaction_date <= @dateTo
       ORDER BY transaction_date DESC`, { storeId, dateFrom, dateTo });
        return results.map((r) => this.mapToEntity(r));
    }
    /**
     * Find sales by customer
     */
    async findByCustomer(customerId, storeId) {
        const results = await (0, db_1.query)(`SELECT * FROM Sales 
       WHERE store_id = @storeId AND customer_id = @customerId
       ORDER BY transaction_date DESC`, { storeId, customerId });
        return results.map((r) => this.mapToEntity(r));
    }
    /**
     * Get sales items for a sale
     */
    async getSalesItems(salesId) {
        const results = await (0, db_1.query)(`SELECT * FROM SalesItems WHERE sales_transaction_id = @salesId`, { salesId });
        return results.map((r) => ({
            id: r.id,
            salesTransactionId: r.sales_transaction_id,
            productId: r.product_id,
            quantity: r.quantity,
            price: r.price,
        }));
    }
    /**
     * Create a new sale
     */
    async create(entity, storeId) {
        const id = crypto.randomUUID();
        const invoiceNumber = entity.invoiceNumber || `INV-${Date.now().toString(36).toUpperCase()}`;
        await (0, db_1.query)(`INSERT INTO Sales (
        id, store_id, invoice_number, customer_id, shift_id, transaction_date,
        status, total_amount, vat_amount, final_amount, discount, discount_type,
        discount_value, tier_discount_percentage, tier_discount_amount,
        points_used, points_discount, customer_payment, previous_debt, remaining_debt,
        created_at, updated_at
      ) VALUES (
        @id, @storeId, @invoiceNumber, @customerId, @shiftId, @transactionDate,
        @status, @totalAmount, @vatAmount, @finalAmount, @discount, @discountType,
        @discountValue, @tierDiscountPercentage, @tierDiscountAmount,
        @pointsUsed, @pointsDiscount, @customerPayment, @previousDebt, @remainingDebt,
        GETDATE(), GETDATE()
      )`, {
            id,
            storeId,
            invoiceNumber,
            customerId: entity.customerId || null,
            shiftId: entity.shiftId || null,
            transactionDate: new Date(entity.transactionDate),
            status: entity.status || 'pending',
            totalAmount: entity.totalAmount || 0,
            vatAmount: entity.vatAmount || 0,
            finalAmount: entity.finalAmount || 0,
            discount: entity.discount || 0,
            discountType: entity.discountType || null,
            discountValue: entity.discountValue ?? null,
            tierDiscountPercentage: entity.tierDiscountPercentage ?? null,
            tierDiscountAmount: entity.tierDiscountAmount ?? null,
            pointsUsed: entity.pointsUsed || 0,
            pointsDiscount: entity.pointsDiscount || 0,
            customerPayment: entity.customerPayment ?? null,
            previousDebt: entity.previousDebt ?? null,
            remainingDebt: entity.remainingDebt ?? null,
        });
        return this.findById(id, storeId);
    }
    /**
     * Add sales item
     */
    async addSalesItem(salesId, item) {
        const id = crypto.randomUUID();
        await (0, db_1.query)(`INSERT INTO SalesItems (id, sales_transaction_id, product_id, quantity, price, created_at)
       VALUES (@id, @salesId, @productId, @quantity, @price, GETDATE())`, {
            id,
            salesId,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
        });
        return {
            id,
            salesTransactionId: salesId,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
        };
    }
    /**
     * Delete a sale
     */
    async delete(id, storeId) {
        // Delete sales items first
        await (0, db_1.query)(`DELETE FROM SalesItems WHERE sales_transaction_id = @id`, {
            id,
        });
        // Delete sale
        await (0, db_1.query)(`DELETE FROM Sales WHERE id = @id AND store_id = @storeId`, {
            id,
            storeId,
        });
        return true;
    }
    /**
     * Get total revenue for a store
     */
    async getTotalRevenue(storeId, dateFrom, dateTo) {
        let queryString = `SELECT COALESCE(SUM(final_amount), 0) as total FROM Sales WHERE store_id = @storeId`;
        const params = { storeId };
        if (dateFrom) {
            queryString += ` AND transaction_date >= @dateFrom`;
            params.dateFrom = dateFrom;
        }
        if (dateTo) {
            queryString += ` AND transaction_date <= @dateTo`;
            params.dateTo = dateTo;
        }
        const result = await (0, db_1.queryOne)(queryString, params);
        return result?.total ?? 0;
    }
    /**
     * Get sales count for a store
     */
    async getSalesCount(storeId, dateFrom, dateTo) {
        let queryString = `SELECT COUNT(*) as count FROM Sales WHERE store_id = @storeId`;
        const params = { storeId };
        if (dateFrom) {
            queryString += ` AND transaction_date >= @dateFrom`;
            params.dateFrom = dateFrom;
        }
        if (dateTo) {
            queryString += ` AND transaction_date <= @dateTo`;
            params.dateTo = dateTo;
        }
        const result = await (0, db_1.queryOne)(queryString, params);
        return result?.count ?? 0;
    }
}
exports.SalesRepository = SalesRepository;
// Export singleton instance
exports.salesRepository = new SalesRepository();
//# sourceMappingURL=sales-repository.js.map