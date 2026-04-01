"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderStatusService = exports.OrderStatusService = exports.OrderNotFoundError = exports.InvalidStatusTransitionError = void 0;
const db_1 = require("../db");
const transaction_1 = require("../db/transaction");
/**
 * Valid status transitions map
 * Defines which status transitions are allowed from each status
 */
const VALID_STATUS_TRANSITIONS = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: [],
};
/**
 * Status transition error
 */
class InvalidStatusTransitionError extends Error {
    currentStatus;
    targetStatus;
    constructor(currentStatus, targetStatus) {
        super(`Invalid status transition from '${currentStatus}' to '${targetStatus}'`);
        this.name = 'InvalidStatusTransitionError';
        this.currentStatus = currentStatus;
        this.targetStatus = targetStatus;
    }
}
exports.InvalidStatusTransitionError = InvalidStatusTransitionError;
/**
 * Order not found error
 */
class OrderNotFoundError extends Error {
    orderId;
    constructor(orderId) {
        super(`Order not found: ${orderId}`);
        this.name = 'OrderNotFoundError';
        this.orderId = orderId;
    }
}
exports.OrderNotFoundError = OrderNotFoundError;
/**
 * Order Status Service
 * Handles order status transitions with validation and side effects
 */
class OrderStatusService {
    /**
     * Check if a status transition is valid
     */
    isValidTransition(currentStatus, targetStatus) {
        return VALID_STATUS_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
    }
    /**
     * Get allowed next statuses for a given status
     */
    getAllowedTransitions(currentStatus) {
        return VALID_STATUS_TRANSITIONS[currentStatus] ?? [];
    }
    /**
     * Map database record to OnlineOrder entity
     */
    mapOrderToEntity(record) {
        let shippingAddress;
        try {
            shippingAddress = JSON.parse(record.shipping_address);
        }
        catch {
            shippingAddress = {
                fullName: '',
                phone: '',
                province: '',
                district: '',
                ward: '',
                addressLine: record.shipping_address,
            };
        }
        return {
            id: record.id,
            orderNumber: record.order_number,
            onlineStoreId: record.online_store_id,
            customerId: record.customer_id || undefined,
            customerEmail: record.customer_email,
            customerName: record.customer_name,
            customerPhone: record.customer_phone,
            shippingAddress,
            shippingMethod: record.shipping_method || undefined,
            shippingFee: record.shipping_fee,
            trackingNumber: record.tracking_number || undefined,
            carrier: record.carrier || undefined,
            estimatedDelivery: record.estimated_delivery instanceof Date
                ? record.estimated_delivery.toISOString()
                : record.estimated_delivery ? String(record.estimated_delivery) : undefined,
            subtotal: record.subtotal,
            discountAmount: record.discount_amount,
            total: record.total,
            status: record.status,
            paymentStatus: record.payment_status,
            paymentMethod: record.payment_method,
            customerNote: record.customer_note || undefined,
            internalNote: record.internal_note || undefined,
            createdAt: record.created_at instanceof Date
                ? record.created_at.toISOString()
                : String(record.created_at),
            updatedAt: record.updated_at instanceof Date
                ? record.updated_at.toISOString()
                : String(record.updated_at),
            confirmedAt: record.confirmed_at instanceof Date
                ? record.confirmed_at.toISOString()
                : record.confirmed_at ? String(record.confirmed_at) : undefined,
            shippedAt: record.shipped_at instanceof Date
                ? record.shipped_at.toISOString()
                : record.shipped_at ? String(record.shipped_at) : undefined,
            deliveredAt: record.delivered_at instanceof Date
                ? record.delivered_at.toISOString()
                : record.delivered_at ? String(record.delivered_at) : undefined,
            cancelledAt: record.cancelled_at instanceof Date
                ? record.cancelled_at.toISOString()
                : record.cancelled_at ? String(record.cancelled_at) : undefined,
        };
    }
    /**
     * Update order status with validation and side effects
     * Handles inventory restoration for cancelled orders
     */
    async updateStatus(orderId, targetStatus, onlineStoreId, options) {
        return (0, transaction_1.withTransaction)(async (transaction) => {
            // Get current order
            const orderRecord = await (0, transaction_1.transactionQueryOne)(transaction, `SELECT * FROM OnlineOrders WHERE id = @orderId AND online_store_id = @onlineStoreId`, { orderId, onlineStoreId });
            if (!orderRecord) {
                throw new OrderNotFoundError(orderId);
            }
            const currentStatus = orderRecord.status;
            // Validate transition
            if (!this.isValidTransition(currentStatus, targetStatus)) {
                throw new InvalidStatusTransitionError(currentStatus, targetStatus);
            }
            // Build update query with appropriate timestamp
            let timestampField = '';
            const now = new Date();
            switch (targetStatus) {
                case 'confirmed':
                    timestampField = ', confirmed_at = @timestamp';
                    break;
                case 'shipped':
                    timestampField = ', shipped_at = @timestamp';
                    break;
                case 'delivered':
                    timestampField = ', delivered_at = @timestamp';
                    break;
                case 'cancelled':
                    timestampField = ', cancelled_at = @timestamp';
                    break;
            }
            // Build additional fields for shipping info
            let additionalFields = '';
            const params = {
                orderId,
                onlineStoreId,
                status: targetStatus,
                timestamp: now,
            };
            if (options?.trackingNumber !== undefined) {
                additionalFields += ', tracking_number = @trackingNumber';
                params.trackingNumber = options.trackingNumber;
            }
            if (options?.carrier !== undefined) {
                additionalFields += ', carrier = @carrier';
                params.carrier = options.carrier;
            }
            if (options?.estimatedDelivery !== undefined) {
                additionalFields += ', estimated_delivery = @estimatedDelivery';
                params.estimatedDelivery = options.estimatedDelivery;
            }
            if (options?.internalNote !== undefined) {
                additionalFields += ', internal_note = @internalNote';
                params.internalNote = options.internalNote;
            }
            // Update the order
            await (0, transaction_1.transactionQuery)(transaction, `UPDATE OnlineOrders 
         SET status = @status, updated_at = @timestamp${timestampField}${additionalFields}
         WHERE id = @orderId AND online_store_id = @onlineStoreId`, params);
            // Handle side effects for cancellation - restore inventory
            if (targetStatus === 'cancelled') {
                await this.restoreInventoryForCancellation(transaction, orderId, onlineStoreId);
            }
            // Fetch updated order
            const updatedRecord = await (0, transaction_1.transactionQueryOne)(transaction, `SELECT * FROM OnlineOrders WHERE id = @orderId AND online_store_id = @onlineStoreId`, { orderId, onlineStoreId });
            if (!updatedRecord) {
                throw new Error('Failed to fetch updated order');
            }
            return {
                success: true,
                order: this.mapOrderToEntity(updatedRecord),
                previousStatus: currentStatus,
                newStatus: targetStatus,
                timestamp: now.toISOString(),
            };
        });
    }
    /**
     * Restore inventory when order is cancelled
     */
    async restoreInventoryForCancellation(transaction, orderId, onlineStoreId) {
        // Get the parent store ID
        const storeResult = await (0, transaction_1.transactionQueryOne)(transaction, `SELECT store_id FROM OnlineStores WHERE id = @onlineStoreId`, { onlineStoreId });
        if (!storeResult) {
            throw new Error('Online store not found');
        }
        const storeId = storeResult.store_id;
        // Get order items
        const orderItems = await (0, transaction_1.transactionQuery)(transaction, `SELECT online_product_id, quantity FROM OnlineOrderItems WHERE order_id = @orderId`, { orderId });
        // Restore inventory for each item
        for (const item of orderItems) {
            // Get product ID from online product
            const productResult = await (0, transaction_1.transactionQueryOne)(transaction, `SELECT product_id FROM OnlineProducts 
         WHERE id = @onlineProductId AND online_store_id = @onlineStoreId`, { onlineProductId: item.online_product_id, onlineStoreId });
            if (!productResult)
                continue;
            // Find the most recent lot for this product to restore inventory
            const lot = await (0, transaction_1.transactionQueryOne)(transaction, `SELECT TOP 1 id FROM PurchaseLots 
         WHERE product_id = @productId AND store_id = @storeId
         ORDER BY import_date DESC`, { productId: productResult.product_id, storeId });
            if (lot) {
                // Add the quantity back to this lot
                await (0, transaction_1.transactionQuery)(transaction, `UPDATE PurchaseLots 
           SET remaining_quantity = remaining_quantity + @quantity 
           WHERE id = @lotId`, { lotId: lot.id, quantity: item.quantity });
            }
        }
    }
    /**
     * Confirm an order (pending -> confirmed)
     */
    async confirmOrder(orderId, onlineStoreId, internalNote) {
        return this.updateStatus(orderId, 'confirmed', onlineStoreId, { internalNote });
    }
    /**
     * Start processing an order (confirmed -> processing)
     */
    async startProcessing(orderId, onlineStoreId, internalNote) {
        return this.updateStatus(orderId, 'processing', onlineStoreId, { internalNote });
    }
    /**
     * Ship an order (processing -> shipped)
     */
    async shipOrder(orderId, onlineStoreId, shippingInfo) {
        return this.updateStatus(orderId, 'shipped', onlineStoreId, shippingInfo);
    }
    /**
     * Mark order as delivered (shipped -> delivered)
     */
    async markDelivered(orderId, onlineStoreId, internalNote) {
        return this.updateStatus(orderId, 'delivered', onlineStoreId, { internalNote });
    }
    /**
     * Cancel an order (pending/confirmed/processing -> cancelled)
     * This will restore inventory
     */
    async cancelOrder(orderId, onlineStoreId, reason) {
        return this.updateStatus(orderId, 'cancelled', onlineStoreId, {
            internalNote: reason ? `Cancelled: ${reason}` : 'Order cancelled'
        });
    }
    /**
     * Get order status history (based on timestamps)
     */
    async getStatusHistory(orderId, onlineStoreId) {
        const order = await (0, db_1.queryOne)(`SELECT * FROM OnlineOrders WHERE id = @orderId AND online_store_id = @onlineStoreId`, { orderId, onlineStoreId });
        if (!order) {
            throw new OrderNotFoundError(orderId);
        }
        const history = [];
        // Add created (pending) status
        history.push({
            status: 'pending',
            timestamp: order.created_at instanceof Date
                ? order.created_at.toISOString()
                : String(order.created_at),
        });
        // Add confirmed if exists
        if (order.confirmed_at) {
            history.push({
                status: 'confirmed',
                timestamp: order.confirmed_at instanceof Date
                    ? order.confirmed_at.toISOString()
                    : String(order.confirmed_at),
            });
        }
        // Add shipped if exists
        if (order.shipped_at) {
            history.push({
                status: 'shipped',
                timestamp: order.shipped_at instanceof Date
                    ? order.shipped_at.toISOString()
                    : String(order.shipped_at),
            });
        }
        // Add delivered if exists
        if (order.delivered_at) {
            history.push({
                status: 'delivered',
                timestamp: order.delivered_at instanceof Date
                    ? order.delivered_at.toISOString()
                    : String(order.delivered_at),
            });
        }
        // Add cancelled if exists
        if (order.cancelled_at) {
            history.push({
                status: 'cancelled',
                timestamp: order.cancelled_at instanceof Date
                    ? order.cancelled_at.toISOString()
                    : String(order.cancelled_at),
            });
        }
        return history.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
}
exports.OrderStatusService = OrderStatusService;
// Export singleton instance
exports.orderStatusService = new OrderStatusService();
//# sourceMappingURL=order-status-service.js.map