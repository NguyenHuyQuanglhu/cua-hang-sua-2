import { BaseRepository } from './base-repository';
/**
 * ProductInventory entity interface
 */
export interface ProductInventory {
    id: string;
    productId: string;
    storeId: string;
    unitId: string;
    quantity: number;
    createdAt: string;
    updatedAt: string;
}
/**
 * ProductInventory with product and unit information
 */
export interface ProductInventoryWithDetails extends ProductInventory {
    productName?: string;
    unitName?: string;
}
/**
 * ProductInventory repository for managing detailed inventory tracking
 */
export declare class ProductInventoryRepository extends BaseRepository<ProductInventory> {
    constructor();
    /**
     * Map database record to ProductInventory entity
     */
    protected mapToEntity(record: Record<string, unknown>): ProductInventory;
    /**
     * Map ProductInventory entity to database record
     */
    protected mapToRecord(entity: Partial<ProductInventory>): Record<string, unknown>;
    /**
     * Find inventory by product ID
     */
    findByProduct(productId: string, storeId: string, unitId?: string): Promise<ProductInventory | null>;
    /**
     * Find inventory by product ID with details
     */
    findByProductWithDetails(productId: string, storeId: string): Promise<ProductInventoryWithDetails[]>;
    /**
     * Get available quantity for a product in a specific unit
     * Returns total quantity available in the requested unit
     */
    getAvailableQuantity(productId: string, storeId: string, unitId: string): Promise<number>;
    /**
     * Update stock levels
     */
    updateStock(productId: string, storeId: string, unitId: string, quantity: number): Promise<ProductInventory>;
    /**
     * Deduct stock when selling
     */
    deductStock(productId: string, storeId: string, quantity: number, unitId: string): Promise<ProductInventory>;
    /**
     * Add stock (for purchase orders or adjustments)
     */
    addStock(productId: string, storeId: string, quantity: number, unitId: string): Promise<ProductInventory>;
    /**
     * Get all inventory records for a store
     */
    findAllByStore(storeId: string): Promise<ProductInventory[]>;
    /**
     * Get low stock products (quantity below threshold)
     */
    findLowStock(storeId: string, threshold?: number): Promise<ProductInventoryWithDetails[]>;
    /**
     * Get total inventory value for a store
     */
    getTotalInventoryValue(storeId: string): Promise<number>;
}
export declare const productInventoryRepository: ProductInventoryRepository;
//# sourceMappingURL=product-inventory-repository.d.ts.map