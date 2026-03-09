"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productInventoryRepository = exports.ProductInventoryRepository = void 0;
const base_repository_1 = require("./base-repository");
const db_1 = require("../db");
/**
 * ProductInventory repository for managing detailed inventory tracking
 */
class ProductInventoryRepository extends base_repository_1.BaseRepository {
    constructor() {
        super('ProductInventory', 'Id');
    }
    /**
     * Map database record to ProductInventory entity
     */
    mapToEntity(record) {
        const r = record;
        return {
            id: r.Id,
            productId: r.ProductId,
            storeId: r.StoreId,
            unitId: r.UnitId,
            quantity: r.Quantity || 0,
            createdAt: r.CreatedAt
                ? r.CreatedAt instanceof Date
                    ? r.CreatedAt.toISOString()
                    : String(r.CreatedAt)
                : new Date().toISOString(),
            updatedAt: r.UpdatedAt
                ? r.UpdatedAt instanceof Date
                    ? r.UpdatedAt.toISOString()
                    : String(r.UpdatedAt)
                : new Date().toISOString(),
        };
    }
    /**
     * Map ProductInventory entity to database record
     */
    mapToRecord(entity) {
        const record = {};
        if (entity.id !== undefined)
            record.Id = entity.id;
        if (entity.productId !== undefined)
            record.ProductId = entity.productId;
        if (entity.storeId !== undefined)
            record.StoreId = entity.storeId;
        if (entity.unitId !== undefined)
            record.UnitId = entity.unitId;
        if (entity.quantity !== undefined)
            record.Quantity = entity.quantity;
        return record;
    }
    /**
     * Find inventory by product ID
     */
    async findByProduct(productId, storeId, unitId) {
        let sql = `SELECT * FROM ProductInventory 
       WHERE ProductId = @productId AND StoreId = @storeId`;
        const params = { productId, storeId };
        if (unitId) {
            sql += ` AND UnitId = @unitId`;
            params.unitId = unitId;
        }
        const result = await (0, db_1.queryOne)(sql, params);
        return result ? this.mapToEntity(result) : null;
    }
    /**
     * Find inventory by product ID with details
     */
    async findByProductWithDetails(productId, storeId) {
        const results = await (0, db_1.query)(`SELECT pi.*, 
              p.Name as ProductName,
              u.Name as UnitName
       FROM ProductInventory pi
       LEFT JOIN Products p ON pi.ProductId = p.Id
       LEFT JOIN Units u ON pi.UnitId = u.Id
       WHERE pi.ProductId = @productId AND pi.StoreId = @storeId`, { productId, storeId });
        return results.map((r) => ({
            ...this.mapToEntity(r),
            productName: r.ProductName,
            unitName: r.UnitName,
        }));
    }
    /**
     * Get available quantity for a product in a specific unit
     * Returns total quantity available in the requested unit
     */
    async getAvailableQuantity(productId, storeId, unitId) {
        // Get inventory for this product, store, and unit
        const result = await (0, db_1.queryOne)(`SELECT Quantity FROM ProductInventory 
       WHERE ProductId = @productId AND StoreId = @storeId AND UnitId = @unitId`, { productId, storeId, unitId });
        return result?.Quantity ?? 0;
    }
    /**
     * Update stock levels
     */
    async updateStock(productId, storeId, unitId, quantity) {
        const existing = await this.findByProduct(productId, storeId, unitId);
        if (existing) {
            // Update existing record
            await (0, db_1.query)(`UPDATE ProductInventory SET 
          Quantity = @quantity,
          UpdatedAt = GETDATE()
         WHERE ProductId = @productId AND StoreId = @storeId AND UnitId = @unitId`, {
                productId,
                storeId,
                unitId,
                quantity,
            });
        }
        else {
            // Create new record
            const id = crypto.randomUUID();
            await (0, db_1.query)(`INSERT INTO ProductInventory 
         (Id, ProductId, StoreId, UnitId, Quantity, CreatedAt, UpdatedAt)
         VALUES (@id, @productId, @storeId, @unitId, @quantity, GETDATE(), GETDATE())`, {
                id,
                productId,
                storeId,
                unitId,
                quantity,
            });
        }
        return this.findByProduct(productId, storeId, unitId);
    }
    /**
     * Deduct stock when selling
     */
    async deductStock(productId, storeId, quantity, unitId) {
        const inventory = await this.findByProduct(productId, storeId, unitId);
        if (!inventory) {
            throw new Error('Product inventory not found');
        }
        const newQuantity = inventory.quantity - quantity;
        if (newQuantity < 0) {
            throw new Error('Insufficient stock');
        }
        return this.updateStock(productId, storeId, unitId, newQuantity);
    }
    /**
     * Add stock (for purchase orders or adjustments)
     */
    async addStock(productId, storeId, quantity, unitId) {
        const inventory = await this.findByProduct(productId, storeId, unitId);
        if (!inventory) {
            // Create new inventory record
            return this.updateStock(productId, storeId, unitId, quantity);
        }
        const newQuantity = inventory.quantity + quantity;
        return this.updateStock(productId, storeId, unitId, newQuantity);
    }
    /**
     * Get all inventory records for a store
     */
    async findAllByStore(storeId) {
        const results = await (0, db_1.query)(`SELECT * FROM ProductInventory WHERE StoreId = @storeId ORDER BY UpdatedAt DESC`, { storeId });
        return results.map((r) => this.mapToEntity(r));
    }
    /**
     * Get low stock products (quantity below threshold)
     */
    async findLowStock(storeId, threshold = 10) {
        const results = await (0, db_1.query)(`SELECT pi.*, 
              p.Name as ProductName,
              u.Name as UnitName
       FROM ProductInventory pi
       LEFT JOIN Products p ON pi.ProductId = p.Id
       LEFT JOIN Units u ON pi.UnitId = u.Id
       WHERE pi.StoreId = @storeId AND pi.Quantity <= @threshold
       ORDER BY pi.Quantity ASC`, { storeId, threshold });
        return results.map((r) => ({
            ...this.mapToEntity(r),
            productName: r.ProductName,
            unitName: r.UnitName,
        }));
    }
    /**
     * Get total inventory value for a store
     */
    async getTotalInventoryValue(storeId) {
        const result = await (0, db_1.queryOne)(`SELECT SUM(pi.Quantity * p.cost_price) as total
       FROM ProductInventory pi
       LEFT JOIN Products p ON pi.ProductId = p.Id
       WHERE pi.StoreId = @storeId`, { storeId });
        return result?.total ?? 0;
    }
}
exports.ProductInventoryRepository = ProductInventoryRepository;
// Export singleton instance
exports.productInventoryRepository = new ProductInventoryRepository();
//# sourceMappingURL=product-inventory-repository.js.map