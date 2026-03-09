import type { OnlineOrderWithItems, CreateOnlineOrderInput } from '../repositories/online-order-repository';
/**
 * Order item for inventory deduction
 */
interface OrderItemForDeduction {
    onlineProductId: string;
    productName: string;
    productSku?: string;
    quantity: number;
    unitPrice: number;
}
/**
 * Insufficient stock error details
 */
export interface InsufficientStockItem {
    productName: string;
    requested: number;
    available: number;
}
/**
 * Custom error for insufficient stock
 */
export declare class InsufficientStockError extends Error {
    items: InsufficientStockItem[];
    constructor(items: InsufficientStockItem[]);
}
/**
 * Order Processing Service
 * Handles order creation with transactional inventory deduction using FIFO
 */
export declare class OrderProcessingService {
    /**
     * Generate order number (format: ON{YYYYMMDD}{SEQ})
     */
    private generateOrderNumber;
    /**
     * Get the parent store ID from online store
     */
    private getStoreId;
    /**
     * Get product ID from online product
     */
    private getProductId;
    /**
     * Check stock availability for all items
     */
    checkStockAvailability(onlineStoreId: string, items: OrderItemForDeduction[]): Promise<InsufficientStockItem[]>;
    /**
     * Deduct inventory from PurchaseLots using FIFO
     * Returns the deduction details for cost tracking
     */
    private deductInventoryFIFO;
    /**
     * Create order with inventory deduction in a single transaction
     * This ensures atomicity - either both order creation and inventory deduction succeed, or neither does
     */
    createOrderWithInventoryDeduction(data: CreateOnlineOrderInput): Promise<OnlineOrderWithItems>;
    /**
     * Restore inventory when an order is cancelled
     * This reverses the FIFO deduction by adding back to the most recently deducted lots
     */
    restoreInventoryForCancelledOrder(orderId: string, onlineStoreId: string): Promise<void>;
}
export declare const orderProcessingService: OrderProcessingService;
export {};
//# sourceMappingURL=order-processing-service.d.ts.map