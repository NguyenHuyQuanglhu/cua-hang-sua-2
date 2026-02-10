export interface TransferItemInput {
    productId: string;
    quantity: number;
    unitId: string;
}
export interface InventoryTransferRequest {
    sourceStoreId: string;
    destinationStoreId: string;
    items: TransferItemInput[];
    notes?: string;
    createdBy?: string;
}
export interface TransferredItem {
    productId: string;
    productName: string;
    quantity: number;
    cost: number;
    unitId: string;
}
export interface InventoryTransferResult {
    success: boolean;
    transferId: string;
    transferNumber: string;
    message: string;
    transferredItems: TransferredItem[];
}
export interface InsufficientStockError {
    productId: string;
    productName: string;
    requestedQuantity: number;
    availableQuantity: number;
}
export declare class InventoryTransferService {
    /**
     * Generate a unique transfer number in format TF{YYYYMM}{sequence}
     */
    private generateTransferNumber;
    /**
     * Validate that both stores belong to the same tenant
     */
    validateStoresSameTenant(sourceStoreId: string, destinationStoreId: string): Promise<{
        valid: boolean;
        error?: string;
    }>;
    /**
     * Check available stock for all items using FIFO method
     */
    checkAvailableStock(sourceStoreId: string, items: TransferItemInput[]): Promise<{
        sufficient: boolean;
        errors: InsufficientStockError[];
    }>;
    /**
     * Transfer inventory between stores using FIFO method
     */
    transferInventory(request: InventoryTransferRequest): Promise<InventoryTransferResult>;
    /**
     * Process a single item transfer using FIFO deduction
     */
    private processItemTransfer;
}
/**
 * Custom exception for insufficient stock errors
 */
export declare class InsufficientStockException extends Error {
    readonly errors: InsufficientStockError[];
    constructor(message: string, errors: InsufficientStockError[]);
}
export declare const inventoryTransferService: InventoryTransferService;
//# sourceMappingURL=inventory-transfer-service.d.ts.map