"use strict";
/**
 * Categories SP Repository
 *
 * Repository for category operations using stored procedures.
 * Implements CRUD operations via sp_Categories_* stored procedures.
 * Requirements: 9.1-9.4
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoriesSPRepository = exports.CategoriesSPRepository = void 0;
const sp_base_repository_1 = require("./sp-base-repository");
/**
 * Categories repository using stored procedures
 */
class CategoriesSPRepository extends sp_base_repository_1.SPBaseRepository {
    tableName = 'Categories';
    /**
     * Map database record to Category entity
     */
    mapToEntity(record) {
        return {
            id: record.id,
            storeId: record.storeId,
            name: record.name,
            description: record.description || undefined,
            parentId: record.parentId || undefined,
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
        };
    }
    /**
     * Create a new category using sp_Categories_Create
     * Requirements: 9.1
     *
     * @param input - Category data to create
     * @returns Created category
     */
    async create(input) {
        const id = input.id || crypto.randomUUID();
        const params = {
            id,
            storeId: input.storeId,
            name: input.name,
            description: input.description || null,
            parentId: input.parentId || null,
        };
        // sp_Categories_Create returns the created category directly
        const result = await this.executeSPSingle('sp_Categories_Create', params);
        if (result) {
            return this.mapToEntity(result);
        }
        // Fallback: fetch by id (case-insensitive comparison)
        const category = await this.getById(id, input.storeId);
        if (!category) {
            throw new Error('Failed to create category');
        }
        return category;
    }
    /**
     * Update a category using sp_Categories_Update
     * Requirements: 9.2
     *
     * @param id - Category ID
     * @param storeId - Store ID
     * @param data - Fields to update
     * @returns Updated category or null if not found
     */
    async update(id, storeId, data) {
        const params = {
            id,
            storeId,
            name: data.name,
            description: data.description,
            parentId: data.parentId,
        };
        const result = await this.executeSPSingle('sp_Categories_Update', params);
        if (!result || result.AffectedRows === 0) {
            return null;
        }
        return this.getById(id, storeId);
    }
    /**
     * Delete a category using sp_Categories_Delete
     * Requirements: 9.3
     *
     * @param id - Category ID
     * @param storeId - Store ID
     * @returns True if deleted, false if not found
     */
    async delete(id, storeId) {
        const result = await this.executeSPSingle('sp_Categories_Delete', { id, storeId });
        return (result?.AffectedRows ?? 0) > 0;
    }
    /**
     * Get all categories for a store using sp_Categories_GetByStore
     * Requirements: 9.4
     *
     * @param storeId - Store ID
     * @returns Array of categories
     */
    async getByStore(storeId) {
        const params = {
            storeId,
        };
        const results = await this.executeSP('sp_Categories_GetByStore', params);
        return results.map((r) => this.mapToEntity(r));
    }
    /**
     * Get a single category by ID
     *
     * @param id - Category ID
     * @param storeId - Store ID
     * @returns Category or null if not found
     */
    async getById(id, storeId) {
        const categories = await this.getByStore(storeId);
        // Case-insensitive comparison since SQL Server returns UUIDs in uppercase
        return categories.find((c) => c.id.toLowerCase() === id.toLowerCase()) || null;
    }
    /**
     * Find category by name within a store
     *
     * @param name - Category name
     * @param storeId - Store ID
     * @returns Category or null if not found
     */
    async findByName(name, storeId) {
        const categories = await this.getByStore(storeId);
        return categories.find((c) => c.name.toLowerCase() === name.toLowerCase()) || null;
    }
    /**
     * Check if category name exists (for validation)
     *
     * @param name - Category name
     * @param storeId - Store ID
     * @param excludeId - Optional ID to exclude from check
     * @returns True if name exists
     */
    async nameExists(name, storeId, excludeId) {
        const categories = await this.getByStore(storeId);
        return categories.some((c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== excludeId);
    }
    /**
     * Get root categories (categories without a parent)
     *
     * @param storeId - Store ID
     * @returns Array of root categories
     */
    async getRootCategories(storeId) {
        const categories = await this.getByStore(storeId);
        return categories.filter((c) => !c.parentId);
    }
    /**
     * Get child categories of a parent
     *
     * @param parentId - Parent category ID
     * @param storeId - Store ID
     * @returns Array of child categories
     */
    async getChildCategories(parentId, storeId) {
        const categories = await this.getByStore(storeId);
        return categories.filter((c) => c.parentId === parentId);
    }
    /**
     * Get category tree (hierarchical structure)
     *
     * @param storeId - Store ID
     * @returns Array of root categories with nested children
     */
    async getCategoryTree(storeId) {
        const categories = await this.getByStore(storeId);
        const rootCategories = categories.filter((c) => !c.parentId);
        return rootCategories.map((root) => ({
            ...root,
            children: categories.filter((c) => c.parentId === root.id),
        }));
    }
}
exports.CategoriesSPRepository = CategoriesSPRepository;
// Export singleton instance
exports.categoriesSPRepository = new CategoriesSPRepository();
//# sourceMappingURL=categories-sp-repository.js.map