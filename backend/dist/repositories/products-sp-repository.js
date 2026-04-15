"use strict";
/**
 * Products SP Repository
 *
 * Repository for product operations using stored procedures.
 * Implements CRUD operations via sp_Products_* stored procedures.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.productsSPRepository = exports.ProductsSPRepository = void 0;
const sp_base_repository_1 = require("./sp-base-repository");
/**
 * Products repository using stored procedures
 */
class ProductsSPRepository extends sp_base_repository_1.SPBaseRepository {
    tableName = 'Products';
    /**
     * Map database record to Product entity
     */
    mapToEntity(record) {
        return {
            id: record.id,
            storeId: record.storeId,
            categoryId: record.categoryId || '',
            name: record.name,
            description: record.description || undefined,
            price: record.price || 0,
            costPrice: record.costPrice || 0,
            sku: record.sku || undefined,
            stockQuantity: record.stockQuantity || 0,
            images: record.images || undefined,
            status: record.status || 'active',
            createdAt: record.createdAt
                ? record.createdAt instanceof Date
                    ? record.createdAt.toISOString()
                    : String(record.createdAt)
                : undefined,
            updatedAt: record.updatedAt
                ? record.updatedAt instanceof Date
                    ? record.updatedAt.toISOString()
                    : String(record.updatedAt)
                : undefined,
            // Extended fields
            currentStock: record.currentStock ?? record.stockQuantity ?? 0,
            averageCost: record.costPrice || 0,
            categoryName: record.categoryName,
            unitName: record.unitName,
            unitId: record.unitId,
            avgCostByUnit: record.avgCostByUnit, // Pass through JSON string
        };
    }
    /**
     * Create a new product using sp_Products_Create
     * Requirements: 1.1
     *
     * @param input - Product data to create
     * @returns Created product
     */
    async create(input) {
        const id = input.id || crypto.randomUUID();
        const params = {
            id,
            storeId: input.storeId,
            categoryId: input.categoryId || null,
            name: input.name,
            description: input.description || null,
            price: input.price,
            costPrice: input.costPrice,
            sku: input.sku || null,
            unitId: input.unitId || null,
            stockQuantity: input.stockQuantity ?? 0,
            status: input.status || 'active',
            images: input.images || null,
        };
        // sp_Products_Create returns the created product directly
        const result = await this.executeSPSingle('sp_Products_Create', params);
        if (result) {
            return this.mapToEntity(result);
        }
        // Fallback: fetch by id
        const product = await this.getById(id, input.storeId);
        if (!product) {
            throw new Error('Failed to create product');
        }
        return product;
    }
    /**
     * Update a product using sp_Products_Update
     * Requirements: 1.2
     *
     * @param id - Product ID
     * @param storeId - Store ID
     * @param data - Fields to update
     * @returns Updated product or null if not found
     */
    async update(id, storeId, data) {
        const params = {
            id,
            storeId,
            categoryId: data.categoryId,
            name: data.name,
            description: data.description,
            price: data.price,
            costPrice: data.costPrice,
            sku: data.sku,
            unitId: data.unitId,
            status: data.status,
            images: data.images,
        };
        // sp_Products_Update returns the updated product, not AffectedRows
        const result = await this.executeSPSingle('sp_Products_Update', params);
        if (!result) {
            return null;
        }
        return this.mapToEntity(result);
    }
    /**
     * Delete (soft delete) a product using sp_Products_Delete
     * Requirements: 1.3
     *
     * @param id - Product ID
     * @param storeId - Store ID
     * @returns True if deleted, false if not found
     */
    async delete(id, storeId) {
        const result = await this.executeSPSingle('sp_Products_Delete', { id, storeId });
        return (result?.AffectedRows ?? 0) > 0;
    }
    /**
     * Get all products for a store using sp_Products_GetByStore
     * Requirements: 1.4
     *
     * @param storeId - Store ID
     * @param status - Optional status filter
     * @param categoryId - Optional category filter
     * @returns Array of products
     */
    async getByStore(storeId, status, categoryId) {
        const params = {
            storeId,
            status: status || null,
            categoryId: categoryId || null,
        };
        const results = await this.executeSP('sp_Products_GetByStore', params);
        return results.map((r) => this.mapToEntity(r));
    }
    /**
     * Get a single product by ID using sp_Products_GetById
     * Requirements: 1.5
     *
     * @param id - Product ID
     * @param storeId - Store ID
     * @returns Product or null if not found
     */
    async getById(id, storeId) {
        const result = await this.executeSPSingle('sp_Products_GetById', { id, storeId });
        return result ? this.mapToEntity(result) : null;
    }
    /**
     * Get active products for a store
     * Convenience method that filters by active status
     *
     * @param storeId - Store ID
     * @returns Array of active products
     */
    async getActiveByStore(storeId) {
        return this.getByStore(storeId, 'active');
    }
    /**
     * Get products by category
     * Convenience method that filters by category
     *
     * @param storeId - Store ID
     * @param categoryId - Category ID
     * @returns Array of products in the category
     */
    async getByCategory(storeId, categoryId) {
        return this.getByStore(storeId, null, categoryId);
    }
}
exports.ProductsSPRepository = ProductsSPRepository;
// Export singleton instance
exports.productsSPRepository = new ProductsSPRepository();
//# sourceMappingURL=products-sp-repository.js.map