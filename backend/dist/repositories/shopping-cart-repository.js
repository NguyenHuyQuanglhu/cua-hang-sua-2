"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shoppingCartRepository = exports.ShoppingCartRepository = void 0;
const db_1 = require("../db");
/**
 * Shopping Cart repository for managing shopping carts and cart items
 */
class ShoppingCartRepository {
    CART_EXPIRY_DAYS = 7;
    /**
     * Map database record to ShoppingCart entity
     */
    mapCartToEntity(record) {
        return {
            id: record.id,
            onlineStoreId: record.online_store_id,
            sessionId: record.session_id || undefined,
            customerId: record.customer_id || undefined,
            subtotal: record.subtotal,
            discountAmount: record.discount_amount,
            shippingFee: record.shipping_fee,
            total: record.total,
            couponCode: record.coupon_code || undefined,
            createdAt: record.created_at instanceof Date
                ? record.created_at.toISOString()
                : String(record.created_at),
            updatedAt: record.updated_at instanceof Date
                ? record.updated_at.toISOString()
                : String(record.updated_at),
            expiresAt: record.expires_at instanceof Date
                ? record.expires_at.toISOString()
                : String(record.expires_at),
        };
    }
    /**
     * Map database record to CartItem entity
     */
    mapItemToEntity(record) {
        return {
            id: record.id,
            cartId: record.cart_id,
            onlineProductId: record.online_product_id,
            quantity: record.quantity,
            unitPrice: record.unit_price,
            totalPrice: record.total_price,
            createdAt: record.created_at instanceof Date
                ? record.created_at.toISOString()
                : String(record.created_at),
        };
    }
    /**
     * Map database record to CartItemWithProduct entity
     */
    mapItemWithProductToEntity(record) {
        return {
            ...this.mapItemToEntity(record),
            productName: record.product_name,
            productSku: record.product_sku || undefined,
            productImage: record.product_image || undefined,
            stockQuantity: record.stock_quantity,
        };
    }
    /**
     * Find cart by ID
     */
    async findById(id, onlineStoreId) {
        const result = await (0, db_1.queryOne)(`SELECT * FROM ShoppingCarts WHERE id = @id AND online_store_id = @onlineStoreId AND expires_at > GETDATE()`, { id, onlineStoreId });
        return result ? this.mapCartToEntity(result) : null;
    }
    /**
     * Find cart by session ID (for guest users)
     */
    async findBySessionId(sessionId, onlineStoreId) {
        const result = await (0, db_1.queryOne)(`SELECT * FROM ShoppingCarts WHERE session_id = @sessionId AND online_store_id = @onlineStoreId AND expires_at > GETDATE()`, { sessionId, onlineStoreId });
        return result ? this.mapCartToEntity(result) : null;
    }
    /**
     * Find cart by customer ID (for logged-in users)
     */
    async findByCustomerId(customerId, onlineStoreId) {
        const result = await (0, db_1.queryOne)(`SELECT * FROM ShoppingCarts WHERE customer_id = @customerId AND online_store_id = @onlineStoreId AND expires_at > GETDATE()`, { customerId, onlineStoreId });
        return result ? this.mapCartToEntity(result) : null;
    }
    /**
     * Get cart with items
     */
    async getCartWithItems(cartId, onlineStoreId) {
        const cart = await this.findById(cartId, onlineStoreId);
        if (!cart)
            return null;
        const items = await this.getCartItems(cartId);
        return { ...cart, items };
    }
    /**
     * Get cart items with product details
     */
    async getCartItems(cartId) {
        const results = await (0, db_1.query)(`SELECT ci.*, p.name as product_name, p.sku as product_sku, p.images as product_image, p.stock_quantity
       FROM CartItems ci
       INNER JOIN OnlineProducts op ON ci.online_product_id = op.id
       INNER JOIN Products p ON op.product_id = p.id
       WHERE ci.cart_id = @cartId`, { cartId });
        return results.map((r) => this.mapItemWithProductToEntity(r));
    }
    /**
     * Create a new cart
     */
    async createCart(onlineStoreId, sessionId, customerId) {
        const id = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + this.CART_EXPIRY_DAYS);
        await (0, db_1.query)(`INSERT INTO ShoppingCarts (
        id, online_store_id, session_id, customer_id, subtotal, discount_amount,
        shipping_fee, total, coupon_code, created_at, updated_at, expires_at
      ) VALUES (
        @id, @onlineStoreId, @sessionId, @customerId, 0, 0, 0, 0, NULL, GETDATE(), GETDATE(), @expiresAt
      )`, {
            id,
            onlineStoreId,
            sessionId: sessionId || null,
            customerId: customerId || null,
            expiresAt,
        });
        const created = await this.findById(id, onlineStoreId);
        if (!created) {
            throw new Error('Failed to create shopping cart');
        }
        return created;
    }
    /**
     * Get or create cart for session/customer
     */
    async getOrCreateCart(onlineStoreId, sessionId, customerId) {
        // Try to find existing cart
        let cart = null;
        if (customerId) {
            cart = await this.findByCustomerId(customerId, onlineStoreId);
        }
        else if (sessionId) {
            cart = await this.findBySessionId(sessionId, onlineStoreId);
        }
        if (cart) {
            // Extend expiration
            await this.extendExpiration(cart.id, onlineStoreId);
            return cart;
        }
        // Create new cart
        return this.createCart(onlineStoreId, sessionId, customerId);
    }
    /**
     * Add item to cart
     */
    async addItem(cartId, onlineProductId, quantity, unitPrice) {
        // Check if item already exists in cart
        const existingItem = await (0, db_1.queryOne)(`SELECT * FROM CartItems WHERE cart_id = @cartId AND online_product_id = @onlineProductId`, { cartId, onlineProductId });
        if (existingItem) {
            // Update quantity
            const newQuantity = existingItem.quantity + quantity;
            return this.updateItemQuantity(existingItem.id, cartId, newQuantity);
        }
        // Create new item
        const id = crypto.randomUUID();
        const totalPrice = quantity * unitPrice;
        await (0, db_1.query)(`INSERT INTO CartItems (id, cart_id, online_product_id, quantity, unit_price, total_price, created_at)
       VALUES (@id, @cartId, @onlineProductId, @quantity, @unitPrice, @totalPrice, GETDATE())`, { id, cartId, onlineProductId, quantity, unitPrice, totalPrice });
        // Recalculate cart totals
        await this.recalculateCartTotals(cartId);
        const item = await (0, db_1.queryOne)(`SELECT * FROM CartItems WHERE id = @id`, { id });
        if (!item) {
            throw new Error('Failed to add item to cart');
        }
        return this.mapItemToEntity(item);
    }
    /**
     * Update item quantity
     */
    async updateItemQuantity(itemId, cartId, quantity) {
        if (quantity <= 0) {
            await this.removeItem(itemId, cartId);
            throw new Error('Item removed from cart');
        }
        const item = await (0, db_1.queryOne)(`SELECT * FROM CartItems WHERE id = @itemId AND cart_id = @cartId`, { itemId, cartId });
        if (!item) {
            throw new Error('Cart item not found');
        }
        const totalPrice = quantity * item.unit_price;
        await (0, db_1.query)(`UPDATE CartItems SET quantity = @quantity, total_price = @totalPrice WHERE id = @itemId AND cart_id = @cartId`, { itemId, cartId, quantity, totalPrice });
        // Recalculate cart totals
        await this.recalculateCartTotals(cartId);
        const updated = await (0, db_1.queryOne)(`SELECT * FROM CartItems WHERE id = @itemId`, { itemId });
        if (!updated) {
            throw new Error('Failed to update cart item');
        }
        return this.mapItemToEntity(updated);
    }
    /**
     * Remove item from cart
     */
    async removeItem(itemId, cartId) {
        await (0, db_1.query)(`DELETE FROM CartItems WHERE id = @itemId AND cart_id = @cartId`, { itemId, cartId });
        // Recalculate cart totals
        await this.recalculateCartTotals(cartId);
        return true;
    }
    /**
     * Clear all items from cart
     */
    async clearCart(cartId) {
        await (0, db_1.query)(`DELETE FROM CartItems WHERE cart_id = @cartId`, { cartId });
        await this.recalculateCartTotals(cartId);
        return true;
    }
    /**
     * Recalculate cart totals
     */
    async recalculateCartTotals(cartId) {
        // Calculate subtotal from items
        const subtotalResult = await (0, db_1.queryOne)(`SELECT COALESCE(SUM(total_price), 0) as subtotal FROM CartItems WHERE cart_id = @cartId`, { cartId });
        const subtotal = subtotalResult?.subtotal ?? 0;
        // Get current cart for discount and shipping
        const cart = await (0, db_1.queryOne)(`SELECT * FROM ShoppingCarts WHERE id = @cartId`, { cartId });
        if (!cart) {
            throw new Error('Cart not found');
        }
        const total = subtotal - cart.discount_amount + cart.shipping_fee;
        await (0, db_1.query)(`UPDATE ShoppingCarts SET subtotal = @subtotal, total = @total, updated_at = GETDATE() WHERE id = @cartId`, { cartId, subtotal, total });
        const updated = await (0, db_1.queryOne)(`SELECT * FROM ShoppingCarts WHERE id = @cartId`, { cartId });
        if (!updated) {
            throw new Error('Failed to recalculate cart totals');
        }
        return this.mapCartToEntity(updated);
    }
    /**
     * Update shipping fee
     */
    async updateShippingFee(cartId, shippingFee) {
        await (0, db_1.query)(`UPDATE ShoppingCarts SET shipping_fee = @shippingFee, updated_at = GETDATE() WHERE id = @cartId`, { cartId, shippingFee });
        return this.recalculateCartTotals(cartId);
    }
    /**
     * Apply coupon code
     */
    async applyCoupon(cartId, couponCode, discountAmount) {
        await (0, db_1.query)(`UPDATE ShoppingCarts SET coupon_code = @couponCode, discount_amount = @discountAmount, updated_at = GETDATE() WHERE id = @cartId`, { cartId, couponCode, discountAmount });
        return this.recalculateCartTotals(cartId);
    }
    /**
     * Remove coupon code
     */
    async removeCoupon(cartId) {
        await (0, db_1.query)(`UPDATE ShoppingCarts SET coupon_code = NULL, discount_amount = 0, updated_at = GETDATE() WHERE id = @cartId`, { cartId });
        return this.recalculateCartTotals(cartId);
    }
    /**
     * Extend cart expiration
     */
    async extendExpiration(cartId, onlineStoreId) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + this.CART_EXPIRY_DAYS);
        await (0, db_1.query)(`UPDATE ShoppingCarts SET expires_at = @expiresAt, updated_at = GETDATE() WHERE id = @cartId AND online_store_id = @onlineStoreId`, { cartId, onlineStoreId, expiresAt });
        return true;
    }
    /**
     * Merge guest cart into customer cart
     */
    async mergeCart(sessionId, customerId, onlineStoreId) {
        const guestCart = await this.findBySessionId(sessionId, onlineStoreId);
        if (!guestCart)
            return null;
        let customerCart = await this.findByCustomerId(customerId, onlineStoreId);
        if (!customerCart) {
            // Transfer guest cart to customer
            await (0, db_1.query)(`UPDATE ShoppingCarts SET customer_id = @customerId, session_id = NULL, updated_at = GETDATE() WHERE id = @cartId`, { cartId: guestCart.id, customerId });
            return this.findById(guestCart.id, onlineStoreId);
        }
        // Merge items from guest cart to customer cart
        const guestItems = await this.getCartItems(guestCart.id);
        for (const item of guestItems) {
            await this.addItem(customerCart.id, item.onlineProductId, item.quantity, item.unitPrice);
        }
        // Delete guest cart
        await this.deleteCart(guestCart.id, onlineStoreId);
        return this.findById(customerCart.id, onlineStoreId);
    }
    /**
     * Delete cart
     */
    async deleteCart(cartId, onlineStoreId) {
        await (0, db_1.query)(`DELETE FROM ShoppingCarts WHERE id = @cartId AND online_store_id = @onlineStoreId`, { cartId, onlineStoreId });
        return true;
    }
    /**
     * Cleanup expired carts
     */
    async cleanupExpiredCarts() {
        const result = await (0, db_1.query)(`DELETE FROM ShoppingCarts WHERE expires_at < GETDATE(); SELECT @@ROWCOUNT as affected`, {});
        return result[0]?.affected ?? 0;
    }
    /**
     * Get cart item count
     */
    async getItemCount(cartId) {
        const result = await (0, db_1.queryOne)(`SELECT COALESCE(SUM(quantity), 0) as count FROM CartItems WHERE cart_id = @cartId`, { cartId });
        return result?.count ?? 0;
    }
}
exports.ShoppingCartRepository = ShoppingCartRepository;
// Export singleton instance
exports.shoppingCartRepository = new ShoppingCartRepository();
//# sourceMappingURL=shopping-cart-repository.js.map