/**
 * @deprecated This repository uses inline SQL queries.
 * For new code, use ProductsSPRepository from './products-sp-repository' which uses stored procedures.
 * This file is kept for backward compatibility and type exports.
 * Requirements: 1.1-1.5 - All product operations should use stored procedures.
 */
import { BaseRepository, QueryOptions } from './base-repository';
/**
 * Product entity interface (matches actual database schema)
 */
export interface Product {
    id: string;
    storeId: string;
    categoryId: string;
    name: string;
    description?: string;
    price: number;
    costPrice: number;
    sku?: string;
    stockQuantity: number;
    images?: string;
    status: 'active' | 'draft' | 'archived';
    createdAt?: string;
    updatedAt?: string;
}
/**
 * Product with additional info
 */
export interface ProductWithStock extends Product {
    currentStock: number;
    averageCost: number;
    categoryName?: string;
    unitName?: string;
}
/**
 * Product repository for managing products
 */
export declare class ProductRepository extends BaseRepository<Product> {
    constructor();
    /**
     * Map database record to Product entity
     */
    protected mapToEntity(record: Record<string, unknown>): Product;
    /**
     * Map Product entity to database record
     */
    protected mapToRecord(entity: Partial<Product>): Record<string, unknown>;
    /**
     * Find all products for a store
     */
    findAll(storeId: string, options?: QueryOptions): Promise<Product[]>;
    /**
     * Find product by ID
     */
    findById(id: string, storeId: string): Promise<Product | null>;
    /**
     * Find product by SKU within a store
     */
    findBySku(sku: string, storeId: string): Promise<Product | null>;
    /**
     * Find products by category within a store
     */
    findByCategory(categoryId: string, storeId: string, options?: QueryOptions): Promise<Product[]>;
    /**
     * Create a new product
     */
    create(entity: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>, storeId: string): Promise<Product>;
    /**
     * Update a product
     */
    update(id: string, entity: Partial<Product>, storeId: string): Promise<Product | null>;
    /**
     * Delete a product
     */
    delete(id: string, storeId: string): Promise<boolean>;
    /**
     * Get current stock for a product
     */
    getStock(productId: string, storeId: string): Promise<number>;
    /**
     * Update stock quantity
     */
    updateStock(productId: string, storeId: string, quantity: number): Promise<Product | null>;
    /**
     * Get products with low stock
     */
    getLowStockProducts(storeId: string, threshold?: number): Promise<Product[]>;
    /**
     * Search products by name or SKU
     */
    searchProducts(storeId: string, searchTerm: string): Promise<Product[]>;
    /**
     * Get product count by status
     */
    getCountByStatus(storeId: string): Promise<{
        active: number;
        draft: number;
        archived: number;
    }>;
}
export declare const productRepository: ProductRepository;
//# sourceMappingURL=product-repository.d.ts.map