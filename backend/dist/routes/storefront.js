"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// GET /api/storefront/:slug/config - Public endpoint
router.get('/:slug/config', async (req, res) => {
    try {
        const { slug } = req.params;
        const store = await (0, db_1.queryOne)(`SELECT * FROM OnlineStores WHERE slug = @slug AND is_active = 1`, { slug });
        if (!store) {
            res.status(404).json({ error: 'Store not found' });
            return;
        }
        res.json({
            store: {
                id: store.id,
                storeName: store.store_name,
                slug: store.slug,
                logo: store.logo,
                favicon: store.favicon,
                description: store.description,
                themeId: store.theme_id,
                primaryColor: store.primary_color,
                secondaryColor: store.secondary_color,
                fontFamily: store.font_family,
                contactEmail: store.contact_email,
                contactPhone: store.contact_phone,
                address: store.address,
                facebookUrl: store.facebook_url,
                instagramUrl: store.instagram_url,
                currency: store.currency,
            }
        });
    }
    catch (error) {
        console.error('Get storefront config error:', error);
        res.status(500).json({ error: 'Failed to get store config' });
    }
});
// GET /api/storefront/:slug/products - Public endpoint
router.get('/:slug/products', async (req, res) => {
    try {
        const { slug } = req.params;
        const { category, search, page = '1', limit = '20' } = req.query;
        // First get the online store
        const store = await (0, db_1.queryOne)(`SELECT * FROM OnlineStores WHERE slug = @slug AND is_active = 1`, { slug });
        if (!store) {
            res.status(404).json({ error: 'Store not found' });
            return;
        }
        // Build query for online products - using correct column names from schema
        let productQuery = `
      SELECT op.id, op.online_store_id, op.product_id, op.category_id,
             op.is_published, op.online_price, op.online_description,
             op.display_order, op.seo_title, op.seo_description, op.seo_slug, op.images,
             p.name as product_name, p.sku, p.cost_price, p.stock_quantity,
             c.name as category_name
      FROM OnlineProducts op
      LEFT JOIN Products p ON op.product_id = p.id
      LEFT JOIN Categories c ON op.category_id = c.id
      WHERE op.online_store_id = @onlineStoreId AND op.is_published = 1
    `;
        const params = { onlineStoreId: store.id };
        if (category) {
            productQuery += ` AND op.category_id = @categoryId`;
            params.categoryId = category;
        }
        if (search) {
            productQuery += ` AND (p.name LIKE @search OR op.online_description LIKE @search)`;
            params.search = `%${search}%`;
        }
        productQuery += ` ORDER BY op.display_order ASC, op.created_at DESC`;
        // Pagination
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const offset = (pageNum - 1) * limitNum;
        productQuery += ` OFFSET ${offset} ROWS FETCH NEXT ${limitNum} ROWS ONLY`;
        const products = await (0, db_1.query)(productQuery, params);
        // Get total count
        let countQuery = `
      SELECT COUNT(*) as total FROM OnlineProducts op
      LEFT JOIN Products p ON op.product_id = p.id
      WHERE op.online_store_id = @onlineStoreId AND op.is_published = 1
    `;
        if (category) {
            countQuery += ` AND op.category_id = @categoryId`;
        }
        if (search) {
            countQuery += ` AND (p.name LIKE @search OR op.online_description LIKE @search)`;
        }
        const countResult = await (0, db_1.queryOne)(countQuery, params);
        const total = countResult?.total || 0;
        res.json({
            store: {
                name: store.store_name,
                logo: store.logo,
                currency: store.currency,
            },
            products: products.map((p) => {
                let images = [];
                if (p.images) {
                    try {
                        images = JSON.parse(p.images);
                    }
                    catch {
                        // If not JSON, treat as single URL
                        images = [p.images];
                    }
                }
                const stockQuantity = p.stock_quantity || 0;
                return {
                    id: p.id,
                    name: p.product_name,
                    slug: p.seo_slug,
                    description: p.online_description,
                    price: p.online_price,
                    images,
                    categoryId: p.category_id,
                    categoryName: p.category_name,
                    sku: p.sku,
                    seoTitle: p.seo_title,
                    seoDescription: p.seo_description,
                    stockQuantity: stockQuantity,
                    inStock: stockQuantity > 0,
                };
            }),
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            }
        });
    }
    catch (error) {
        console.error('Get storefront products error:', error);
        res.status(500).json({ error: 'Failed to get products' });
    }
});
// GET /api/storefront/:slug/products/:productSlug - Public endpoint
router.get('/:slug/products/:productSlug', async (req, res) => {
    try {
        const { slug, productSlug } = req.params;
        const store = await (0, db_1.queryOne)(`SELECT * FROM OnlineStores WHERE slug = @slug AND is_active = 1`, { slug });
        if (!store) {
            res.status(404).json({ error: 'Store not found' });
            return;
        }
        const product = await (0, db_1.queryOne)(`SELECT op.*, p.name as product_name, p.sku, p.stock_quantity, c.name as category_name
       FROM OnlineProducts op
       LEFT JOIN Products p ON op.product_id = p.id
       LEFT JOIN Categories c ON op.category_id = c.id
       WHERE op.online_store_id = @onlineStoreId AND op.seo_slug = @productSlug AND op.is_published = 1`, { onlineStoreId: store.id, productSlug });
        if (!product) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        const stockQuantity = product.stock_quantity || 0;
        res.json({
            product: {
                id: product.id,
                name: product.product_name,
                slug: product.seo_slug,
                description: product.online_description,
                price: product.online_price,
                images: product.images ? ((() => { try {
                    return JSON.parse(product.images);
                }
                catch {
                    return [product.images];
                } })()) : [],
                categoryId: product.category_id,
                categoryName: product.category_name,
                sku: product.sku,
                seoTitle: product.seo_title,
                seoDescription: product.seo_description,
                stockQuantity: stockQuantity,
                inStock: stockQuantity > 0,
            }
        });
    }
    catch (error) {
        console.error('Get storefront product error:', error);
        res.status(500).json({ error: 'Failed to get product' });
    }
});
// GET /api/storefront/:slug/categories - Public endpoint
router.get('/:slug/categories', async (req, res) => {
    try {
        const { slug } = req.params;
        const store = await (0, db_1.queryOne)(`SELECT * FROM OnlineStores WHERE slug = @slug AND is_active = 1`, { slug });
        if (!store) {
            res.status(404).json({ error: 'Store not found' });
            return;
        }
        const categories = await (0, db_1.query)(`SELECT DISTINCT c.id, c.name, c.description
       FROM Categories c
       INNER JOIN OnlineProducts op ON c.id = op.category_id
       WHERE op.online_store_id = @onlineStoreId AND op.is_published = 1
       ORDER BY c.name`, { onlineStoreId: store.id });
        res.json({ categories });
    }
    catch (error) {
        console.error('Get storefront categories error:', error);
        res.status(500).json({ error: 'Failed to get categories' });
    }
});
// GET /api/storefront/:slug/cart - Public endpoint
router.get('/:slug/cart', async (req, res) => {
    try {
        const { slug } = req.params;
        const sessionId = req.headers['x-session-id'];
        if (!sessionId) {
            res.json({
                cart: {
                    id: '',
                    items: [],
                    subtotal: 0,
                    discountAmount: 0,
                    shippingFee: 0,
                    total: 0,
                    itemCount: 0,
                }
            });
            return;
        }
        const store = await (0, db_1.queryOne)(`SELECT id FROM OnlineStores WHERE slug = @slug AND is_active = 1`, { slug });
        if (!store) {
            res.status(404).json({ error: 'Store not found' });
            return;
        }
        const cart = await (0, db_1.queryOne)(`SELECT * FROM ShoppingCarts WHERE online_store_id = @onlineStoreId AND session_id = @sessionId`, { onlineStoreId: store.id, sessionId });
        if (!cart) {
            res.json({
                cart: {
                    id: '',
                    items: [],
                    subtotal: 0,
                    discountAmount: 0,
                    shippingFee: 0,
                    total: 0,
                    itemCount: 0,
                }
            });
            return;
        }
        const items = await (0, db_1.query)(`SELECT ci.*, p.name as product_name, op.images
       FROM CartItems ci
       LEFT JOIN OnlineProducts op ON ci.online_product_id = op.id
       LEFT JOIN Products p ON op.product_id = p.id
       WHERE ci.cart_id = @cartId`, { cartId: cart.id });
        res.json({
            cart: {
                id: cart.id,
                items: items.map((item) => ({
                    id: item.id,
                    onlineProductId: item.online_product_id,
                    productName: item.product_name,
                    quantity: item.quantity,
                    unitPrice: item.unit_price,
                    totalPrice: item.total_price,
                    images: item.images ? ((() => { try {
                        return JSON.parse(item.images);
                    }
                    catch {
                        return [item.images];
                    } })()) : [],
                })),
                subtotal: cart.subtotal,
                discountAmount: cart.discount_amount,
                shippingFee: cart.shipping_fee,
                total: cart.total,
                itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
            }
        });
    }
    catch (error) {
        console.error('Get storefront cart error:', error);
        res.status(500).json({ error: 'Failed to get cart' });
    }
});
// POST /api/storefront/:slug/cart/items - Add item to cart
router.post('/:slug/cart/items', async (req, res) => {
    try {
        const { slug } = req.params;
        const sessionId = req.headers['x-session-id'];
        const { productId, quantity = 1 } = req.body;
        if (!sessionId) {
            res.status(400).json({ error: 'Session ID is required' });
            return;
        }
        if (!productId) {
            res.status(400).json({ error: 'Product ID is required' });
            return;
        }
        const store = await (0, db_1.queryOne)(`SELECT id FROM OnlineStores WHERE slug = @slug AND is_active = 1`, { slug });
        if (!store) {
            res.status(404).json({ error: 'Store not found' });
            return;
        }
        // Get the online product
        const product = await (0, db_1.queryOne)(`SELECT op.*, p.stock_quantity 
       FROM OnlineProducts op
       LEFT JOIN Products p ON op.product_id = p.id
       WHERE op.id = @productId AND op.online_store_id = @onlineStoreId AND op.is_published = 1`, { productId, onlineStoreId: store.id });
        if (!product) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        if (product.stock_quantity < quantity) {
            res.status(400).json({ error: 'Insufficient stock' });
            return;
        }
        // Get or create cart
        let cart = await (0, db_1.queryOne)(`SELECT * FROM ShoppingCarts WHERE online_store_id = @onlineStoreId AND session_id = @sessionId`, { onlineStoreId: store.id, sessionId });
        if (!cart) {
            // Create new cart with 30 day expiry
            const cartId = require('crypto').randomUUID();
            await (0, db_1.query)(`INSERT INTO ShoppingCarts (id, online_store_id, session_id, subtotal, discount_amount, shipping_fee, total, created_at, updated_at, expires_at)
         VALUES (@id, @onlineStoreId, @sessionId, 0, 0, 0, 0, GETDATE(), GETDATE(), DATEADD(day, 30, GETDATE()))`, { id: cartId, onlineStoreId: store.id, sessionId });
            cart = { id: cartId, subtotal: 0, discount_amount: 0, shipping_fee: 0, total: 0 };
        }
        // Check if item already exists in cart
        const existingItem = await (0, db_1.queryOne)(`SELECT * FROM CartItems WHERE cart_id = @cartId AND online_product_id = @productId`, { cartId: cart.id, productId });
        const unitPrice = product.online_price;
        if (existingItem) {
            // Update quantity
            const newQuantity = existingItem.quantity + quantity;
            const newTotalPrice = newQuantity * unitPrice;
            await (0, db_1.query)(`UPDATE CartItems SET quantity = @quantity, total_price = @totalPrice
         WHERE id = @id`, { id: existingItem.id, quantity: newQuantity, totalPrice: newTotalPrice });
        }
        else {
            // Add new item
            const itemId = require('crypto').randomUUID();
            const totalPrice = quantity * unitPrice;
            await (0, db_1.query)(`INSERT INTO CartItems (id, cart_id, online_product_id, quantity, unit_price, total_price, created_at)
         VALUES (@id, @cartId, @productId, @quantity, @unitPrice, @totalPrice, GETDATE())`, { id: itemId, cartId: cart.id, productId, quantity, unitPrice, totalPrice });
        }
        // Update cart totals
        const cartTotals = await (0, db_1.queryOne)(`SELECT SUM(total_price) as subtotal FROM CartItems WHERE cart_id = @cartId`, { cartId: cart.id });
        const subtotal = cartTotals?.subtotal || 0;
        const total = subtotal - (cart.discount_amount || 0) + (cart.shipping_fee || 0);
        await (0, db_1.query)(`UPDATE ShoppingCarts SET subtotal = @subtotal, total = @total, updated_at = GETDATE()
       WHERE id = @id`, { id: cart.id, subtotal, total });
        res.json({ success: true, message: 'Item added to cart' });
    }
    catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({ error: 'Failed to add item to cart' });
    }
});
// POST /api/storefront/:slug/checkout - Create order from cart
router.post('/:slug/checkout', async (req, res) => {
    try {
        const { slug } = req.params;
        const sessionId = req.headers['x-session-id'];
        const { customerEmail, customerName, customerPhone, shippingAddress, paymentMethod, customerNote } = req.body;
        if (!sessionId) {
            res.status(400).json({ error: 'Session ID is required' });
            return;
        }
        const store = await (0, db_1.queryOne)(`SELECT id FROM OnlineStores WHERE slug = @slug AND is_active = 1`, { slug });
        if (!store) {
            res.status(404).json({ error: 'Store not found' });
            return;
        }
        // Get cart
        const cart = await (0, db_1.queryOne)(`SELECT * FROM ShoppingCarts WHERE online_store_id = @onlineStoreId AND session_id = @sessionId`, { onlineStoreId: store.id, sessionId });
        if (!cart) {
            res.status(400).json({ error: 'Cart not found' });
            return;
        }
        // Get cart items with product_id for stock update
        const cartItems = await (0, db_1.query)(`SELECT ci.*, p.name as product_name, p.sku as product_sku, op.online_price, op.product_id
       FROM CartItems ci
       LEFT JOIN OnlineProducts op ON ci.online_product_id = op.id
       LEFT JOIN Products p ON op.product_id = p.id
       WHERE ci.cart_id = @cartId`, { cartId: cart.id });
        if (cartItems.length === 0) {
            res.status(400).json({ error: 'Cart is empty' });
            return;
        }
        // Generate order number
        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        const orderId = require('crypto').randomUUID();
        // Format shipping address as JSON string
        const shippingAddressStr = JSON.stringify(shippingAddress);
        // Calculate totals
        const subtotal = cart.subtotal;
        const discountAmount = cart.discount_amount || 0;
        const shippingFee = cart.shipping_fee || 0;
        const total = subtotal - discountAmount + shippingFee;
        // Create order
        await (0, db_1.query)(`INSERT INTO OnlineOrders (
        id, order_number, online_store_id, customer_email, customer_name, customer_phone,
        shipping_address, shipping_fee, subtotal, discount_amount, total,
        status, payment_status, payment_method, customer_note, created_at, updated_at
      ) VALUES (
        @id, @orderNumber, @onlineStoreId, @customerEmail, @customerName, @customerPhone,
        @shippingAddress, @shippingFee, @subtotal, @discountAmount, @total,
        'pending', 'pending', @paymentMethod, @customerNote, GETDATE(), GETDATE()
      )`, {
            id: orderId,
            orderNumber,
            onlineStoreId: store.id,
            customerEmail,
            customerName,
            customerPhone,
            shippingAddress: shippingAddressStr,
            shippingFee,
            subtotal,
            discountAmount,
            total,
            paymentMethod,
            customerNote: customerNote || null,
        });
        // Create order items and reduce stock
        for (const item of cartItems) {
            const orderItemId = require('crypto').randomUUID();
            await (0, db_1.query)(`INSERT INTO OnlineOrderItems (
          id, order_id, online_product_id, product_name, product_sku, quantity, unit_price, total_price, created_at
        ) VALUES (
          @id, @orderId, @onlineProductId, @productName, @productSku, @quantity, @unitPrice, @totalPrice, GETDATE()
        )`, {
                id: orderItemId,
                orderId,
                onlineProductId: item.online_product_id,
                productName: item.product_name,
                productSku: item.product_sku || null,
                quantity: item.quantity,
                unitPrice: item.unit_price,
                totalPrice: item.total_price,
            });
            // Reduce stock quantity in Products table
            await (0, db_1.query)(`UPDATE Products SET stock_quantity = stock_quantity - @quantity, updated_at = GETDATE()
         WHERE id = @productId AND stock_quantity >= @quantity`, {
                productId: item.product_id,
                quantity: item.quantity,
            });
        }
        // Sync to Sales table for reports - get store_id from OnlineStores
        const onlineStore = await (0, db_1.queryOne)(`SELECT store_id FROM OnlineStores WHERE id = @onlineStoreId`, { onlineStoreId: store.id });
        if (onlineStore?.store_id) {
            const saleId = require('crypto').randomUUID();
            const invoiceNumber = `ONLINE-${orderNumber}`;
            // Create Sales record
            await (0, db_1.query)(`INSERT INTO Sales (
          id, store_id, invoice_number, customer_id, shift_id, transaction_date,
          status, total_amount, vat_amount, final_amount, discount, discount_type,
          discount_value, payment_method, customer_payment, previous_debt, remaining_debt,
          created_at, updated_at
        ) VALUES (
          @id, @storeId, @invoiceNumber, NULL, NULL, GETDATE(),
          'completed', @totalAmount, 0, @finalAmount, @discount, NULL,
          0, @paymentMethod, @finalAmount, 0, 0,
          GETDATE(), GETDATE()
        )`, {
                id: saleId,
                storeId: onlineStore.store_id,
                invoiceNumber,
                totalAmount: subtotal,
                finalAmount: total,
                discount: discountAmount,
                paymentMethod: paymentMethod === 'cod' ? 'cash' : paymentMethod,
            });
            // Create SalesItems records
            for (const item of cartItems) {
                await (0, db_1.query)(`INSERT INTO SalesItems (id, sales_transaction_id, product_id, quantity, price, created_at)
           VALUES (NEWID(), @saleId, @productId, @quantity, @price, GETDATE())`, {
                    saleId,
                    productId: item.product_id,
                    quantity: item.quantity,
                    price: item.unit_price,
                });
            }
        }
        // Delete cart items and cart
        await (0, db_1.query)(`DELETE FROM CartItems WHERE cart_id = @cartId`, { cartId: cart.id });
        await (0, db_1.query)(`DELETE FROM ShoppingCarts WHERE id = @id`, { id: cart.id });
        res.json({
            success: true,
            order: {
                id: orderId,
                orderNumber,
                total,
                status: 'pending',
                paymentStatus: 'pending',
            }
        });
    }
    catch (error) {
        console.error('Checkout error:', error);
        res.status(500).json({ error: 'Failed to process checkout' });
    }
});
// GET /api/storefront/:slug/orders/:orderNumber - Get order details
router.get('/:slug/orders/:orderNumber', async (req, res) => {
    try {
        const { slug, orderNumber } = req.params;
        const store = await (0, db_1.queryOne)(`SELECT id FROM OnlineStores WHERE slug = @slug AND is_active = 1`, { slug });
        if (!store) {
            res.status(404).json({ error: 'Store not found' });
            return;
        }
        const order = await (0, db_1.queryOne)(`SELECT * FROM OnlineOrders WHERE online_store_id = @onlineStoreId AND order_number = @orderNumber`, { onlineStoreId: store.id, orderNumber });
        if (!order) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }
        // Get order items
        const items = await (0, db_1.query)(`SELECT * FROM OnlineOrderItems WHERE order_id = @orderId`, { orderId: order.id });
        // Parse shipping address
        let shippingAddress = {};
        try {
            shippingAddress = JSON.parse(order.shipping_address);
        }
        catch {
            shippingAddress = { addressLine: order.shipping_address };
        }
        res.json({
            order: {
                id: order.id,
                orderNumber: order.order_number,
                status: order.status,
                paymentStatus: order.payment_status,
                paymentMethod: order.payment_method,
                customerEmail: order.customer_email,
                customerName: order.customer_name,
                customerPhone: order.customer_phone,
                shippingAddress,
                subtotal: order.subtotal,
                shippingFee: order.shipping_fee,
                discountAmount: order.discount_amount,
                total: order.total,
                customerNote: order.customer_note,
                createdAt: order.created_at,
                items: items.map((item) => ({
                    id: item.id,
                    productName: item.product_name,
                    productSku: item.product_sku,
                    quantity: item.quantity,
                    unitPrice: item.unit_price,
                    totalPrice: item.total_price,
                })),
            }
        });
    }
    catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ error: 'Failed to get order' });
    }
});
exports.default = router;
//# sourceMappingURL=storefront.js.map