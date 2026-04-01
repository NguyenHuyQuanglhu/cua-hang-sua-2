"use strict";
/**
 * Inventory SP Repository
 *
 * Repository for inventory operations using stored procedures.
 * Implements inventory management via sp_Inventory_* stored procedures.
 * Requirements: 4.1-4.4
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventorySPRepository = exports.InventorySPRepository = void 0;
const sp_base_repository_1 = require("./sp-base-repository");
/**
 * Inventory repository using stored procedures
 */
class InventorySPRepository extends sp_base_repository_1.SPBaseRepository {
    tableName = 'ProductInventory';
    /**
     * Map database record to Inventory entity
     */
    mapToEntity(record) {
        return {
            id: record.Id,
            productId: record.ProductId,
            storeId: record.StoreId,
            unitId: record.UnitId,
            quantity: record.Quantity || 0,
            createdAt: record.CreatedAt
                ? record.CreatedAt instanceof Date
                    ? record.CreatedAt.toISOString()
                    : String(record.CreatedAt)
                : new Date().toISOString(),
            updatedAt: record.UpdatedAt
                ? record.UpdatedAt instanceof Date
                    ? record.UpdatedAt.toISOString()
                    : String(record.UpdatedAt)
                : new Date().toISOString(),
        };
    }
    /**
     * Get available quantity for a product using sp_Inventory_GetAvailable
     * Requirements: 4.1
     *
     * @param productId - Product ID
     * @param storeId - Store ID
     * @param unitId - Unit ID
     * @returns Available quantity (0 if not found)
     */
    async getAvailable(productId, storeId, unitId) {
        const params = {
            productId,
            storeId,
            unitId,
        };
        const result = await this.executeSPSingle('sp_Inventory_GetAvailable', params);
        return result?.availableQuantity ?? 0;
    }
    /**
     * Add inventory using sp_Inventory_Add (UPSERT logic)
     * Requirements: 4.2
     *
     * @param productId - Product ID
     * @param storeId - Store ID
     * @param unitId - Unit ID
     * @param quantity - Quantity to add
     * @returns New total quantity after addition
     */
    async add(productId, storeId, unitId, quantity) {
        const params = {
            productId,
            storeId,
            unitId,
            quantity,
        };
        const result = await this.executeSPSingle('sp_Inventory_Add', params);
        return result?.quantity ?? 0;
    }
    /**
     * Deduct inventory using sp_Inventory_Deduct with stock validation
     * Requirements: 4.3
     *
     * @param productId - Product ID
     * @param storeId - Store ID
     * @param unitId - Unit ID
     * @param quantity - Quantity to deduct
     * @returns New total quantity after deduction
     * @throws Error if insufficient stock
     */
    async deduct(productId, storeId, unitId, quantity) {
        const params = {
            productId,
            storeId,
            unitId,
            quantity,
        };
        const result = await this.executeSPSingle('sp_Inventory_Deduct', params);
        return result?.quantity ?? 0;
    }
    /**
     * Sync inventory from Products table using sp_Inventory_Sync (MERGE statement)
     * Requirements: 4.4
     *
     * @param storeId - Store ID
     * @returns Number of records synced
     */
    async sync(storeId) {
        const params = {
            storeId,
        };
        const result = await this.executeSPSingle('sp_Inventory_Sync', params);
        return result?.syncedCount ?? 0;
    }
    /**
     * Check if sufficient stock is available
     * Convenience method that checks available quantity against required
     *
     * @param productId - Product ID
     * @param storeId - Store ID
     * @param unitId - Unit ID
     * @param requiredQuantity - Required quantity
     * @returns True if sufficient stock available
     */
    async hasSufficientStock(productId, storeId, unitId, requiredQuantity) {
        const available = await this.getAvailable(productId, storeId, unitId);
        return available >= requiredQuantity;
    }
    /**
     * Add inventory within a transaction
     * Useful when adding inventory as part of a larger operation
     *
     * @param productId - Product ID
     * @param storeId - Store ID
     * @param unitId - Unit ID
     * @param quantity - Quantity to add
     * @returns New total quantity after addition
     */
    async addInTransaction(productId, storeId, unitId, quantity) {
        return this.withSPTransaction(async (helpers) => {
            const result = await helpers.executeSPSingle('sp_Inventory_Add', { productId, storeId, unitId, quantity });
            return result?.quantity ?? 0;
        });
    }
    /**
     * Deduct inventory within a transaction
     * Useful when deducting inventory as part of a larger operation
     *
     * @param productId - Product ID
     * @param storeId - Store ID
     * @param unitId - Unit ID
     * @param quantity - Quantity to deduct
     * @returns New total quantity after deduction
     * @throws Error if insufficient stock
     */
    async deductInTransaction(productId, storeId, unitId, quantity) {
        return this.withSPTransaction(async (helpers) => {
            const result = await helpers.executeSPSingle('sp_Inventory_Deduct', { productId, storeId, unitId, quantity });
            return result?.quantity ?? 0;
        });
    }
}
exports.InventorySPRepository = InventorySPRepository;
// Export singleton instance
exports.inventorySPRepository = new InventorySPRepository();
//# sourceMappingURL=inventory-sp-repository.js.map