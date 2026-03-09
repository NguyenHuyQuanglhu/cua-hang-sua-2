"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentService = exports.PaymentService = exports.PaymentStatusError = void 0;
const db_1 = require("../db");
const transaction_1 = require("../db/transaction");
/**
 * Payment status error
 */
class PaymentStatusError extends Error {
    orderId;
    currentStatus;
    constructor(message, orderId, currentStatus) {
        super(message);
        this.name = 'PaymentStatusError';
        this.orderId = orderId;
        this.currentStatus = currentStatus;
    }
}
exports.PaymentStatusError = PaymentStatusError;
/**
 * Payment Service
 * Handles payment status updates for different payment methods
 */
class PaymentService {
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
     * Confirm bank transfer payment
     * Updates payment status to 'paid' after store owner confirms receipt
     */
    async confirmBankTransfer(input) {
        return (0, transaction_1.withTransaction)(async (transaction) => {
            // Get current order
            const orderRecord = await (0, transaction_1.transactionQueryOne)(transaction, `SELECT * FROM OnlineOrders WHERE id = @orderId AND online_store_id = @onlineStoreId`, { orderId: input.orderId, onlineStoreId: input.onlineStoreId });
            if (!orderRecord) {
                throw new Error('Order not found');
            }
            const currentPaymentStatus = orderRecord.payment_status;
            // Validate payment method
            if (orderRecord.payment_method !== 'bank_transfer') {
                throw new PaymentStatusError('This order does not use bank transfer payment method', input.orderId, currentPaymentStatus);
            }
            // Validate current payment status
            if (currentPaymentStatus !== 'pending') {
                throw new PaymentStatusError(`Cannot confirm payment for order with status '${currentPaymentStatus}'`, input.orderId, currentPaymentStatus);
            }
            // Validate order status (should not be cancelled)
            if (orderRecord.status === 'cancelled') {
                throw new PaymentStatusError('Cannot confirm payment for cancelled order', input.orderId, currentPaymentStatus);
            }
            const now = new Date();
            // Build internal note
            let internalNote = orderRecord.internal_note || '';
            const confirmationNote = `[${now.toISOString()}] Bank transfer confirmed`;
            if (input.transactionReference) {
                internalNote += `\n${confirmationNote} - Ref: ${input.transactionReference}`;
            }
            else {
                internalNote += `\n${confirmationNote}`;
            }
            if (input.confirmedBy) {
                internalNote += ` by ${input.confirmedBy}`;
            }
            if (input.note) {
                internalNote += ` - ${input.note}`;
            }
            // Update payment status
            await (0, transaction_1.transactionQuery)(transaction, `UPDATE OnlineOrders 
         SET payment_status = 'paid', 
             internal_note = @internalNote,
             updated_at = @timestamp
         WHERE id = @orderId AND online_store_id = @onlineStoreId`, {
                orderId: input.orderId,
                onlineStoreId: input.onlineStoreId,
                internalNote: internalNote.trim(),
                timestamp: now,
            });
            // Fetch updated order
            const updatedRecord = await (0, transaction_1.transactionQueryOne)(transaction, `SELECT * FROM OnlineOrders WHERE id = @orderId AND online_store_id = @onlineStoreId`, { orderId: input.orderId, onlineStoreId: input.onlineStoreId });
            if (!updatedRecord) {
                throw new Error('Failed to fetch updated order');
            }
            return {
                success: true,
                order: this.mapOrderToEntity(updatedRecord),
                previousPaymentStatus: currentPaymentStatus,
                newPaymentStatus: 'paid',
                timestamp: now.toISOString(),
            };
        });
    }
    /**
     * Complete COD payment
     * Updates payment status to 'paid' when delivery person collects payment
     */
    async completeCODPayment(input) {
        return (0, transaction_1.withTransaction)(async (transaction) => {
            // Get current order
            const orderRecord = await (0, transaction_1.transactionQueryOne)(transaction, `SELECT * FROM OnlineOrders WHERE id = @orderId AND online_store_id = @onlineStoreId`, { orderId: input.orderId, onlineStoreId: input.onlineStoreId });
            if (!orderRecord) {
                throw new Error('Order not found');
            }
            const currentPaymentStatus = orderRecord.payment_status;
            // Validate payment method
            if (orderRecord.payment_method !== 'cod') {
                throw new PaymentStatusError('This order does not use COD payment method', input.orderId, currentPaymentStatus);
            }
            // Validate current payment status
            if (currentPaymentStatus !== 'pending') {
                throw new PaymentStatusError(`Cannot complete COD payment for order with status '${currentPaymentStatus}'`, input.orderId, currentPaymentStatus);
            }
            // Validate order status (should be shipped or delivered for COD)
            if (!['shipped', 'delivered'].includes(orderRecord.status)) {
                throw new PaymentStatusError('COD payment can only be completed for shipped or delivered orders', input.orderId, currentPaymentStatus);
            }
            // Validate collected amount matches order total
            if (input.collectedAmount !== orderRecord.total) {
                throw new PaymentStatusError(`Collected amount (${input.collectedAmount}) does not match order total (${orderRecord.total})`, input.orderId, currentPaymentStatus);
            }
            const now = new Date();
            // Build internal note
            let internalNote = orderRecord.internal_note || '';
            const codNote = `[${now.toISOString()}] COD payment collected: ${input.collectedAmount}`;
            internalNote += `\n${codNote}`;
            if (input.collectedBy) {
                internalNote += ` by ${input.collectedBy}`;
            }
            if (input.note) {
                internalNote += ` - ${input.note}`;
            }
            // Update payment status
            await (0, transaction_1.transactionQuery)(transaction, `UPDATE OnlineOrders 
         SET payment_status = 'paid', 
             internal_note = @internalNote,
             updated_at = @timestamp
         WHERE id = @orderId AND online_store_id = @onlineStoreId`, {
                orderId: input.orderId,
                onlineStoreId: input.onlineStoreId,
                internalNote: internalNote.trim(),
                timestamp: now,
            });
            // Fetch updated order
            const updatedRecord = await (0, transaction_1.transactionQueryOne)(transaction, `SELECT * FROM OnlineOrders WHERE id = @orderId AND online_store_id = @onlineStoreId`, { orderId: input.orderId, onlineStoreId: input.onlineStoreId });
            if (!updatedRecord) {
                throw new Error('Failed to fetch updated order');
            }
            return {
                success: true,
                order: this.mapOrderToEntity(updatedRecord),
                previousPaymentStatus: currentPaymentStatus,
                newPaymentStatus: 'paid',
                timestamp: now.toISOString(),
            };
        });
    }
    /**
     * Mark payment as failed
     */
    async markPaymentFailed(orderId, onlineStoreId, reason) {
        return (0, transaction_1.withTransaction)(async (transaction) => {
            // Get current order
            const orderRecord = await (0, transaction_1.transactionQueryOne)(transaction, `SELECT * FROM OnlineOrders WHERE id = @orderId AND online_store_id = @onlineStoreId`, { orderId, onlineStoreId });
            if (!orderRecord) {
                throw new Error('Order not found');
            }
            const currentPaymentStatus = orderRecord.payment_status;
            // Can only mark as failed from pending status
            if (currentPaymentStatus !== 'pending') {
                throw new PaymentStatusError(`Cannot mark payment as failed for order with status '${currentPaymentStatus}'`, orderId, currentPaymentStatus);
            }
            const now = new Date();
            // Build internal note
            let internalNote = orderRecord.internal_note || '';
            const failedNote = `[${now.toISOString()}] Payment failed`;
            internalNote += `\n${failedNote}`;
            if (reason) {
                internalNote += `: ${reason}`;
            }
            // Update payment status
            await (0, transaction_1.transactionQuery)(transaction, `UPDATE OnlineOrders 
         SET payment_status = 'failed', 
             internal_note = @internalNote,
             updated_at = @timestamp
         WHERE id = @orderId AND online_store_id = @onlineStoreId`, {
                orderId,
                onlineStoreId,
                internalNote: internalNote.trim(),
                timestamp: now,
            });
            // Fetch updated order
            const updatedRecord = await (0, transaction_1.transactionQueryOne)(transaction, `SELECT * FROM OnlineOrders WHERE id = @orderId AND online_store_id = @onlineStoreId`, { orderId, onlineStoreId });
            if (!updatedRecord) {
                throw new Error('Failed to fetch updated order');
            }
            return {
                success: true,
                order: this.mapOrderToEntity(updatedRecord),
                previousPaymentStatus: currentPaymentStatus,
                newPaymentStatus: 'failed',
                timestamp: now.toISOString(),
            };
        });
    }
    /**
     * Process refund
     */
    async processRefund(orderId, onlineStoreId, refundAmount, reason) {
        return (0, transaction_1.withTransaction)(async (transaction) => {
            // Get current order
            const orderRecord = await (0, transaction_1.transactionQueryOne)(transaction, `SELECT * FROM OnlineOrders WHERE id = @orderId AND online_store_id = @onlineStoreId`, { orderId, onlineStoreId });
            if (!orderRecord) {
                throw new Error('Order not found');
            }
            const currentPaymentStatus = orderRecord.payment_status;
            // Can only refund from paid status
            if (currentPaymentStatus !== 'paid') {
                throw new PaymentStatusError(`Cannot refund order with payment status '${currentPaymentStatus}'`, orderId, currentPaymentStatus);
            }
            // Validate refund amount
            if (refundAmount > orderRecord.total) {
                throw new PaymentStatusError(`Refund amount (${refundAmount}) exceeds order total (${orderRecord.total})`, orderId, currentPaymentStatus);
            }
            const now = new Date();
            // Build internal note
            let internalNote = orderRecord.internal_note || '';
            const refundNote = `[${now.toISOString()}] Refund processed: ${refundAmount}`;
            internalNote += `\n${refundNote}`;
            if (reason) {
                internalNote += ` - Reason: ${reason}`;
            }
            // Update payment status
            await (0, transaction_1.transactionQuery)(transaction, `UPDATE OnlineOrders 
         SET payment_status = 'refunded', 
             internal_note = @internalNote,
             updated_at = @timestamp
         WHERE id = @orderId AND online_store_id = @onlineStoreId`, {
                orderId,
                onlineStoreId,
                internalNote: internalNote.trim(),
                timestamp: now,
            });
            // Fetch updated order
            const updatedRecord = await (0, transaction_1.transactionQueryOne)(transaction, `SELECT * FROM OnlineOrders WHERE id = @orderId AND online_store_id = @onlineStoreId`, { orderId, onlineStoreId });
            if (!updatedRecord) {
                throw new Error('Failed to fetch updated order');
            }
            return {
                success: true,
                order: this.mapOrderToEntity(updatedRecord),
                previousPaymentStatus: currentPaymentStatus,
                newPaymentStatus: 'refunded',
                timestamp: now.toISOString(),
            };
        });
    }
    /**
     * Get bank transfer payment instructions for an order
     */
    async getBankTransferInstructions(orderId, onlineStoreId) {
        const orderRecord = await (0, db_1.queryOne)(`SELECT * FROM OnlineOrders WHERE id = @orderId AND online_store_id = @onlineStoreId`, { orderId, onlineStoreId });
        if (!orderRecord) {
            throw new Error('Order not found');
        }
        if (orderRecord.payment_method !== 'bank_transfer') {
            throw new Error('This order does not use bank transfer payment method');
        }
        // Get store's bank info (this would typically come from store settings)
        // For now, return placeholder info - in production, this should be fetched from store config
        const bankInfo = {
            bankName: 'Vietcombank',
            accountNumber: '1234567890',
            accountHolder: 'CONG TY TNHH ABC',
            branch: 'Chi nhánh Hà Nội',
        };
        // Transfer content should include order number for easy identification
        const transferContent = `Thanh toan don hang ${orderRecord.order_number}`;
        // Payment expires 24 hours after order creation
        const createdAt = orderRecord.created_at instanceof Date
            ? orderRecord.created_at
            : new Date(orderRecord.created_at);
        const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
        return {
            orderNumber: orderRecord.order_number,
            total: orderRecord.total,
            bankInfo,
            transferContent,
            expiresAt: expiresAt.toISOString(),
        };
    }
    /**
     * Check if payment is expired (for bank transfer orders)
     */
    async isPaymentExpired(orderId, onlineStoreId) {
        const orderRecord = await (0, db_1.queryOne)(`SELECT * FROM OnlineOrders WHERE id = @orderId AND online_store_id = @onlineStoreId`, { orderId, onlineStoreId });
        if (!orderRecord) {
            throw new Error('Order not found');
        }
        // Only check expiration for pending bank transfer payments
        if (orderRecord.payment_method !== 'bank_transfer' || orderRecord.payment_status !== 'pending') {
            return false;
        }
        const createdAt = orderRecord.created_at instanceof Date
            ? orderRecord.created_at
            : new Date(orderRecord.created_at);
        const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
        return new Date() > expiresAt;
    }
}
exports.PaymentService = PaymentService;
// Export singleton instance
exports.paymentService = new PaymentService();
//# sourceMappingURL=payment-service.js.map