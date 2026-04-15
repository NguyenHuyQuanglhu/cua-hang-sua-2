import { ProductInventory } from '../repositories/product-inventory-repository';
import { UnitConversionLog } from '../repositories/unit-conversion-log-repository';
/**
 * Result of inventory deduction operation
 */
export interface DeductInventoryResult {
    success: boolean;
    inventory: ProductInventory;
    conversions: UnitConversionLog[];
}
/**
 * Inventory display information
 */
export interface InventoryDisplayInfo {
    conversionUnitStock: number;
    baseUnitStock: number;
    displayText: string;
    totalInBaseUnit: number;
    conversionUnitName?: string;
    baseUnitName?: string;
}
/**
 * Insufficient stock error
 */
export declare class InsufficientStockError extends Error {
    productId: string;
    requestedQuantity: number;
    availableQuantity: number;
    unitId: string;
    constructor(message: string, productId: string, requestedQuantity: number, availableQuantity: number, unitId: string);
}
/**
 * Inventory Service
 * Handles inventory management with automatic unit conversion
 */
export declare class InventoryService {
    /**
     * Check available quantity for a product in a specific unit
     * Returns total quantity available in the requested unit
     * Uses sp_Inventory_GetAvailable stored procedure
     * Requirements: 4.1
     */
    checkAvailableQuantity(productId: string, storeId: string, unitId: string): Promise<number>;
    /**
     * Deduct inventory when selling
     * Uses sp_Inventory_Deduct stored procedure with stock validation
     * Requirements: 4.3
     */
    deductInventory(productId: string, storeId: string, quantity: number, unitId: string, salesTransactionId?: string): Promise<DeductInventoryResult>;
    /**
     * Perform automatic unit conversion
     * Converts base units to conversion units when threshold is reached
     * Note: This method is deprecated and kept for backward compatibility
     * The new model uses quantity per unit instead of baseUnitStock/conversionUnitStock
     */
    private performAutoConversion;
    /**
     * Get inventory display text
     * Returns formatted string like "21 Thùng + 3 Hộp" or "21 Thùng"
     */
    getInventoryDisplay(productId: string, storeId: string): Promise<InventoryDisplayInfo>;
    /**
     * Restore inventory when cancelling a sale
     * Reverses the deduction operation
     */
    restoreInventory(productId: string, storeId: string, quantity: number, unitId: string): Promise<ProductInventory>;
    /**
     * Add inventory (for purchase orders or manual adjustments)
     * Uses sp_Inventory_Add stored procedure with UPSERT logic
     * Requirements: 4.2
     */
    addInventory(productId: string, storeId: string, quantity: number, unitId: string, notes?: string): Promise<ProductInventory>;
    /**
     * Manual inventory adjustment with conversion log
     * Note: This method uses the new model with quantity per unit
     */
    adjustInventory(productId: string, storeId: string, newConversionStock: number, newBaseStock: number, reason: string): Promise<{
        inventory: ProductInventory;
        log: UnitConversionLog;
    }>;
    /**
     * Get low stock products
     */
    getLowStockProducts(storeId: string, threshold?: number): Promise<ProductInventory[]>;
    /**
     * Initialize inventory for a product
     * Creates inventory record if it doesn't exist
     */
    initializeInventory(productId: string, storeId: string, initialStock?: number, unitId?: string): Promise<ProductInventory>;
    /**
     * Sync inventory from Products.stock_quantity to ProductInventory
     * Uses sp_Inventory_Sync stored procedure with MERGE statement
     * Requirements: 4.4
     */
    syncInventoryFromProducts(productId: string, storeId: string, stockQuantity: number): Promise<ProductInventory>;
    /**
     * Sync all inventory for a store
     * Uses sp_Inventory_Sync stored procedure with MERGE statement
     * Requirements: 4.4
     */
    syncAllInventory(storeId: string): Promise<number>;
}
export declare const inventoryService: InventoryService;
//# sourceMappingURL=inventory-service.d.ts.map