"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerRepository = exports.CustomerRepository = void 0;
/**
 * @deprecated This repository uses inline SQL queries.
 * For new code, use CustomersSPRepository from './customers-sp-repository' which uses stored procedures.
 * This file is kept for backward compatibility and type exports.
 * Requirements: 3.1-3.5 - All customer operations should use stored procedures.
 */
const db_1 = require("../db");
/**
 * Customer repository for managing customers
 */
class CustomerRepository {
    /**
     * Find all customers for a store
     */
    async findAll(storeId, options) {
        let queryString = `SELECT * FROM Customers WHERE store_id = @storeId`;
        if (options?.orderBy) {
            const direction = options.orderDirection || 'ASC';
            queryString += ` ORDER BY ${options.orderBy} ${direction}`;
        }
        else {
            queryString += ` ORDER BY full_name ASC`;
        }
        const results = await (0, db_1.query)(queryString, { storeId });
        return results.map((r) => ({
            id: r.id,
            storeId: r.store_id,
            name: r.full_name,
            email: r.email || undefined,
            phone: r.phone || undefined,
            address: r.address || undefined,
            status: r.status || 'active',
            loyaltyTier: r.loyalty_tier || undefined,
            customerType: r.customer_type || 'individual',
            customerGroup: r.customer_group || undefined,
            lifetimePoints: r.lifetime_points || 0,
            notes: r.notes || undefined,
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
        }));
    }
    /**
     * Find customer by ID
     */
    async findById(id, storeId) {
        const result = await (0, db_1.queryOne)(`SELECT * FROM Customers WHERE id = @id AND store_id = @storeId`, {
            id,
            storeId,
        });
        if (!result)
            return null;
        return {
            id: result.id,
            storeId: result.store_id,
            name: result.full_name,
            email: result.email || undefined,
            phone: result.phone || undefined,
            address: result.address || undefined,
            status: result.status || 'active',
            loyaltyTier: result.loyalty_tier || undefined,
            customerType: result.customer_type || 'individual',
            customerGroup: result.customer_group || undefined,
            lifetimePoints: result.lifetime_points || 0,
            notes: result.notes || undefined,
            createdAt: result.created_at
                ? result.created_at instanceof Date
                    ? result.created_at.toISOString()
                    : String(result.created_at)
                : undefined,
            updatedAt: result.updated_at
                ? result.updated_at instanceof Date
                    ? result.updated_at.toISOString()
                    : String(result.updated_at)
                : undefined,
        };
    }
    /**
     * Find customer by phone within a store
     */
    async findByPhone(phone, storeId) {
        const result = await (0, db_1.queryOne)(`SELECT * FROM Customers WHERE phone = @phone AND store_id = @storeId`, { phone, storeId });
        if (!result)
            return null;
        return {
            id: result.id,
            storeId: result.store_id,
            name: result.full_name,
            email: result.email || undefined,
            phone: result.phone || undefined,
            address: result.address || undefined,
        };
    }
    /**
     * Check if customer phone exists (for validation)
     */
    async phoneExists(phone, storeId, excludeId) {
        let queryString = `SELECT 1 FROM Customers WHERE phone = @phone AND store_id = @storeId`;
        const params = { phone, storeId };
        if (excludeId) {
            queryString += ` AND id != @excludeId`;
            params.excludeId = excludeId;
        }
        const result = await (0, db_1.queryOne)(queryString, params);
        return result !== null;
    }
    /**
     * Create a new customer
     */
    async create(entity, storeId) {
        const id = crypto.randomUUID();
        await (0, db_1.query)(`INSERT INTO Customers (id, store_id, full_name, email, phone, address, created_at, updated_at)
       VALUES (@id, @storeId, @name, @email, @phone, @address, GETDATE(), GETDATE())`, {
            id,
            storeId,
            name: entity.name,
            email: entity.email || null,
            phone: entity.phone || null,
            address: entity.address || null,
        });
        const created = await this.findById(id, storeId);
        if (!created) {
            throw new Error('Failed to create customer');
        }
        return created;
    }
    /**
     * Update a customer
     */
    async update(id, entity, storeId) {
        const existing = await this.findById(id, storeId);
        if (!existing) {
            throw new Error('Customer not found');
        }
        await (0, db_1.query)(`UPDATE Customers SET 
        full_name = @name, 
        email = @email, 
        phone = @phone, 
        address = @address,
        status = @status,
        loyalty_tier = @loyaltyTier,
        customer_type = @customerType,
        customer_group = @customerGroup,
        lifetime_points = @lifetimePoints,
        notes = @notes,
        updated_at = GETDATE()
       WHERE id = @id AND store_id = @storeId`, {
            id,
            storeId,
            name: entity.name ?? existing.name,
            email: entity.email ?? existing.email ?? null,
            phone: entity.phone ?? existing.phone ?? null,
            address: entity.address ?? existing.address ?? null,
            status: entity.status ?? existing.status ?? 'active',
            loyaltyTier: entity.loyaltyTier ?? existing.loyaltyTier ?? null,
            customerType: entity.customerType ?? existing.customerType ?? 'individual',
            customerGroup: entity.customerGroup ?? existing.customerGroup ?? null,
            lifetimePoints: entity.lifetimePoints ?? existing.lifetimePoints ?? 0,
            notes: entity.notes ?? existing.notes ?? null,
        });
        const updated = await this.findById(id, storeId);
        if (!updated) {
            throw new Error('Failed to update customer');
        }
        return updated;
    }
    /**
     * Delete a customer
     */
    async delete(id, storeId) {
        await (0, db_1.query)(`DELETE FROM Customers WHERE id = @id AND store_id = @storeId`, {
            id,
            storeId,
        });
        return true;
    }
    /**
     * Get all customers with debt information (simplified - no debt tracking in basic schema)
     */
    async findAllWithDebt(storeId, options) {
        const customers = await this.findAll(storeId, options);
        return customers.map((c) => ({
            ...c,
            totalSales: 0,
            totalPayments: 0,
            calculatedDebt: 0,
        }));
    }
    /**
     * Get debt info for a customer
     */
    async getDebtInfo(customerId, storeId) {
        // Get total sales for customer
        const salesResult = await (0, db_1.queryOne)(`SELECT COALESCE(SUM(total_amount), 0) as total 
       FROM Sales 
       WHERE customer_id = @customerId AND store_id = @storeId`, { customerId, storeId });
        // Get total payments for customer
        const paymentsResult = await (0, db_1.queryOne)(`SELECT COALESCE(SUM(amount), 0) as total 
       FROM Payments 
       WHERE customer_id = @customerId AND store_id = @storeId`, { customerId, storeId });
        // Get last payment date
        const lastPaymentResult = await (0, db_1.queryOne)(`SELECT TOP 1 payment_date 
       FROM Payments 
       WHERE customer_id = @customerId AND store_id = @storeId 
       ORDER BY payment_date DESC`, { customerId, storeId });
        const totalSales = salesResult?.total || 0;
        const totalPayments = paymentsResult?.total || 0;
        return {
            totalSales,
            totalPayments,
            currentDebt: totalSales - totalPayments,
            lastPaymentDate: lastPaymentResult?.payment_date
                ? lastPaymentResult.payment_date instanceof Date
                    ? lastPaymentResult.payment_date.toISOString()
                    : String(lastPaymentResult.payment_date)
                : undefined,
        };
    }
    /**
     * Get debt history for a customer
     */
    async getDebtHistory(customerId, storeId) {
        // Get sales
        const sales = await (0, db_1.query)(`SELECT id, total_amount, created_at 
       FROM Sales 
       WHERE customer_id = @customerId AND store_id = @storeId 
       ORDER BY created_at DESC`, { customerId, storeId });
        // Get payments
        const payments = await (0, db_1.query)(`SELECT id, amount, payment_date, notes 
       FROM Payments 
       WHERE customer_id = @customerId AND store_id = @storeId 
       ORDER BY payment_date DESC`, { customerId, storeId });
        // Combine and sort
        const history = [
            ...sales.map((s) => ({
                id: s.id,
                type: 'sale',
                amount: s.total_amount,
                date: s.created_at instanceof Date ? s.created_at.toISOString() : String(s.created_at),
                description: 'Đơn hàng',
            })),
            ...payments.map((p) => ({
                id: p.id,
                type: 'payment',
                amount: p.amount,
                date: p.payment_date instanceof Date ? p.payment_date.toISOString() : String(p.payment_date),
                description: p.notes || 'Thanh toán',
            })),
        ];
        // Sort by date descending
        history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return history;
    }
}
exports.CustomerRepository = CustomerRepository;
// Export singleton instance
exports.customerRepository = new CustomerRepository();
//# sourceMappingURL=customer-repository.js.map