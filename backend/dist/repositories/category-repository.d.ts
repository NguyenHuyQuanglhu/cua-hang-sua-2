/**
 * Category entity interface
 */
export interface Category {
    id: string;
    storeId: string;
    name: string;
    description?: string;
    parentId?: string;
}
/**
 * Query options
 */
export interface QueryOptions {
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
}
/**
 * Category repository for managing product categories
 */
export declare class CategoryRepository {
    /**
     * Find all categories for a store
     */
    findAll(storeId: string, options?: QueryOptions): Promise<Category[]>;
    /**
     * Find category by ID
     */
    findById(id: string, storeId: string): Promise<Category | null>;
    /**
     * Find category by name within a store
     */
    findByName(name: string, storeId: string): Promise<Category | null>;
    /**
     * Check if category name exists (for validation)
     */
    nameExists(name: string, storeId: string, excludeId?: string): Promise<boolean>;
    /**
     * Check if category is in use by any products
     */
    isInUse(categoryId: string, storeId: string): Promise<boolean>;
    /**
     * Create a new category
     */
    create(entity: Omit<Category, 'id'>, storeId: string): Promise<Category>;
    /**
     * Update a category
     */
    update(id: string, entity: Partial<Category>, storeId: string): Promise<Category>;
    /**
     * Delete a category
     */
    delete(id: string, storeId: string): Promise<boolean>;
    /**
     * Get all categories with product count
     */
    findAllWithProductCount(storeId: string, options?: QueryOptions): Promise<(Category & {
        productCount: number;
    })[]>;
}
export declare const categoryRepository: CategoryRepository;
//# sourceMappingURL=category-repository.d.ts.map