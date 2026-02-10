/**
 * Products SP Repository
 *
 * Repository for product operations using stored procedures.
 * Implements CRUD operations via sp_Products_* stored procedures.
 */
import { SPBaseRepository } from './sp-base-repository';
import { Product, ProductWithStock } from './product-repository';
/**
 * Input for creating a product via stored procedure
 */
export interface CreateProductSPInput {
    id?: string;
    storeId: string;
    categoryId?: string | null;
    name: string;
    description?: string | null;
    price: number;
    costPrice: number;
    sku?: string | null;
    unitId?: string | null;
    stockQuantity?: number;
    status?: 'active' | 'draft' | 'archived';
    images?: string | null;
}
/**
 * Input for updating a product via stored procedure
 */
export interface UpdateProductSPInput {
    categoryId?: string | null;
    name?: string;
    description?: string | null;
    price?: number;
    costPrice?: number;
    sku?: string | null;
    unitId?: string | null;
    status?: 'active' | 'draft' | 'archived';
    images?: string | null;
}
/**
 * Products repository using stored procedures
 */
export declare class ProductsSPRepository extends SPBaseRepository<Product> {
    protected tableName: string;
    /**
     * Map database record to Product entity
     */
    private mapToEntity;
    /**
     * Create a new product using sp_Products_Create
     * Requirements: 1.1
     *
     * @param input - Product data to create
     * @returns Created product
     */
    create(input: CreateProductSPInput): Promise<ProductWithStock>;
    /**
     * Update a product using sp_Products_Update
     * Requirements: 1.2
     *
     * @param id - Product ID
     * @param storeId - Store ID
     * @param data - Fields to update
     * @returns Updated product or null if not found
     */
    update(id: string, storeId: string, data: UpdateProductSPInput): Promise<ProductWithStock | null>;
    /**
     * Delete (soft delete) a product using sp_Products_Delete
     * Requirements: 1.3
     *
     * @param id - Product ID
     * @param storeId - Store ID
     * @returns True if deleted, false if not found
     */
    delete(id: string, storeId: string): Promise<boolean>;
    /**
     * Get all products for a store using sp_Products_GetByStore
     * Requirements: 1.4
     *
     * @param storeId - Store ID
     * @param status - Optional status filter
     * @param categoryId - Optional category filter
     * @returns Array of products
     */
    getByStore(storeId: string, status?: string | null, categoryId?: string | null): Promise<ProductWithStock[]>;
    /**
     * Get a single product by ID using sp_Products_GetById
     * Requirements: 1.5
     *
     * @param id - Product ID
     * @param storeId - Store ID
     * @returns Product or null if not found
     */
    getById(id: string, storeId: string): Promise<ProductWithStock | null>;
    /**
     * Get active products for a store
     * Convenience method that filters by active status
     *
     * @param storeId - Store ID
     * @returns Array of active products
     */
    getActiveByStore(storeId: string): Promise<ProductWithStock[]>;
    /**
     * Get products by category
     * Convenience method that filters by category
     *
     * @param storeId - Store ID
     * @param categoryId - Category ID
     * @returns Array of products in the category
     */
    getByCategory(storeId: string, categoryId: string): Promise<ProductWithStock[]>;
}
export declare const productsSPRepository: ProductsSPRepository;
//# sourceMappingURL=products-sp-repository.d.ts.map