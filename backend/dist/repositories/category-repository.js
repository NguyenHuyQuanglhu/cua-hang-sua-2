"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryRepository = exports.CategoryRepository = void 0;
/**
 * @deprecated This repository uses inline SQL queries.
 * For new code, use CategoriesSPRepository from './categories-sp-repository' which uses stored procedures.
 * This file is kept for backward compatibility and type exports.
 * Requirements: 9.1-9.4 - All category operations should use stored procedures.
 */
const db_1 = require("../db");
/**
 * Category repository for managing product categories
 */
class CategoryRepository {
    /**
     * Find all categories for a store
     */
    async findAll(storeId, options) {
        let queryString = `SELECT * FROM Categories WHERE store_id = @storeId`;
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
            description: r.description || undefined,
            parentId: r.parent_id || undefined,
        }));
    }
    /**
     * Find category by ID
     */
    async findById(id, storeId) {
        const result = await (0, db_1.queryOne)(`SELECT * FROM Categories WHERE id = @id AND store_id = @storeId`, {
            id,
            storeId,
        });
        if (!result)
            return null;
        return {
            id: result.id,
            storeId: result.store_id,
            name: result.name,
            description: result.description || undefined,
            parentId: result.parent_id || undefined,
        };
    }
    /**
     * Find category by name within a store
     */
    async findByName(name, storeId) {
        const result = await (0, db_1.queryOne)(`SELECT * FROM Categories WHERE name = @name AND store_id = @storeId`, { name, storeId });
        if (!result)
            return null;
        return {
            id: result.id,
            storeId: result.store_id,
            name: result.name,
            description: result.description || undefined,
            parentId: result.parent_id || undefined,
        };
    }
    /**
     * Check if category name exists (for validation)
     */
    async nameExists(name, storeId, excludeId) {
        let queryString = `SELECT 1 FROM Categories WHERE name = @name AND store_id = @storeId`;
        const params = { name, storeId };
        if (excludeId) {
            queryString += ` AND id != @excludeId`;
            params.excludeId = excludeId;
        }
        const result = await (0, db_1.queryOne)(queryString, params);
        return result !== null;
    }
    /**
     * Check if category is in use by any products
     */
    async isInUse(categoryId, storeId) {
        const result = await (0, db_1.queryOne)(`SELECT 1 FROM Products WHERE category_id = @categoryId AND store_id = @storeId`, { categoryId, storeId });
        return result !== null;
    }
    /**
     * Create a new category
     */
    async create(entity, storeId) {
        const id = crypto.randomUUID();
        await (0, db_1.query)(`INSERT INTO Categories (id, store_id, name, description, parent_id, created_at, updated_at)
       VALUES (@id, @storeId, @name, @description, @parentId, GETDATE(), GETDATE())`, {
            id,
            storeId,
            name: entity.name,
            description: entity.description || null,
            parentId: entity.parentId || null,
        });
        const created = await this.findById(id, storeId);
        if (!created) {
            throw new Error('Failed to create category');
        }
        return created;
    }
    /**
     * Update a category
     */
    async update(id, entity, storeId) {
        const existing = await this.findById(id, storeId);
        if (!existing) {
            throw new Error('Category not found');
        }
        await (0, db_1.query)(`UPDATE Categories SET name = @name, description = @description, updated_at = GETDATE()
       WHERE id = @id AND store_id = @storeId`, {
            id,
            storeId,
            name: entity.name ?? existing.name,
            description: entity.description ?? existing.description ?? null,
        });
        const updated = await this.findById(id, storeId);
        if (!updated) {
            throw new Error('Failed to update category');
        }
        return updated;
    }
    /**
     * Delete a category
     */
    async delete(id, storeId) {
        await (0, db_1.query)(`DELETE FROM Categories WHERE id = @id AND store_id = @storeId`, {
            id,
            storeId,
        });
        return true;
    }
    /**
     * Get all categories with product count
     */
    async findAllWithProductCount(storeId, options) {
        let queryString = `
      SELECT c.*, 
             (SELECT COUNT(*) FROM Products p WHERE p.category_id = c.id AND p.store_id = c.store_id) as product_count
      FROM Categories c
      WHERE c.store_id = @storeId
    `;
        if (options?.orderBy) {
            const direction = options.orderDirection || 'ASC';
            queryString += ` ORDER BY ${options.orderBy} ${direction}`;
        }
        else {
            queryString += ` ORDER BY c.name ASC`;
        }
        const results = await (0, db_1.query)(queryString, { storeId });
        return results.map((r) => ({
            id: r.id,
            storeId: r.store_id,
            name: r.name,
            description: r.description || undefined,
            parentId: r.parent_id || undefined,
            productCount: r.product_count,
        }));
    }
}
exports.CategoryRepository = CategoryRepository;
// Export singleton instance
exports.categoryRepository = new CategoryRepository();
//# sourceMappingURL=category-repository.js.map