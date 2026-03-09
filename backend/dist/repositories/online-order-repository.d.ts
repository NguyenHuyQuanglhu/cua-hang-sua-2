/**
 * Order status types
 */
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';
export type PaymentMethod = 'cod' | 'bank_transfer' | 'momo' | 'vnpay' | 'zalopay';
/**
 * Shipping Address interface
 */
export interface ShippingAddress {
    fullName: string;
    phone: string;
    province: string;
    district: string;
    ward: string;
    addressLine: string;
    note?: string;
}
/**
 * Online Order entity interface
 */
export interface OnlineOrder {
    id: string;
    orderNumber: string;
    onlineStoreId: string;
    customerId?: string;
    customerEmail: string;
    customerName: string;
    customerPhone: string;
    shippingAddress: ShippingAddress;
    shippingMethod?: string;
    shippingFee: number;
    trackingNumber?: string;
    carrier?: string;
    estimatedDelivery?: string;
    subtotal: number;
    discountAmount: number;
    total: number;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    paymentMethod: PaymentMethod;
    customerNote?: string;
    internalNote?: string;
    createdAt?: string;
    updatedAt?: string;
    confirmedAt?: string;
    shippedAt?: string;
    deliveredAt?: string;
    cancelledAt?: string;
}
/**
 * Online Order Item entity interface
 */
export interface OnlineOrderItem {
    id: string;
    orderId: string;
    onlineProductId: string;
    productName: string;
    productSku?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    createdAt?: string;
}
/**
 * Online Order with items
 */
export interface OnlineOrderWithItems extends OnlineOrder {
    items: OnlineOrderItem[];
}
/**
 * Create order input
 */
export interface CreateOnlineOrderInput {
    onlineStoreId: string;
    customerId?: string;
    customerEmail: string;
    customerName: string;
    customerPhone: string;
    shippingAddress: ShippingAddress;
    shippingMethod?: string;
    shippingFee: number;
    subtotal: number;
    discountAmount?: number;
    total: number;
    paymentMethod: PaymentMethod;
    customerNote?: string;
    items: CreateOnlineOrderItemInput[];
}
export interface CreateOnlineOrderItemInput {
    onlineProductId: string;
    productName: string;
    productSku?: string;
    quantity: number;
    unitPrice: number;
}
/**
 * Order filter options
 */
export interface OrderFilterOptions {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    startDate?: Date;
    endDate?: Date;
    customerId?: string;
    searchTerm?: string;
}
/**
 * Online Order repository for managing online orders
 */
export declare class OnlineOrderRepository {
    /**
     * Map database record to OnlineOrder entity
     */
    private mapOrderToEntity;
    /**
     * Map database record to OnlineOrderItem entity
     */
    private mapItemToEntity;
    /**
     * Generate order number (format: ON{YYYYMMDD}{SEQ})
     */
    private generateOrderNumber;
    /**
     * Find order by ID
     */
    findById(id: string, onlineStoreId: string): Promise<OnlineOrder | null>;
    /**
     * Find order by order number
     */
    findByOrderNumber(orderNumber: string, onlineStoreId: string): Promise<OnlineOrder | null>;
    /**
     * Find orders by store with filters
     */
    findByStore(onlineStoreId: string, filters?: OrderFilterOptions): Promise<OnlineOrder[]>;
    /**
     * Find orders by customer
     */
    findByCustomer(customerId: string, onlineStoreId: string): Promise<OnlineOrder[]>;
    /**
     * Get order with items
     */
    getOrderWithItems(orderId: string, onlineStoreId: string): Promise<OnlineOrderWithItems | null>;
    /**
     * Get order items
     */
    getOrderItems(orderId: string): Promise<OnlineOrderItem[]>;
    /**
     * Create order with items in transaction
     */
    create(data: CreateOnlineOrderInput): Promise<OnlineOrderWithItems>;
    /**
     * Update order status
     */
    updateStatus(orderId: string, status: OrderStatus, onlineStoreId: string): Promise<OnlineOrder>;
    /**
     * Update payment status
     */
    updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus, onlineStoreId: string): Promise<OnlineOrder>;
    /**
     * Update shipping info
     */
    updateShippingInfo(orderId: string, onlineStoreId: string, trackingNumber?: string, carrier?: string, estimatedDelivery?: Date): Promise<OnlineOrder>;
    /**
     * Add internal note
     */
    addInternalNote(orderId: string, note: string, onlineStoreId: string): Promise<OnlineOrder>;
    /**
     * Count orders by status
     */
    countByStatus(onlineStoreId: string): Promise<Record<OrderStatus, number>>;
    /**
     * Get order statistics
     */
    getStatistics(onlineStoreId: string, startDate?: Date, endDate?: Date): Promise<{
        totalOrders: number;
        totalRevenue: number;
        averageOrderValue: number;
    }>;
    /**
     * Count total orders for an online store
     */
    count(onlineStoreId: string): Promise<number>;
}
export declare const onlineOrderRepository: OnlineOrderRepository;
//# sourceMappingURL=online-order-repository.d.ts.map