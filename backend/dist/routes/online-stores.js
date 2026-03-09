"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const online_product_repository_1 = require("../repositories/online-product-repository");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use(auth_1.storeContext);
// Helper function to generate slug from name
function generateSlug(name) {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .trim();
}
// POST /api/online-stores - Create a new online store
router.post('/', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { storeName, slug, description, contactEmail, contactPhone, address, logo, favicon, primaryColor, secondaryColor, fontFamily, facebookUrl, instagramUrl, currency, timezone, } = req.body;
        if (!storeName) {
            res.status(400).json({ error: 'Tên cửa hàng online là bắt buộc' });
            return;
        }
        // Generate slug if not provided
        let finalSlug = slug || generateSlug(storeName);
        // Check if slug already exists
        const existingSlug = await (0, db_1.queryOne)('SELECT id FROM OnlineStores WHERE slug = @slug', { slug: finalSlug });
        if (existingSlug) {
            finalSlug = `${finalSlug}-${Date.now()}`;
        }
        // Get store info to use as defaults
        const parentStore = await (0, db_1.queryOne)('SELECT name, phone, address FROM Stores WHERE id = @storeId', { storeId });
        const result = await (0, db_1.query)(`INSERT INTO OnlineStores (
        id, store_id, slug, is_active, store_name, description,
        contact_email, contact_phone, address, logo, favicon,
        primary_color, secondary_color, font_family,
        facebook_url, instagram_url, currency, timezone,
        created_at, updated_at
      )
      OUTPUT INSERTED.*
      VALUES (
        NEWID(), @storeId, @slug, 1, @storeName, @description,
        @contactEmail, @contactPhone, @address, @logo, @favicon,
        @primaryColor, @secondaryColor, @fontFamily,
        @facebookUrl, @instagramUrl, @currency, @timezone,
        GETDATE(), GETDATE()
      )`, {
            storeId,
            slug: finalSlug,
            storeName,
            description: description || null,
            contactEmail: contactEmail || null,
            contactPhone: contactPhone || parentStore?.phone || null,
            address: address || parentStore?.address || null,
            logo: logo || null,
            favicon: favicon || null,
            primaryColor: primaryColor || '#f97316',
            secondaryColor: secondaryColor || '#1f2937',
            fontFamily: fontFamily || 'Inter',
            facebookUrl: facebookUrl || null,
            instagramUrl: instagramUrl || null,
            currency: currency || 'VND',
            timezone: timezone || 'Asia/Ho_Chi_Minh',
        });
        const newStore = result[0];
        res.status(201).json({
            id: newStore.id,
            storeId: newStore.store_id,
            slug: newStore.slug,
            isActive: newStore.is_active,
            storeName: newStore.store_name,
            description: newStore.description,
            contactEmail: newStore.contact_email,
            contactPhone: newStore.contact_phone,
            address: newStore.address,
            logo: newStore.logo,
            favicon: newStore.favicon,
            primaryColor: newStore.primary_color,
            secondaryColor: newStore.secondary_color,
            fontFamily: newStore.font_family,
            facebookUrl: newStore.facebook_url,
            instagramUrl: newStore.instagram_url,
            currency: newStore.currency,
            timezone: newStore.timezone,
            createdAt: newStore.created_at,
            updatedAt: newStore.updated_at,
        });
    }
    catch (error) {
        console.error('Create online store error:', error);
        res.status(500).json({ error: 'Failed to create online store' });
    }
});
// DELETE /api/online-stores/:id - Delete an online store
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        // Verify online store belongs to this store
        const existing = await (0, db_1.queryOne)('SELECT id FROM OnlineStores WHERE id = @id AND store_id = @storeId', { id, storeId });
        if (!existing) {
            res.status(404).json({ error: 'Không tìm thấy cửa hàng online' });
            return;
        }
        // Delete related data first
        await (0, db_1.query)('DELETE FROM OnlineProducts WHERE online_store_id = @id', { id });
        await (0, db_1.query)('DELETE FROM OnlineOrders WHERE online_store_id = @id', { id });
        await (0, db_1.query)('DELETE FROM ShoppingCarts WHERE online_store_id = @id', { id });
        // Delete the online store
        await (0, db_1.query)('DELETE FROM OnlineStores WHERE id = @id AND store_id = @storeId', { id, storeId });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Delete online store error:', error);
        res.status(500).json({ error: 'Failed to delete online store' });
    }
});
// GET /api/online-stores
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        // Get all online stores belonging to any physical store the user has access to
        // Include stores even if physical store is inactive
        const stores = await (0, db_1.query)(`SELECT os.*,
        s.name as physical_store_name,
        s.status as physical_store_status,
        (SELECT COUNT(*) FROM OnlineProducts WHERE online_store_id = os.id) as product_count,
        (SELECT COUNT(*) FROM OnlineOrders WHERE online_store_id = os.id) as order_count
       FROM OnlineStores os
       LEFT JOIN Stores s ON os.store_id = s.id
       LEFT JOIN UserStores us ON s.id = us.store_id
       WHERE us.user_id = @userId OR s.id IS NULL
       ORDER BY os.created_at DESC`, { userId });
        res.json(stores.map((s) => ({
            id: s.id,
            storeId: s.store_id,
            physicalStoreName: s.physical_store_name,
            physicalStoreStatus: s.physical_store_status,
            slug: s.slug,
            customDomain: s.custom_domain,
            isActive: s.is_active,
            storeName: s.store_name,
            logo: s.logo,
            favicon: s.favicon,
            description: s.description,
            themeId: s.theme_id,
            primaryColor: s.primary_color,
            secondaryColor: s.secondary_color,
            fontFamily: s.font_family,
            contactEmail: s.contact_email,
            contactPhone: s.contact_phone,
            address: s.address,
            facebookUrl: s.facebook_url,
            instagramUrl: s.instagram_url,
            currency: s.currency,
            timezone: s.timezone,
            createdAt: s.created_at,
            updatedAt: s.updated_at,
            productCount: s.product_count || 0,
            orderCount: s.order_count || 0,
        })));
    }
    catch (error) {
        console.error('Get online stores error:', error);
        res.status(500).json({ error: 'Failed to get online stores' });
    }
});
// GET /api/online-stores/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const s = await (0, db_1.queryOne)('SELECT * FROM OnlineStores WHERE id = @id AND store_id = @storeId', { id, storeId });
        if (!s) {
            res.status(404).json({ error: 'Online store not found' });
            return;
        }
        res.json({
            id: s.id,
            storeId: s.store_id,
            slug: s.slug,
            customDomain: s.custom_domain,
            isActive: s.is_active,
            storeName: s.store_name,
            logo: s.logo,
            favicon: s.favicon,
            description: s.description,
            themeId: s.theme_id,
            primaryColor: s.primary_color,
            secondaryColor: s.secondary_color,
            fontFamily: s.font_family,
            contactEmail: s.contact_email,
            contactPhone: s.contact_phone,
            address: s.address,
            facebookUrl: s.facebook_url,
            instagramUrl: s.instagram_url,
            currency: s.currency,
            timezone: s.timezone,
            createdAt: s.created_at,
            updatedAt: s.updated_at,
        });
    }
    catch (error) {
        console.error('Get online store error:', error);
        res.status(500).json({ error: 'Failed to get online store' });
    }
});
// PUT /api/online-stores/:id - Update an online store
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const { slug, customDomain, isActive, storeName, logo, favicon, description, themeId, primaryColor, secondaryColor, fontFamily, contactEmail, contactPhone, address, facebookUrl, instagramUrl, currency, timezone } = req.body;
        // Verify online store belongs to this store
        const existing = await (0, db_1.queryOne)('SELECT id FROM OnlineStores WHERE id = @id AND store_id = @storeId', { id, storeId });
        if (!existing) {
            res.status(404).json({ error: 'Online store not found' });
            return;
        }
        await (0, db_1.query)(`UPDATE OnlineStores SET
        slug = COALESCE(@slug, slug),
        custom_domain = @customDomain,
        is_active = COALESCE(@isActive, is_active),
        store_name = COALESCE(@storeName, store_name),
        logo = @logo,
        favicon = @favicon,
        description = @description,
        theme_id = COALESCE(@themeId, theme_id),
        primary_color = COALESCE(@primaryColor, primary_color),
        secondary_color = COALESCE(@secondaryColor, secondary_color),
        font_family = COALESCE(@fontFamily, font_family),
        contact_email = COALESCE(@contactEmail, contact_email),
        contact_phone = @contactPhone,
        address = @address,
        facebook_url = @facebookUrl,
        instagram_url = @instagramUrl,
        currency = COALESCE(@currency, currency),
        timezone = COALESCE(@timezone, timezone),
        updated_at = GETDATE()
      WHERE id = @id AND store_id = @storeId`, {
            id, storeId, slug, customDomain, isActive, storeName, logo, favicon,
            description, themeId, primaryColor, secondaryColor, fontFamily,
            contactEmail, contactPhone, address, facebookUrl, instagramUrl,
            currency, timezone
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Update online store error:', error);
        res.status(500).json({ error: 'Failed to update online store' });
    }
});
// GET /api/online-stores/:id/products - Get all products for an online store
router.get('/:id/products', async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        // Verify online store belongs to this store
        const onlineStore = await (0, db_1.queryOne)('SELECT id FROM OnlineStores WHERE id = @id AND store_id = @storeId', { id, storeId });
        if (!onlineStore) {
            res.status(404).json({ error: 'Online store not found' });
            return;
        }
        const products = await online_product_repository_1.onlineProductRepository.findAllWithDetails(id);
        res.json(products);
    }
    catch (error) {
        console.error('Get online store products error:', error);
        res.status(500).json({ error: 'Failed to get online store products' });
    }
});
// POST /api/online-stores/:id/sync - Sync products from main store to online store (with optional category filter)
router.post('/:id/sync', async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const { categoryId } = req.body; // Optional: filter by category
        // Verify online store belongs to this store and get its store_id
        const onlineStore = await (0, db_1.queryOne)('SELECT id, store_id FROM OnlineStores WHERE id = @id AND store_id = @storeId', { id, storeId });
        if (!onlineStore) {
            res.status(404).json({ error: 'Online store not found' });
            return;
        }
        // Use the online store's store_id to get products
        const physicalStoreId = onlineStore.store_id;
        // Build query - optionally filter by category
        let productQuery = `
      SELECT id, name, description, price, images, category_id 
      FROM Products 
      WHERE store_id = @physicalStoreId
    `;
        const params = { physicalStoreId };
        if (categoryId) {
            productQuery += ` AND category_id = @categoryId`;
            params.categoryId = categoryId;
        }
        const products = await (0, db_1.query)(productQuery, params);
        let synced = 0;
        let skipped = 0;
        for (const product of products) {
            // Check if product already exists in online store
            const existing = await online_product_repository_1.onlineProductRepository.findByProductId(product.id, id);
            if (existing) {
                skipped++;
                continue;
            }
            // Generate unique slug
            let baseSlug = generateSlug(product.name);
            let slug = baseSlug;
            let counter = 1;
            while (!(await online_product_repository_1.onlineProductRepository.isSlugAvailable(slug, id))) {
                slug = `${baseSlug}-${counter}`;
                counter++;
            }
            // Create online product with category_id
            await (0, db_1.query)(`INSERT INTO OnlineProducts (
          id, online_store_id, product_id, category_id, is_published, online_price, 
          online_description, display_order, seo_slug, images, created_at, updated_at
        ) VALUES (
          NEWID(), @onlineStoreId, @productId, @categoryId, 1, @price,
          @description, @displayOrder, @seoSlug, @images, GETDATE(), GETDATE()
        )`, {
                onlineStoreId: id,
                productId: product.id,
                categoryId: product.category_id,
                price: product.price,
                description: product.description,
                displayOrder: synced,
                seoSlug: slug,
                images: product.images,
            });
            synced++;
        }
        const categoryName = categoryId
            ? (await (0, db_1.queryOne)('SELECT name FROM Categories WHERE id = @categoryId', { categoryId }))?.name
            : 'tất cả';
        res.json({
            success: true,
            message: `Đã đồng bộ ${synced} sản phẩm (${categoryName}), bỏ qua ${skipped} sản phẩm đã tồn tại`,
            synced,
            skipped,
            total: products.length,
        });
    }
    catch (error) {
        console.error('Sync products error:', error);
        res.status(500).json({ error: 'Failed to sync products' });
    }
});
// POST /api/online-stores/:id/products - Add a single product to online store
router.post('/:id/products', async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const { productId, isPublished, onlinePrice, onlineDescription, seoSlug } = req.body;
        // Verify online store belongs to this store
        const onlineStore = await (0, db_1.queryOne)('SELECT id FROM OnlineStores WHERE id = @id AND store_id = @storeId', { id, storeId });
        if (!onlineStore) {
            res.status(404).json({ error: 'Online store not found' });
            return;
        }
        // Verify product belongs to this store
        const product = await (0, db_1.queryOne)('SELECT id, name, price FROM Products WHERE id = @productId AND store_id = @storeId', { productId, storeId });
        if (!product) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        // Check if already exists
        const existing = await online_product_repository_1.onlineProductRepository.findByProductId(productId, id);
        if (existing) {
            res.status(400).json({ error: 'Product already exists in online store' });
            return;
        }
        // Generate slug if not provided
        let slug = seoSlug || generateSlug(product.name);
        let counter = 1;
        const baseSlug = slug;
        while (!(await online_product_repository_1.onlineProductRepository.isSlugAvailable(slug, id))) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }
        const onlineProduct = await online_product_repository_1.onlineProductRepository.create({
            onlineStoreId: id,
            productId,
            isPublished: isPublished ?? true,
            onlinePrice: onlinePrice ?? product.price,
            onlineDescription,
            displayOrder: 0,
            seoSlug: slug,
        });
        res.status(201).json(onlineProduct);
    }
    catch (error) {
        console.error('Add online product error:', error);
        res.status(500).json({ error: 'Failed to add product to online store' });
    }
});
// DELETE /api/online-stores/:id/products/:productId - Remove product from online store
router.delete('/:id/products/:productId', async (req, res) => {
    try {
        const { id, productId } = req.params;
        const storeId = req.storeId;
        // Verify online store belongs to this store
        const onlineStore = await (0, db_1.queryOne)('SELECT id FROM OnlineStores WHERE id = @id AND store_id = @storeId', { id, storeId });
        if (!onlineStore) {
            res.status(404).json({ error: 'Online store not found' });
            return;
        }
        await online_product_repository_1.onlineProductRepository.delete(productId, id);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Delete online product error:', error);
        res.status(500).json({ error: 'Failed to remove product from online store' });
    }
});
// PUT /api/online-stores/:id/products/:productId - Update an online product
router.put('/:id/products/:productId', async (req, res) => {
    try {
        const { id, productId } = req.params;
        const storeId = req.storeId;
        const { isPublished, onlinePrice, onlineDescription, seoSlug, seoTitle, seoDescription, displayOrder, images } = req.body;
        // Verify online store belongs to this store
        const onlineStore = await (0, db_1.queryOne)('SELECT id FROM OnlineStores WHERE id = @id AND store_id = @storeId', { id, storeId });
        if (!onlineStore) {
            res.status(404).json({ error: 'Online store not found' });
            return;
        }
        const updated = await online_product_repository_1.onlineProductRepository.update(productId, {
            isPublished,
            onlinePrice,
            onlineDescription,
            seoSlug,
            seoTitle,
            seoDescription,
            displayOrder,
            images,
        }, id);
        res.json(updated);
    }
    catch (error) {
        console.error('Update online product error:', error);
        res.status(500).json({ error: 'Failed to update online product' });
    }
});
exports.default = router;
//# sourceMappingURL=online-stores.js.map