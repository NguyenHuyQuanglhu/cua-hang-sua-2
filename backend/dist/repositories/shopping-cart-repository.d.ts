/**
 * Shopping Cart entity interface
 */
export interface ShoppingCart {
    id: string;
    onlineStoreId: string;
    sessionId?: string;
    customerId?: string;
    subtotal: number;
    discountAmount: number;
    shippingFee: number;
    total: number;
    couponCode?: string;
    createdAt?: string;
    updatedAt?: string;
    expiresAt: string;
}
/**
 * Cart Item entity interface
 */
export interface CartItem {
    id: string;
    cartId: string;
    onlineProductId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    createdAt?: string;
}
/**
 * Cart Item with product details
 */
export interface CartItemWithProduct extends CartItem {
    productName: string;
    productSku?: string;
    productImage?: string;
    stockQuantity: number;
}
/**
 * Shopping Cart with items
 */
export interface ShoppingCartWithItems extends ShoppingCart {
    items: CartItemWithProduct[];
}
/**
 * Shopping Cart repository for managing shopping carts and cart items
 */
export declare class ShoppingCartRepository {
    private readonly CART_EXPIRY_DAYS;
    /**
     * Map database record to ShoppingCart entity
     */
    private mapCartToEntity;
    /**
     * Map database record to CartItem entity
     */
    private mapItemToEntity;
    /**
     * Map database record to CartItemWithProduct entity
     */
    private mapItemWithProductToEntity;
    /**
     * Find cart by ID
     */
    findById(id: string, onlineStoreId: string): Promise<ShoppingCart | null>;
    /**
     * Find cart by session ID (for guest users)
     */
    findBySessionId(sessionId: string, onlineStoreId: string): Promise<ShoppingCart | null>;
    /**
     * Find cart by customer ID (for logged-in users)
     */
    findByCustomerId(customerId: string, onlineStoreId: string): Promise<ShoppingCart | null>;
    /**
     * Get cart with items
     */
    getCartWithItems(cartId: string, onlineStoreId: string): Promise<ShoppingCartWithItems | null>;
    /**
     * Get cart items with product details
     */
    getCartItems(cartId: string): Promise<CartItemWithProduct[]>;
    /**
     * Create a new cart
     */
    createCart(onlineStoreId: string, sessionId?: string, customerId?: string): Promise<ShoppingCart>;
    /**
     * Get or create cart for session/customer
     */
    getOrCreateCart(onlineStoreId: string, sessionId?: string, customerId?: string): Promise<ShoppingCart>;
    /**
     * Add item to cart
     */
    addItem(cartId: string, onlineProductId: string, quantity: number, unitPrice: number): Promise<CartItem>;
    /**
     * Update item quantity
     */
    updateItemQuantity(itemId: string, cartId: string, quantity: number): Promise<CartItem>;
    /**
     * Remove item from cart
     */
    removeItem(itemId: string, cartId: string): Promise<boolean>;
    /**
     * Clear all items from cart
     */
    clearCart(cartId: string): Promise<boolean>;
    /**
     * Recalculate cart totals
     */
    recalculateCartTotals(cartId: string): Promise<ShoppingCart>;
    /**
     * Update shipping fee
     */
    updateShippingFee(cartId: string, shippingFee: number): Promise<ShoppingCart>;
    /**
     * Apply coupon code
     */
    applyCoupon(cartId: string, couponCode: string, discountAmount: number): Promise<ShoppingCart>;
    /**
     * Remove coupon code
     */
    removeCoupon(cartId: string): Promise<ShoppingCart>;
    /**
     * Extend cart expiration
     */
    extendExpiration(cartId: string, onlineStoreId: string): Promise<boolean>;
    /**
     * Merge guest cart into customer cart
     */
    mergeCart(sessionId: string, customerId: string, onlineStoreId: string): Promise<ShoppingCart | null>;
    /**
     * Delete cart
     */
    deleteCart(cartId: string, onlineStoreId: string): Promise<boolean>;
    /**
     * Cleanup expired carts
     */
    cleanupExpiredCarts(): Promise<number>;
    /**
     * Get cart item count
     */
    getItemCount(cartId: string): Promise<number>;
}
export declare const shoppingCartRepository: ShoppingCartRepository;
//# sourceMappingURL=shopping-cart-repository.d.ts.map