"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supplierRepository = exports.SupplierRepository = void 0;
const db_1 = require("../db");
/**
 * Supplier repository for managing suppliers
 */
class SupplierRepository {
    /**
     * Find all suppliers for a store
     */
    async findAll(storeId, options) {
        let queryString = `SELECT * FROM Suppliers WHERE store_id = @storeId`;
        if (options?.orderBy) {
            const direction = options.orderDirection || 'ASC';
            queryString += ` ORDER BY ${options.orderBy} ${direction}`;
        }
        else {
            queryString += ` ORDER BY name ASC`;
        }
        const results = await (0, db_1.query)(queryString, { storeId });
        return results.map((r) => ({
            id: r.id,
            storeId: r.store_id,
            name: r.name,
            contactPerson: r.contact_person || undefined,
            email: r.email || undefined,
            phone: r.phone || undefined,
            address: r.address || undefined,
            taxCode: r.tax_code || undefined,
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
     * Find supplier by ID
     */
    async findById(id, storeId) {
        const result = await (0, db_1.queryOne)(`SELECT * FROM Suppliers WHERE id = @id AND store_id = @storeId`, {
            id,
            storeId,
        });
        if (!result)
            return null;
        return {
            id: result.id,
            storeId: result.store_id,
            name: result.name,
            contactPerson: result.contact_person || undefined,
            email: result.email || undefined,
            phone: result.phone || undefined,
            address: result.address || undefined,
            taxCode: result.tax_code || undefined,
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
     * Find supplier by name within a store
     */
    async findByName(name, storeId) {
        const result = await (0, db_1.queryOne)(`SELECT * FROM Suppliers WHERE name = @name AND store_id = @storeId`, { name, storeId });
        if (!result)
            return null;
        return {
            id: result.id,
            storeId: result.store_id,
            name: result.name,
            contactPerson: result.contact_person || undefined,
            email: result.email || undefined,
            phone: result.phone || undefined,
            address: result.address || undefined,
            taxCode: result.tax_code || undefined,
            notes: result.notes || undefined,
        };
    }
    /**
     * Check if supplier name exists (for validation)
     */
    async nameExists(name, storeId, excludeId) {
        let queryString = `SELECT 1 FROM Suppliers WHERE name = @name AND store_id = @storeId`;
        const params = { name, storeId };
        if (excludeId) {
            queryString += ` AND id != @excludeId`;
            params.excludeId = excludeId;
        }
        const result = await (0, db_1.queryOne)(queryString, params);
        return result !== null;
    }
    /**
     * Create a new supplier
     */
    async create(entity, storeId) {
        const id = crypto.randomUUID();
        await (0, db_1.query)(`INSERT INTO Suppliers (id, store_id, name, contact_person, email, phone, address, tax_code, notes, created_at, updated_at)
       VALUES (@id, @storeId, @name, @contactPerson, @email, @phone, @address, @taxCode, @notes, GETDATE(), GETDATE())`, {
            id,
            storeId,
            name: entity.name,
            contactPerson: entity.contactPerson || null,
            email: entity.email || null,
            phone: entity.phone || null,
            address: entity.address || null,
            taxCode: entity.taxCode || null,
            notes: entity.notes || null,
        });
        const created = await this.findById(id, storeId);
        if (!created) {
            throw new Error('Failed to create supplier');
        }
        return created;
    }
    /**
     * Update a supplier
     */
    async update(id, entity, storeId) {
        const existing = await this.findById(id, storeId);
        if (!existing) {
            throw new Error('Supplier not found');
        }
        await (0, db_1.query)(`UPDATE Suppliers SET 
        name = @name, 
        contact_person = @contactPerson, 
        email = @email, 
        phone = @phone, 
        address = @address,
        tax_code = @taxCode,
        notes = @notes,
        updated_at = GETDATE()
       WHERE id = @id AND store_id = @storeId`, {
            id,
            storeId,
            name: entity.name ?? existing.name,
            contactPerson: entity.contactPerson ?? existing.contactPerson ?? null,
            email: entity.email ?? existing.email ?? null,
            phone: entity.phone ?? existing.phone ?? null,
            address: entity.address ?? existing.address ?? null,
            taxCode: entity.taxCode ?? existing.taxCode ?? null,
            notes: entity.notes ?? existing.notes ?? null,
        });
        const updated = await this.findById(id, storeId);
        if (!updated) {
            throw new Error('Failed to update supplier');
        }
        return updated;
    }
    /**
     * Delete a supplier
     */
    async delete(id, storeId) {
        await (0, db_1.query)(`DELETE FROM Suppliers WHERE id = @id AND store_id = @storeId`, {
            id,
            storeId,
        });
        return true;
    }
    /**
     * Get all suppliers with debt information
     */
    async findAllWithDebt(storeId, options) {
        const suppliers = await this.findAll(storeId, options);
        // For now, return suppliers with zero debt (simplified)
        return suppliers.map((s) => ({
            ...s,
            totalPurchases: 0,
            totalPayments: 0,
            debt: 0,
        }));
    }
    /**
     * Get supplier debt information
     */
    async getDebtInfo(supplierId, storeId) {
        // Simplified - return zero debt for now
        return {
            totalPurchases: 0,
            totalPayments: 0,
            debt: 0,
        };
    }
    /**
     * Check if supplier is in use
     */
    async isInUse(supplierId, storeId) {
        // Check if supplier has any purchase orders
        const result = await (0, db_1.queryOne)(`SELECT COUNT(*) as count FROM PurchaseOrders WHERE supplier_id = @supplierId AND store_id = @storeId`, { supplierId, storeId });
        return (result?.count || 0) > 0;
    }
}
exports.SupplierRepository = SupplierRepository;
// Export singleton instance
exports.supplierRepository = new SupplierRepository();
//# sourceMappingURL=supplier-repository.js.map