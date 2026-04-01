"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productRepository = exports.ProductRepository = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @deprecated This repository uses inline SQL queries.
 * For new code, use ProductsSPRepository from './products-sp-repository' which uses stored procedures.
 * This file is kept for backward compatibility and type exports.
 * Requirements: 1.1-1.5 - All product operations should use stored procedures.
 */
const base_repository_1 = require("./base-repository");
const db_1 = require("../db");
/**
 * Product repository for managing products
 */
class ProductRepository extends base_repository_1.BaseRepository {
    constructor() {
        super('Products', 'id');
    }
    /**
     * Map database record to Product entity
     */
    mapToEntity(record) {
        const r = record;
        return {
            id: r.id,
            storeId: r.store_id,
            categoryId: r.category_id,
            name: r.name,
            description: r.description || undefined,
            price: r.price || 0,
            costPrice: r.cost_price || 0,
            sku: r.sku || undefined,
            stockQuantity: r.stock_quantity || 0,
            images: r.images || undefined,
            status: r.status || 'active',
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
     * Map Product entity to database record
     */
    mapToRecord(entity) {
        const record = {};
        if (entity.id !== undefined)
            record.id = entity.id;
        if (entity.storeId !== undefined)
            record.store_id = entity.storeId;
        if (entity.categoryId !== undefined)
            record.category_id = entity.categoryId;
        if (entity.name !== undefined)
            record.name = entity.name;
        if (entity.description !== undefined)
            record.description = entity.description || null;
        if (entity.price !== undefined)
            record.price = entity.price;
        if (entity.costPrice !== undefined)
            record.cost_price = entity.costPrice;
        if (entity.sku !== undefined)
            record.sku = entity.sku || null;
        if (entity.stockQuantity !== undefined)
            record.stock_quantity = entity.stockQuantity;
        if (entity.images !== undefined)
            record.images = entity.images || null;
        if (entity.status !== undefined)
            record.status = entity.status;
        return record;
    }
    /**
     * Find all products for a store
     */
    async findAll(storeId, options) {
        let queryString = `SELECT * FROM Products WHERE store_id = @storeId`;
        if (options?.orderBy) {
            const direction = options.orderDirection || 'ASC';
            queryString += ` ORDER BY ${options.orderBy} ${direction}`;
        }
        else {
            queryString += ` ORDER BY name ASC`;
        }
        const results = await (0, db_1.query)(queryString, { storeId });
        return results.map((r) => this.mapToEntity(r));
    }
    /**
     * Find product by ID
     */
    async findById(id, storeId) {
        const result = await (0, db_1.queryOne)(`SELECT * FROM Products WHERE id = @id AND store_id = @storeId`, { id, storeId });
        return result ? this.mapToEntity(result) : null;
    }
    /**
     * Find product by SKU within a store
     */
    async findBySku(sku, storeId) {
        const result = await (0, db_1.queryOne)(`SELECT * FROM Products WHERE sku = @sku AND store_id = @storeId`, { sku, storeId });
        return result ? this.mapToEntity(result) : null;
    }
    /**
     * Find products by category within a store
     */
    async findByCategory(categoryId, storeId, options) {
        let queryString = `SELECT * FROM Products WHERE category_id = @categoryId AND store_id = @storeId`;
        if (options?.orderBy) {
            const direction = options.orderDirection || 'ASC';
            queryString += ` ORDER BY ${options.orderBy} ${direction}`;
        }
        else {
            queryString += ` ORDER BY name ASC`;
        }
        const results = await (0, db_1.query)(queryString, {
            categoryId,
            storeId,
        });
        return results.map((r) => this.mapToEntity(r));
    }
    /**
     * Create a new product
     */
    async create(entity, storeId) {
        const id = crypto.randomUUID();
        await (0, db_1.query)(`INSERT INTO Products (id, store_id, category_id, name, description, price, cost_price, sku, stock_quantity, images, status, created_at, updated_at)
       VALUES (@id, @storeId, @categoryId, @name, @description, @price, @costPrice, @sku, @stockQuantity, @images, @status, GETDATE(), GETDATE())`, {
            id,
            storeId,
            categoryId: entity.categoryId,
            name: entity.name,
            description: entity.description || null,
            price: entity.price || 0,
            costPrice: entity.costPrice || 0,
            sku: entity.sku || null,
            stockQuantity: entity.stockQuantity || 0,
            images: entity.images || null,
            status: entity.status || 'active',
        });
        return this.findById(id, storeId);
    }
    /**
     * Update a product
     */
    async update(id, entity, storeId) {
        const existing = await this.findById(id, storeId);
        if (!existing)
            return null;
        await (0, db_1.query)(`UPDATE Products SET 
        category_id = @categoryId,
        name = @name, 
        description = @description, 
        price = @price,
        cost_price = @costPrice,
        sku = @sku,
        stock_quantity = @stockQuantity,
        images = @images,
        status = @status,
        updated_at = GETDATE()
       WHERE id = @id AND store_id = @storeId`, {
            id,
            storeId,
            categoryId: entity.categoryId ?? existing.categoryId,
            name: entity.name ?? existing.name,
            description: entity.description ?? existing.description ?? null,
            price: entity.price ?? existing.price,
            costPrice: entity.costPrice ?? existing.costPrice,
            sku: entity.sku ?? existing.sku ?? null,
            stockQuantity: entity.stockQuantity ?? existing.stockQuantity,
            images: entity.images ?? existing.images ?? null,
            status: entity.status ?? existing.status,
        });
        return this.findById(id, storeId);
    }
    /**
     * Delete a product
     */
    async delete(id, storeId) {
        await (0, db_1.query)(`DELETE FROM Products WHERE id = @id AND store_id = @storeId`, {
            id,
            storeId,
        });
        return true;
    }
    /**
     * Get current stock for a product
     */
    async getStock(productId, storeId) {
        const product = await this.findById(productId, storeId);
        return product?.stockQuantity ?? 0;
    }
    /**
     * Update stock quantity
     */
    async updateStock(productId, storeId, quantity) {
        return this.update(productId, { stockQuantity: quantity }, storeId);
    }
    /**
     * Get products with low stock
     */
    async getLowStockProducts(storeId, threshold = 10) {
        const results = await (0, db_1.query)(`SELECT * FROM Products 
       WHERE store_id = @storeId AND status = 'active' AND stock_quantity <= @threshold
       ORDER BY stock_quantity ASC`, { storeId, threshold });
        return results.map((r) => this.mapToEntity(r));
    }
    /**
     * Search products by name or SKU
     */
    async searchProducts(storeId, searchTerm) {
        const results = await (0, db_1.query)(`SELECT * FROM Products 
       WHERE store_id = @storeId AND (name LIKE @search OR sku LIKE @search)
       ORDER BY name ASC`, { storeId, search: `%${searchTerm}%` });
        return results.map((r) => this.mapToEntity(r));
    }
    /**
     * Get product count by status
     */
    async getCountByStatus(storeId) {
        const results = await (0, db_1.query)(`SELECT status, COUNT(*) as count FROM Products WHERE store_id = @storeId GROUP BY status`, { storeId });
        const counts = { active: 0, draft: 0, archived: 0 };
        results.forEach((r) => {
            if (r.status === 'active')
                counts.active = r.count;
            else if (r.status === 'draft')
                counts.draft = r.count;
            else if (r.status === 'archived')
                counts.archived = r.count;
        });
        return counts;
    }
}
exports.ProductRepository = ProductRepository;
// Export singleton instance
exports.productRepository = new ProductRepository();
//# sourceMappingURL=product-repository.js.map