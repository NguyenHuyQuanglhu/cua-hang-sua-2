import type { OrderStatus, OnlineOrder } from '../repositories/online-order-repository';
/**
 * Status transition error
 */
export declare class InvalidStatusTransitionError extends Error {
    currentStatus: OrderStatus;
    targetStatus: OrderStatus;
    constructor(currentStatus: OrderStatus, targetStatus: OrderStatus);
}
/**
 * Order not found error
 */
export declare class OrderNotFoundError extends Error {
    orderId: string;
    constructor(orderId: string);
}
/**
 * Status transition result
 */
export interface StatusTransitionResult {
    success: boolean;
    order: OnlineOrder;
    previousStatus: OrderStatus;
    newStatus: OrderStatus;
    timestamp: string;
}
/**
 * Order Status Service
 * Handles order status transitions with validation and side effects
 */
export declare class OrderStatusService {
    /**
     * Check if a status transition is valid
     */
    isValidTransition(currentStatus: OrderStatus, targetStatus: OrderStatus): boolean;
    /**
     * Get allowed next statuses for a given status
     */
    getAllowedTransitions(currentStatus: OrderStatus): OrderStatus[];
    /**
     * Map database record to OnlineOrder entity
     */
    private mapOrderToEntity;
    /**
     * Update order status with validation and side effects
     * Handles inventory restoration for cancelled orders
     */
    updateStatus(orderId: string, targetStatus: OrderStatus, onlineStoreId: string, options?: {
        internalNote?: string;
        trackingNumber?: string;
        carrier?: string;
        estimatedDelivery?: Date;
    }): Promise<StatusTransitionResult>;
    /**
     * Restore inventory when order is cancelled
     */
    private restoreInventoryForCancellation;
    /**
     * Confirm an order (pending -> confirmed)
     */
    confirmOrder(orderId: string, onlineStoreId: string, internalNote?: string): Promise<StatusTransitionResult>;
    /**
     * Start processing an order (confirmed -> processing)
     */
    startProcessing(orderId: string, onlineStoreId: string, internalNote?: string): Promise<StatusTransitionResult>;
    /**
     * Ship an order (processing -> shipped)
     */
    shipOrder(orderId: string, onlineStoreId: string, shippingInfo: {
        trackingNumber?: string;
        carrier?: string;
        estimatedDelivery?: Date;
        internalNote?: string;
    }): Promise<StatusTransitionResult>;
    /**
     * Mark order as delivered (shipped -> delivered)
     */
    markDelivered(orderId: string, onlineStoreId: string, internalNote?: string): Promise<StatusTransitionResult>;
    /**
     * Cancel an order (pending/confirmed/processing -> cancelled)
     * This will restore inventory
     */
    cancelOrder(orderId: string, onlineStoreId: string, reason?: string): Promise<StatusTransitionResult>;
    /**
     * Get order status history (based on timestamps)
     */
    getStatusHistory(orderId: string, onlineStoreId: string): Promise<Array<{
        status: OrderStatus;
        timestamp: string;
    }>>;
}
export declare const orderStatusService: OrderStatusService;
//# sourceMappingURL=order-status-service.d.ts.map