/**
 * Inventory SP Repository
 *
 * Repository for inventory operations using stored procedures.
 * Implements inventory management via sp_Inventory_* stored procedures.
 * Requirements: 4.1-4.4
 */
import { SPBaseRepository } from './sp-base-repository';
/**
 * Inventory entity interface
 */
export interface Inventory {
    id: string;
    productId: string;
    storeId: string;
    unitId: string;
    quantity: number;
    createdAt: string;
    updatedAt: string;
}
/**
 * Inventory repository using stored procedures
 */
export declare class InventorySPRepository extends SPBaseRepository<Inventory> {
    protected tableName: string;
    /**
     * Map database record to Inventory entity
     */
    private mapToEntity;
    /**
     * Get available quantity for a product using sp_Inventory_GetAvailable
     * Requirements: 4.1
     *
     * @param productId - Product ID
     * @param storeId - Store ID
     * @param unitId - Unit ID
     * @returns Available quantity (0 if not found)
     */
    getAvailable(productId: string, storeId: string, unitId: string): Promise<number>;
    /**
     * Add inventory using sp_Inventory_Add (UPSERT logic)
     * Requirements: 4.2
     *
     * @param productId - Product ID
     * @param storeId - Store ID
     * @param unitId - Unit ID
     * @param quantity - Quantity to add
     * @returns New total quantity after addition
     */
    add(productId: string, storeId: string, unitId: string, quantity: number): Promise<number>;
    /**
     * Deduct inventory using sp_Inventory_Deduct with stock validation
     * Requirements: 4.3
     *
     * @param productId - Product ID
     * @param storeId - Store ID
     * @param unitId - Unit ID
     * @param quantity - Quantity to deduct
     * @returns New total quantity after deduction
     * @throws Error if insufficient stock
     */
    deduct(productId: string, storeId: string, unitId: string, quantity: number): Promise<number>;
    /**
     * Sync inventory from Products table using sp_Inventory_Sync (MERGE statement)
     * Requirements: 4.4
     *
     * @param storeId - Store ID
     * @returns Number of records synced
     */
    sync(storeId: string): Promise<number>;
    /**
     * Check if sufficient stock is available
     * Convenience method that checks available quantity against required
     *
     * @param productId - Product ID
     * @param storeId - Store ID
     * @param unitId - Unit ID
     * @param requiredQuantity - Required quantity
     * @returns True if sufficient stock available
     */
    hasSufficientStock(productId: string, storeId: string, unitId: string, requiredQuantity: number): Promise<boolean>;
    /**
     * Add inventory within a transaction
     * Useful when adding inventory as part of a larger operation
     *
     * @param productId - Product ID
     * @param storeId - Store ID
     * @param unitId - Unit ID
     * @param quantity - Quantity to add
     * @returns New total quantity after addition
     */
    addInTransaction(productId: string, storeId: string, unitId: string, quantity: number): Promise<number>;
    /**
     * Deduct inventory within a transaction
     * Useful when deducting inventory as part of a larger operation
     *
     * @param productId - Product ID
     * @param storeId - Store ID
     * @param unitId - Unit ID
     * @param quantity - Quantity to deduct
     * @returns New total quantity after deduction
     * @throws Error if insufficient stock
     */
    deductInTransaction(productId: string, storeId: string, unitId: string, quantity: number): Promise<number>;
}
export declare const inventorySPRepository: InventorySPRepository;
//# sourceMappingURL=inventory-sp-repository.d.ts.map