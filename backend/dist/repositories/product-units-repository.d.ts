import { BaseRepository, QueryOptions } from './base-repository';
/**
 * ProductUnit entity interface
 */
export interface ProductUnit {
    id: string;
    productId: string;
    storeId: string;
    baseUnitId: string;
    conversionUnitId: string;
    conversionRate: number;
    baseUnitPrice: number;
    conversionUnitPrice: number;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}
/**
 * ProductUnit with unit names for display
 */
export interface ProductUnitWithNames extends ProductUnit {
    baseUnitName?: string;
    conversionUnitName?: string;
    productName?: string;
}
/**
 * ProductUnits repository for managing unit conversion configuration
 */
export declare class ProductUnitsRepository extends BaseRepository<ProductUnit> {
    constructor();
    /**
     * Map database record to ProductUnit entity
     */
    protected mapToEntity(record: Record<string, unknown>): ProductUnit;
    /**
     * Map ProductUnit entity to database record
     */
    protected mapToRecord(entity: Partial<ProductUnit>): Record<string, unknown>;
    /**
     * Find ProductUnit configuration by product ID
     */
    findByProduct(productId: string, storeId: string): Promise<ProductUnit | null>;
    /**
     * Find ProductUnit configuration by product ID with unit names
     */
    findByProductWithNames(productId: string, storeId: string): Promise<ProductUnitWithNames | null>;
    /**
     * Find all active ProductUnit configurations for a store
     */
    findAllActive(storeId: string, options?: QueryOptions): Promise<ProductUnit[]>;
    /**
     * Create a new ProductUnit configuration
     */
    create(entity: Omit<ProductUnit, 'id' | 'createdAt' | 'updatedAt'>, storeId: string): Promise<ProductUnit>;
    /**
     * Update an existing ProductUnit configuration
     */
    update(id: string, entity: Partial<ProductUnit>, storeId: string): Promise<ProductUnit | null>;
    /**
     * Delete a ProductUnit configuration
     */
    delete(id: string, storeId: string): Promise<boolean>;
    /**
     * Deactivate a ProductUnit configuration (soft delete)
     */
    deactivate(id: string, storeId: string): Promise<ProductUnit | null>;
    /**
     * Activate a ProductUnit configuration
     */
    activate(id: string, storeId: string): Promise<ProductUnit | null>;
    /**
     * Check if a product has unit conversion configured
     */
    hasUnitConversion(productId: string, storeId: string): Promise<boolean>;
    /**
     * Get all products with unit conversion configured
     */
    findAllProductsWithConversion(storeId: string): Promise<ProductUnitWithNames[]>;
}
export declare const productUnitsRepository: ProductUnitsRepository;
//# sourceMappingURL=product-units-repository.d.ts.map