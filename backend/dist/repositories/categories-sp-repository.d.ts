/**
 * Categories SP Repository
 *
 * Repository for category operations using stored procedures.
 * Implements CRUD operations via sp_Categories_* stored procedures.
 * Requirements: 9.1-9.4
 */
import { SPBaseRepository } from './sp-base-repository';
/**
 * Category entity interface
 */
export interface Category {
    id: string;
    storeId: string;
    name: string;
    description?: string;
    parentId?: string;
    createdAt?: string;
    updatedAt?: string;
}
/**
 * Input for creating a category via stored procedure
 */
export interface CreateCategorySPInput {
    id?: string;
    storeId: string;
    name: string;
    description?: string | null;
    parentId?: string | null;
}
/**
 * Input for updating a category via stored procedure
 */
export interface UpdateCategorySPInput {
    name?: string;
    description?: string | null;
    parentId?: string | null;
}
/**
 * Categories repository using stored procedures
 */
export declare class CategoriesSPRepository extends SPBaseRepository<Category> {
    protected tableName: string;
    /**
     * Map database record to Category entity
     */
    private mapToEntity;
    /**
     * Create a new category using sp_Categories_Create
     * Requirements: 9.1
     *
     * @param input - Category data to create
     * @returns Created category
     */
    create(input: CreateCategorySPInput): Promise<Category>;
    /**
     * Update a category using sp_Categories_Update
     * Requirements: 9.2
     *
     * @param id - Category ID
     * @param storeId - Store ID
     * @param data - Fields to update
     * @returns Updated category or null if not found
     */
    update(id: string, storeId: string, data: UpdateCategorySPInput): Promise<Category | null>;
    /**
     * Delete a category using sp_Categories_Delete
     * Requirements: 9.3
     *
     * @param id - Category ID
     * @param storeId - Store ID
     * @returns True if deleted, false if not found
     */
    delete(id: string, storeId: string): Promise<boolean>;
    /**
     * Get all categories for a store using sp_Categories_GetByStore
     * Requirements: 9.4
     *
     * @param storeId - Store ID
     * @returns Array of categories
     */
    getByStore(storeId: string): Promise<Category[]>;
    /**
     * Get a single category by ID
     *
     * @param id - Category ID
     * @param storeId - Store ID
     * @returns Category or null if not found
     */
    getById(id: string, storeId: string): Promise<Category | null>;
    /**
     * Find category by name within a store
     *
     * @param name - Category name
     * @param storeId - Store ID
     * @returns Category or null if not found
     */
    findByName(name: string, storeId: string): Promise<Category | null>;
    /**
     * Check if category name exists (for validation)
     *
     * @param name - Category name
     * @param storeId - Store ID
     * @param excludeId - Optional ID to exclude from check
     * @returns True if name exists
     */
    nameExists(name: string, storeId: string, excludeId?: string): Promise<boolean>;
    /**
     * Get root categories (categories without a parent)
     *
     * @param storeId - Store ID
     * @returns Array of root categories
     */
    getRootCategories(storeId: string): Promise<Category[]>;
    /**
     * Get child categories of a parent
     *
     * @param parentId - Parent category ID
     * @param storeId - Store ID
     * @returns Array of child categories
     */
    getChildCategories(parentId: string, storeId: string): Promise<Category[]>;
    /**
     * Get category tree (hierarchical structure)
     *
     * @param storeId - Store ID
     * @returns Array of root categories with nested children
     */
    getCategoryTree(storeId: string): Promise<(Category & {
        children: Category[];
    })[]>;
}
export declare const categoriesSPRepository: CategoriesSPRepository;
//# sourceMappingURL=categories-sp-repository.d.ts.map