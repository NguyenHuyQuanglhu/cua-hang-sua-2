"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productUnitsRepository = exports.ProductUnitsRepository = void 0;
const base_repository_1 = require("./base-repository");
const db_1 = require("../db");
/**
 * ProductUnits repository for managing unit conversion configuration
 */
class ProductUnitsRepository extends base_repository_1.BaseRepository {
    constructor() {
        super('ProductUnits', 'Id');
    }
    /**
     * Map database record to ProductUnit entity
     */
    mapToEntity(record) {
        const r = record;
        return {
            id: r.Id,
            productId: r.ProductId,
            storeId: r.StoreId,
            baseUnitId: r.BaseUnitId,
            conversionUnitId: r.ConversionUnitId,
            conversionRate: r.ConversionRate,
            baseUnitPrice: r.BaseUnitPrice || 0,
            conversionUnitPrice: r.ConversionUnitPrice || 0,
            isActive: r.IsActive ?? true,
            createdAt: r.CreatedAt
                ? r.CreatedAt instanceof Date
                    ? r.CreatedAt.toISOString()
                    : String(r.CreatedAt)
                : undefined,
            updatedAt: r.UpdatedAt
                ? r.UpdatedAt instanceof Date
                    ? r.UpdatedAt.toISOString()
                    : String(r.UpdatedAt)
                : undefined,
        };
    }
    /**
     * Map ProductUnit entity to database record
     */
    mapToRecord(entity) {
        const record = {};
        if (entity.id !== undefined)
            record.Id = entity.id;
        if (entity.productId !== undefined)
            record.ProductId = entity.productId;
        if (entity.storeId !== undefined)
            record.StoreId = entity.storeId;
        if (entity.baseUnitId !== undefined)
            record.BaseUnitId = entity.baseUnitId;
        if (entity.conversionUnitId !== undefined)
            record.ConversionUnitId = entity.conversionUnitId;
        if (entity.conversionRate !== undefined)
            record.ConversionRate = entity.conversionRate;
        if (entity.baseUnitPrice !== undefined)
            record.BaseUnitPrice = entity.baseUnitPrice;
        if (entity.conversionUnitPrice !== undefined)
            record.ConversionUnitPrice = entity.conversionUnitPrice;
        if (entity.isActive !== undefined)
            record.IsActive = entity.isActive;
        return record;
    }
    /**
     * Find ProductUnit configuration by product ID
     */
    async findByProduct(productId, storeId) {
        const result = await (0, db_1.queryOne)(`SELECT * FROM ProductUnits 
       WHERE ProductId = @productId AND StoreId = @storeId`, { productId, storeId });
        return result ? this.mapToEntity(result) : null;
    }
    /**
     * Find ProductUnit configuration by product ID with unit names
     */
    async findByProductWithNames(productId, storeId) {
        const result = await (0, db_1.queryOne)(`SELECT pu.*, 
              bu.Name as BaseUnitName, 
              cu.Name as ConversionUnitName,
              p.Name as ProductName
       FROM ProductUnits pu
       LEFT JOIN Units bu ON pu.BaseUnitId = bu.Id
       LEFT JOIN Units cu ON pu.ConversionUnitId = cu.Id
       LEFT JOIN Products p ON pu.ProductId = p.Id
       WHERE pu.ProductId = @productId AND pu.StoreId = @storeId`, { productId, storeId });
        if (!result)
            return null;
        return {
            ...this.mapToEntity(result),
            baseUnitName: result.BaseUnitName,
            conversionUnitName: result.ConversionUnitName,
            productName: result.ProductName,
        };
    }
    /**
     * Find all active ProductUnit configurations for a store
     */
    async findAllActive(storeId, options) {
        let queryString = `SELECT * FROM ProductUnits WHERE StoreId = @storeId AND IsActive = 1`;
        if (options?.orderBy) {
            const direction = options.orderDirection || 'ASC';
            queryString += ` ORDER BY ${options.orderBy} ${direction}`;
        }
        else {
            queryString += ` ORDER BY CreatedAt DESC`;
        }
        const results = await (0, db_1.query)(queryString, { storeId });
        return results.map((r) => this.mapToEntity(r));
    }
    /**
     * Create a new ProductUnit configuration
     */
    async create(entity, storeId) {
        // Check if configuration already exists for this product
        const existing = await this.findByProduct(entity.productId, storeId);
        if (existing) {
            throw new Error('Unit conversion configuration already exists for this product');
        }
        const id = crypto.randomUUID();
        await (0, db_1.query)(`INSERT INTO ProductUnits 
       (Id, ProductId, StoreId, BaseUnitId, ConversionUnitId, ConversionRate, 
        BaseUnitPrice, ConversionUnitPrice, IsActive, CreatedAt, UpdatedAt)
       VALUES (@id, @productId, @storeId, @baseUnitId, @conversionUnitId, @conversionRate,
               @baseUnitPrice, @conversionUnitPrice, @isActive, GETDATE(), GETDATE())`, {
            id,
            productId: entity.productId,
            storeId,
            baseUnitId: entity.baseUnitId,
            conversionUnitId: entity.conversionUnitId,
            conversionRate: entity.conversionRate,
            baseUnitPrice: entity.baseUnitPrice,
            conversionUnitPrice: entity.conversionUnitPrice,
            isActive: entity.isActive ?? true,
        });
        return this.findByProduct(entity.productId, storeId);
    }
    /**
     * Update an existing ProductUnit configuration
     */
    async update(id, entity, storeId) {
        const existing = await (0, db_1.queryOne)(`SELECT * FROM ProductUnits WHERE Id = @id AND StoreId = @storeId`, { id, storeId });
        if (!existing)
            return null;
        const mapped = this.mapToEntity(existing);
        await (0, db_1.query)(`UPDATE ProductUnits SET 
        BaseUnitId = @baseUnitId,
        ConversionUnitId = @conversionUnitId,
        ConversionRate = @conversionRate,
        BaseUnitPrice = @baseUnitPrice,
        ConversionUnitPrice = @conversionUnitPrice,
        IsActive = @isActive,
        UpdatedAt = GETDATE()
       WHERE Id = @id AND StoreId = @storeId`, {
            id,
            storeId,
            baseUnitId: entity.baseUnitId ?? mapped.baseUnitId,
            conversionUnitId: entity.conversionUnitId ?? mapped.conversionUnitId,
            conversionRate: entity.conversionRate ?? mapped.conversionRate,
            baseUnitPrice: entity.baseUnitPrice ?? mapped.baseUnitPrice,
            conversionUnitPrice: entity.conversionUnitPrice ?? mapped.conversionUnitPrice,
            isActive: entity.isActive ?? mapped.isActive,
        });
        return (0, db_1.queryOne)(`SELECT * FROM ProductUnits WHERE Id = @id AND StoreId = @storeId`, { id, storeId }).then((r) => (r ? this.mapToEntity(r) : null));
    }
    /**
     * Delete a ProductUnit configuration
     */
    async delete(id, storeId) {
        await (0, db_1.query)(`DELETE FROM ProductUnits WHERE Id = @id AND StoreId = @storeId`, { id, storeId });
        return true;
    }
    /**
     * Deactivate a ProductUnit configuration (soft delete)
     */
    async deactivate(id, storeId) {
        return this.update(id, { isActive: false }, storeId);
    }
    /**
     * Activate a ProductUnit configuration
     */
    async activate(id, storeId) {
        return this.update(id, { isActive: true }, storeId);
    }
    /**
     * Check if a product has unit conversion configured
     */
    async hasUnitConversion(productId, storeId) {
        const result = await (0, db_1.queryOne)(`SELECT COUNT(*) as count FROM ProductUnits 
       WHERE ProductId = @productId AND StoreId = @storeId AND IsActive = 1`, { productId, storeId });
        return (result?.count ?? 0) > 0;
    }
    /**
     * Get all products with unit conversion configured
     */
    async findAllProductsWithConversion(storeId) {
        const results = await (0, db_1.query)(`SELECT pu.*, 
              bu.Name as BaseUnitName, 
              cu.Name as ConversionUnitName,
              p.Name as ProductName
       FROM ProductUnits pu
       LEFT JOIN Units bu ON pu.BaseUnitId = bu.Id
       LEFT JOIN Units cu ON pu.ConversionUnitId = cu.Id
       LEFT JOIN Products p ON pu.ProductId = p.Id
       WHERE pu.StoreId = @storeId AND pu.IsActive = 1
       ORDER BY p.Name ASC`, { storeId });
        return results.map((r) => ({
            ...this.mapToEntity(r),
            baseUnitName: r.BaseUnitName,
            conversionUnitName: r.ConversionUnitName,
            productName: r.ProductName,
        }));
    }
}
exports.ProductUnitsRepository = ProductUnitsRepository;
// Export singleton instance
exports.productUnitsRepository = new ProductUnitsRepository();
//# sourceMappingURL=product-units-repository.js.map