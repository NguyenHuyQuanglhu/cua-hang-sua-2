"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentRepository = exports.PaymentRepository = void 0;
const base_repository_1 = require("./base-repository");
const db_1 = require("../db");
/**
 * Payment repository for managing customer payments
 */
class PaymentRepository extends base_repository_1.BaseRepository {
    constructor() {
        super('Payments', 'id');
    }
    /**
     * Map database record to Payment entity
     */
    mapToEntity(record) {
        const r = record;
        return {
            id: r.id,
            storeId: r.store_id,
            customerId: r.customer_id,
            paymentDate: r.payment_date
                ? r.payment_date instanceof Date
                    ? r.payment_date.toISOString()
                    : String(r.payment_date)
                : new Date().toISOString(),
            amount: r.amount || 0,
            notes: r.notes || undefined,
            createdAt: r.created_at
                ? r.created_at instanceof Date
                    ? r.created_at.toISOString()
                    : String(r.created_at)
                : undefined,
        };
    }
    /**
     * Find all payments for a store
     */
    async findAll(storeId, options) {
        let queryString = `SELECT * FROM Payments WHERE store_id = @storeId`;
        if (options?.orderBy) {
            const direction = options.orderDirection || 'DESC';
            queryString += ` ORDER BY ${options.orderBy} ${direction}`;
        }
        else {
            queryString += ` ORDER BY payment_date DESC`;
        }
        const results = await (0, db_1.query)(queryString, { storeId });
        return results.map((r) => this.mapToEntity(r));
    }
    /**
     * Find payment by ID
     */
    async findById(id, storeId) {
        const result = await (0, db_1.queryOne)(`SELECT * FROM Payments WHERE id = @id AND store_id = @storeId`, { id, storeId });
        return result ? this.mapToEntity(result) : null;
    }
    /**
     * Find payments by customer
     */
    async findByCustomer(customerId, storeId) {
        const results = await (0, db_1.query)(`SELECT * FROM Payments 
       WHERE store_id = @storeId AND customer_id = @customerId
       ORDER BY payment_date DESC`, { storeId, customerId });
        return results.map((r) => this.mapToEntity(r));
    }
    /**
     * Find payments by date range
     */
    async findByDateRange(storeId, dateFrom, dateTo) {
        const results = await (0, db_1.query)(`SELECT * FROM Payments 
       WHERE store_id = @storeId 
         AND payment_date >= @dateFrom 
         AND payment_date <= @dateTo
       ORDER BY payment_date DESC`, { storeId, dateFrom, dateTo });
        return results.map((r) => this.mapToEntity(r));
    }
    /**
     * Create a new payment
     */
    async create(entity, storeId) {
        const id = crypto.randomUUID();
        await (0, db_1.query)(`INSERT INTO Payments (id, store_id, customer_id, payment_date, amount, notes, created_at)
       VALUES (@id, @storeId, @customerId, @paymentDate, @amount, @notes, GETDATE())`, {
            id,
            storeId,
            customerId: entity.customerId,
            paymentDate: new Date(entity.paymentDate),
            amount: entity.amount,
            notes: entity.notes || null,
        });
        return this.findById(id, storeId);
    }
    /**
     * Delete a payment
     */
    async delete(id, storeId) {
        await (0, db_1.query)(`DELETE FROM Payments WHERE id = @id AND store_id = @storeId`, {
            id,
            storeId,
        });
        return true;
    }
    /**
     * Get total payments for a customer
     */
    async getTotalPaymentsByCustomer(customerId, storeId) {
        const result = await (0, db_1.queryOne)(`SELECT COALESCE(SUM(amount), 0) as total FROM Payments 
       WHERE store_id = @storeId AND customer_id = @customerId`, { storeId, customerId });
        return result?.total ?? 0;
    }
    /**
     * Get total payments for a store
     */
    async getTotalPayments(storeId, dateFrom, dateTo) {
        let queryString = `SELECT COALESCE(SUM(amount), 0) as total FROM Payments WHERE store_id = @storeId`;
        const params = { storeId };
        if (dateFrom) {
            queryString += ` AND payment_date >= @dateFrom`;
            params.dateFrom = dateFrom;
        }
        if (dateTo) {
            queryString += ` AND payment_date <= @dateTo`;
            params.dateTo = dateTo;
        }
        const result = await (0, db_1.queryOne)(queryString, params);
        return result?.total ?? 0;
    }
}
exports.PaymentRepository = PaymentRepository;
// Export singleton instance
exports.paymentRepository = new PaymentRepository();
//# sourceMappingURL=payment-repository.js.map