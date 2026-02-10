"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderProcessingService = exports.OrderProcessingService = exports.InsufficientStockError = void 0;
const transaction_1 = require("../db/transaction");
const db_1 = require("../db");
/**
 * Custom error for insufficient stock
 */
class InsufficientStockError extends Error {
    items;
    constructor(items) {
        super('Insufficient stock for one or more items');
        this.name = 'InsufficientStockError';
        this.items = items;
    }
}
exports.InsufficientStockError = InsufficientStockError;
/**
 * Order Processing Service
 * Handles order creation with transactional inventory deduction using FIFO
 */
class OrderProcessingService {
    /**
     * Generate order number (format: ON{YYYYMMDD}{SEQ})
     */
    async generateOrderNumber(transaction, onlineStoreId) {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const prefix = `ON${dateStr}`;
        const result = await (0, transaction_1.transactionQueryOne)(transaction, `SELECT COUNT(*) as count FROM OnlineOrders 
       WHERE online_store_id = @onlineStoreId AND order_number LIKE @prefix`, { onlineStoreId, prefix: `${prefix}%` });
        const seq = (result?.count ?? 0) + 1;
        return `${prefix}${seq.toString().padStart(4, '0')}`;
    }
    /**
     * Get the parent store ID from online store
     */
    async getStoreId(transaction, onlineStoreId) {
        const store = await (0, transaction_1.transactionQueryOne)(transaction, `SELECT id, store_id FROM OnlineStores WHERE id = @onlineStoreId`, { onlineStoreId });
        if (!store) {
            throw new Error('Online store not found');
        }
        return store.store_id;
    }
    /**
     * Get product ID from online product
     */
    async getProductId(transaction, onlineProductId, onlineStoreId) {
        const product = await (0, transaction_1.transactionQueryOne)(transaction, `SELECT id, product_id, online_store_id FROM OnlineProducts 
       WHERE id = @onlineProductId AND online_store_id = @onlineStoreId`, { onlineProductId, onlineStoreId });
        if (!product) {
            throw new Error(`Online product not found: ${onlineProductId}`);
        }
        return product.product_id;
    }
    /**
     * Check stock availability for all items
     */
    async checkStockAvailability(onlineStoreId, items) {
        const insufficientItems = [];
        // Get store ID
        const storeResult = await (0, db_1.queryOne)(`SELECT id, store_id FROM OnlineStores WHERE id = @onlineStoreId`, { onlineStoreId });
        if (!storeResult) {
            throw new Error('Online store not found');
        }
        const storeId = storeResult.store_id;
        for (const item of items) {
            // Get product ID from online product
            const productResult = await (0, db_1.queryOne)(`SELECT id, product_id, online_store_id FROM OnlineProducts 
         WHERE id = @onlineProductId AND online_store_id = @onlineStoreId`, { onlineProductId: item.onlineProductId, onlineStoreId });
            if (!productResult) {
                insufficientItems.push({
                    productName: item.productName,
                    requested: item.quantity,
                    available: 0,
                });
                continue;
            }
            // Calculate available stock from PurchaseLots
            const stockResult = await (0, db_1.queryOne)(`SELECT COALESCE(SUM(remaining_quantity), 0) as total 
         FROM PurchaseLots 
         WHERE product_id = @productId AND store_id = @storeId AND remaining_quantity > 0`, { productId: productResult.product_id, storeId });
            const available = stockResult?.total ?? 0;
            if (available < item.quantity) {
                insufficientItems.push({
                    productName: item.productName,
                    requested: item.quantity,
                    available,
                });
            }
        }
        return insufficientItems;
    }
    /**
     * Deduct inventory from PurchaseLots using FIFO
     * Returns the deduction details for cost tracking
     */
    async deductInventoryFIFO(transaction, productId, storeId, quantity) {
        // Get available lots ordered by import date (FIFO)
        const lots = await (0, transaction_1.transactionQuery)(transaction, `SELECT id, product_id, store_id, remaining_quantity, cost, unit_id 
       FROM PurchaseLots 
       WHERE product_id = @productId AND store_id = @storeId AND remaining_quantity > 0
       ORDER BY import_date ASC`, { productId, storeId });
        let remainingToDeduct = quantity;
        const deductions = [];
        for (const lot of lots) {
            if (remainingToDeduct <= 0)
                break;
            const deductFromLot = Math.min(lot.remaining_quantity, remainingToDeduct);
            const newRemaining = lot.remaining_quantity - deductFromLot;
            // Update the lot's remaining quantity
            await (0, transaction_1.transactionQuery)(transaction, `UPDATE PurchaseLots SET remaining_quantity = @newRemaining WHERE id = @lotId`, { lotId: lot.id, newRemaining });
            deductions.push({
                lotId: lot.id,
                quantityDeducted: deductFromLot,
                cost: lot.cost,
            });
            remainingToDeduct -= deductFromLot;
        }
        if (remainingToDeduct > 0) {
            throw new Error(`Insufficient stock for product ${productId}. Short by ${remainingToDeduct} units.`);
        }
        return {
            productId,
            totalDeducted: quantity,
            lots: deductions,
        };
    }
    /**
     * Create order with inventory deduction in a single transaction
     * This ensures atomicity - either both order creation and inventory deduction succeed, or neither does
     */
    async createOrderWithInventoryDeduction(data) {
        return (0, transaction_1.withTransaction)(async (transaction) => {
            // Get the parent store ID for inventory operations
            const storeId = await this.getStoreId(transaction, data.onlineStoreId);
            // First, validate and deduct inventory for all items
            const deductionResults = [];
            const insufficientItems = [];
            for (const item of data.items) {
                const productId = await this.getProductId(transaction, item.onlineProductId, data.onlineStoreId);
                // Check available stock
                const stockResult = await (0, transaction_1.transactionQueryOne)(transaction, `SELECT COALESCE(SUM(remaining_quantity), 0) as total 
           FROM PurchaseLots 
           WHERE product_id = @productId AND store_id = @storeId AND remaining_quantity > 0`, { productId, storeId });
                const available = stockResult?.total ?? 0;
                if (available < item.quantity) {
                    insufficientItems.push({
                        productName: item.productName,
                        requested: item.quantity,
                        available,
                    });
                }
            }
            // If any items have insufficient stock, throw error before any deductions
            if (insufficientItems.length > 0) {
                throw new InsufficientStockError(insufficientItems);
            }
            // Now perform the actual deductions
            for (const item of data.items) {
                const productId = await this.getProductId(transaction, item.onlineProductId, data.onlineStoreId);
                const deduction = await this.deductInventoryFIFO(transaction, productId, storeId, item.quantity);
                deductionResults.push(deduction);
            }
            // Generate order number
            const orderId = crypto.randomUUID();
            const orderNumber = await this.generateOrderNumber(transaction, data.onlineStoreId);
            // Create the order
            const orderRequest = transaction.request();
            orderRequest.input('id', orderId);
            orderRequest.input('orderNumber', orderNumber);
            orderRequest.input('onlineStoreId', data.onlineStoreId);
            orderRequest.input('customerId', data.customerId || null);
            orderRequest.input('customerEmail', data.customerEmail);
            orderRequest.input('customerName', data.customerName);
            orderRequest.input('customerPhone', data.customerPhone);
            orderRequest.input('shippingAddress', JSON.stringify(data.shippingAddress));
            orderRequest.input('shippingMethod', data.shippingMethod || null);
            orderRequest.input('shippingFee', data.shippingFee);
            orderRequest.input('subtotal', data.subtotal);
            orderRequest.input('discountAmount', data.discountAmount ?? 0);
            orderRequest.input('total', data.total);
            orderRequest.input('paymentMethod', data.paymentMethod);
            orderRequest.input('customerNote', data.customerNote || null);
            await orderRequest.query(`
        INSERT INTO OnlineOrders (
          id, order_number, online_store_id, customer_id, customer_email, customer_name,
          customer_phone, shipping_address, shipping_method, shipping_fee, subtotal,
          discount_amount, total, status, payment_status, payment_method, customer_note,
          created_at, updated_at
        ) VALUES (
          @id, @orderNumber, @onlineStoreId, @customerId, @customerEmail, @customerName,
          @customerPhone, @shippingAddress, @shippingMethod, @shippingFee, @subtotal,
          @discountAmount, @total, 'pending', 'pending', @paymentMethod, @customerNote,
          GETDATE(), GETDATE()
        )
      `);
            // Create order items
            const orderItems = [];
            for (const item of data.items) {
                const itemId = crypto.randomUUID();
                const itemRequest = transaction.request();
                itemRequest.input('id', itemId);
                itemRequest.input('orderId', orderId);
                itemRequest.input('onlineProductId', item.onlineProductId);
                itemRequest.input('productName', item.productName);
                itemRequest.input('productSku', item.productSku || null);
                itemRequest.input('quantity', item.quantity);
                itemRequest.input('unitPrice', item.unitPrice);
                itemRequest.input('totalPrice', item.quantity * item.unitPrice);
                await itemRequest.query(`
          INSERT INTO OnlineOrderItems (
            id, order_id, online_product_id, product_name, product_sku,
            quantity, unit_price, total_price, created_at
          ) VALUES (
            @id, @orderId, @onlineProductId, @productName, @productSku,
            @quantity, @unitPrice, @totalPrice, GETDATE()
          )
        `);
                orderItems.push({
                    id: itemId,
                    orderId,
                    onlineProductId: item.onlineProductId,
                    productName: item.productName,
                    productSku: item.productSku,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: item.quantity * item.unitPrice,
                });
            }
            // Parse shipping address
            let shippingAddress = data.shippingAddress;
            // Return the created order with items
            return {
                id: orderId,
                orderNumber,
                onlineStoreId: data.onlineStoreId,
                customerId: data.customerId,
                customerEmail: data.customerEmail,
                customerName: data.customerName,
                customerPhone: data.customerPhone,
                shippingAddress,
                shippingMethod: data.shippingMethod,
                shippingFee: data.shippingFee,
                subtotal: data.subtotal,
                discountAmount: data.discountAmount ?? 0,
                total: data.total,
                status: 'pending',
                paymentStatus: 'pending',
                paymentMethod: data.paymentMethod,
                customerNote: data.customerNote,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                items: orderItems,
            };
        });
    }
    /**
     * Restore inventory when an order is cancelled
     * This reverses the FIFO deduction by adding back to the most recently deducted lots
     */
    async restoreInventoryForCancelledOrder(orderId, onlineStoreId) {
        return (0, transaction_1.withTransaction)(async (transaction) => {
            // Get the parent store ID
            const storeId = await this.getStoreId(transaction, onlineStoreId);
            // Get order items
            const orderItems = await (0, transaction_1.transactionQuery)(transaction, `SELECT online_product_id, quantity FROM OnlineOrderItems WHERE order_id = @orderId`, { orderId });
            // Restore inventory for each item
            for (const item of orderItems) {
                // Get product ID from online product
                const productResult = await (0, transaction_1.transactionQueryOne)(transaction, `SELECT id, product_id, online_store_id FROM OnlineProducts 
           WHERE id = @onlineProductId AND online_store_id = @onlineStoreId`, { onlineProductId: item.online_product_id, onlineStoreId });
                if (!productResult)
                    continue;
                // Find the most recent lot with space to restore (or any lot for this product)
                // We'll add back to the most recent lot that was deducted from
                const lot = await (0, transaction_1.transactionQueryOne)(transaction, `SELECT TOP 1 id, product_id, store_id, remaining_quantity, cost, unit_id 
           FROM PurchaseLots 
           WHERE product_id = @productId AND store_id = @storeId
           ORDER BY import_date DESC`, { productId: productResult.product_id, storeId });
                if (lot) {
                    // Add the quantity back to this lot
                    await (0, transaction_1.transactionQuery)(transaction, `UPDATE PurchaseLots 
             SET remaining_quantity = remaining_quantity + @quantity 
             WHERE id = @lotId`, { lotId: lot.id, quantity: item.quantity });
                }
            }
        });
    }
}
exports.OrderProcessingService = OrderProcessingService;
// Export singleton instance
exports.orderProcessingService = new OrderProcessingService();
//# sourceMappingURL=order-processing-service.js.map