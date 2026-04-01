"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onlineStoreRepository = exports.OnlineStoreRepository = void 0;
const db_1 = require("../db");
/**
 * Online Store repository for managing online store configurations
 */
class OnlineStoreRepository {
    /**
     * Map database record to OnlineStore entity
     */
    mapToEntity(record) {
        return {
            id: record.id,
            storeId: record.store_id,
            slug: record.slug,
            customDomain: record.custom_domain || undefined,
            isActive: record.is_active,
            storeName: record.store_name,
            logo: record.logo || undefined,
            favicon: record.favicon || undefined,
            description: record.description || undefined,
            themeId: record.theme_id,
            primaryColor: record.primary_color,
            secondaryColor: record.secondary_color,
            fontFamily: record.font_family,
            contactEmail: record.contact_email,
            contactPhone: record.contact_phone || undefined,
            address: record.address || undefined,
            facebookUrl: record.facebook_url || undefined,
            instagramUrl: record.instagram_url || undefined,
            currency: record.currency,
            timezone: record.timezone,
            createdAt: record.created_at instanceof Date
                ? record.created_at.toISOString()
                : String(record.created_at),
            updatedAt: record.updated_at instanceof Date
                ? record.updated_at.toISOString()
                : String(record.updated_at),
        };
    }
    /**
     * Find all online stores for a store owner
     */
    async findAll(storeId) {
        const results = await (0, db_1.query)(`SELECT * FROM OnlineStores WHERE store_id = @storeId ORDER BY created_at DESC`, { storeId });
        return results.map((r) => this.mapToEntity(r));
    }
    /**
     * Find online store by ID
     */
    async findById(id, storeId) {
        const result = await (0, db_1.queryOne)(`SELECT * FROM OnlineStores WHERE id = @id AND store_id = @storeId`, { id, storeId });
        return result ? this.mapToEntity(result) : null;
    }
    /**
     * Find online store by slug (for storefront routing)
     */
    async findBySlug(slug) {
        const result = await (0, db_1.queryOne)(`SELECT * FROM OnlineStores WHERE slug = @slug AND is_active = 1`, { slug });
        return result ? this.mapToEntity(result) : null;
    }
    /**
     * Find online store by storeId (for admin management)
     */
    async findByStoreId(storeId) {
        const results = await (0, db_1.query)(`SELECT * FROM OnlineStores WHERE store_id = @storeId ORDER BY created_at DESC`, { storeId });
        return results.map((r) => this.mapToEntity(r));
    }
    /**
     * Check if slug is available
     */
    async isSlugAvailable(slug, excludeId) {
        let queryString = `SELECT 1 FROM OnlineStores WHERE slug = @slug`;
        const params = { slug };
        if (excludeId) {
            queryString += ` AND id != @excludeId`;
            params.excludeId = excludeId;
        }
        const result = await (0, db_1.queryOne)(queryString, params);
        return result === null;
    }
    /**
     * Create a new online store
     */
    async create(data) {
        const id = crypto.randomUUID();
        await (0, db_1.query)(`INSERT INTO OnlineStores (
        id, store_id, slug, custom_domain, is_active, store_name, logo, favicon,
        description, theme_id, primary_color, secondary_color, font_family,
        contact_email, contact_phone, address, facebook_url, instagram_url,
        currency, timezone, created_at, updated_at
      ) VALUES (
        @id, @storeId, @slug, @customDomain, @isActive, @storeName, @logo, @favicon,
        @description, @themeId, @primaryColor, @secondaryColor, @fontFamily,
        @contactEmail, @contactPhone, @address, @facebookUrl, @instagramUrl,
        @currency, @timezone, GETDATE(), GETDATE()
      )`, {
            id,
            storeId: data.storeId,
            slug: data.slug,
            customDomain: data.customDomain || null,
            isActive: data.isActive ?? true,
            storeName: data.storeName,
            logo: data.logo || null,
            favicon: data.favicon || null,
            description: data.description || null,
            themeId: data.themeId || 'default',
            primaryColor: data.primaryColor || '#3B82F6',
            secondaryColor: data.secondaryColor || '#10B981',
            fontFamily: data.fontFamily || 'Inter',
            contactEmail: data.contactEmail,
            contactPhone: data.contactPhone || null,
            address: data.address || null,
            facebookUrl: data.facebookUrl || null,
            instagramUrl: data.instagramUrl || null,
            currency: data.currency || 'VND',
            timezone: data.timezone || 'Asia/Ho_Chi_Minh',
        });
        const created = await this.findById(id, data.storeId);
        if (!created) {
            throw new Error('Failed to create online store');
        }
        return created;
    }
    /**
     * Update an online store
     */
    async update(id, data, storeId) {
        const existing = await this.findById(id, storeId);
        if (!existing) {
            throw new Error('Online store not found');
        }
        await (0, db_1.query)(`UPDATE OnlineStores SET
        slug = @slug,
        custom_domain = @customDomain,
        is_active = @isActive,
        store_name = @storeName,
        logo = @logo,
        favicon = @favicon,
        description = @description,
        theme_id = @themeId,
        primary_color = @primaryColor,
        secondary_color = @secondaryColor,
        font_family = @fontFamily,
        contact_email = @contactEmail,
        contact_phone = @contactPhone,
        address = @address,
        facebook_url = @facebookUrl,
        instagram_url = @instagramUrl,
        currency = @currency,
        timezone = @timezone,
        updated_at = GETDATE()
      WHERE id = @id AND store_id = @storeId`, {
            id,
            storeId,
            slug: data.slug ?? existing.slug,
            customDomain: data.customDomain ?? existing.customDomain ?? null,
            isActive: data.isActive ?? existing.isActive,
            storeName: data.storeName ?? existing.storeName,
            logo: data.logo ?? existing.logo ?? null,
            favicon: data.favicon ?? existing.favicon ?? null,
            description: data.description ?? existing.description ?? null,
            themeId: data.themeId ?? existing.themeId,
            primaryColor: data.primaryColor ?? existing.primaryColor,
            secondaryColor: data.secondaryColor ?? existing.secondaryColor,
            fontFamily: data.fontFamily ?? existing.fontFamily,
            contactEmail: data.contactEmail ?? existing.contactEmail,
            contactPhone: data.contactPhone ?? existing.contactPhone ?? null,
            address: data.address ?? existing.address ?? null,
            facebookUrl: data.facebookUrl ?? existing.facebookUrl ?? null,
            instagramUrl: data.instagramUrl ?? existing.instagramUrl ?? null,
            currency: data.currency ?? existing.currency,
            timezone: data.timezone ?? existing.timezone,
        });
        const updated = await this.findById(id, storeId);
        if (!updated) {
            throw new Error('Failed to update online store');
        }
        return updated;
    }
    /**
     * Deactivate an online store (soft delete)
     */
    async deactivate(id, storeId) {
        const existing = await this.findById(id, storeId);
        if (!existing) {
            throw new Error('Online store not found');
        }
        await (0, db_1.query)(`UPDATE OnlineStores SET is_active = 0, updated_at = GETDATE() WHERE id = @id AND store_id = @storeId`, { id, storeId });
        return true;
    }
    /**
     * Delete an online store
     */
    async delete(id, storeId) {
        const existing = await this.findById(id, storeId);
        if (!existing) {
            throw new Error('Online store not found');
        }
        await (0, db_1.query)(`DELETE FROM OnlineStores WHERE id = @id AND store_id = @storeId`, { id, storeId });
        return true;
    }
    /**
     * Permanently delete an online store and all related data
     */
    async permanentDelete(id, storeId) {
        const existing = await this.findById(id, storeId);
        if (!existing) {
            throw new Error('Online store not found');
        }
        // Delete related data in order (respecting foreign key constraints)
        // 1. Delete order items
        await (0, db_1.query)(`DELETE FROM OnlineOrderItems WHERE order_id IN (SELECT id FROM OnlineOrders WHERE online_store_id = @id)`, { id });
        // 2. Delete orders
        await (0, db_1.query)(`DELETE FROM OnlineOrders WHERE online_store_id = @id`, { id });
        // 3. Delete cart items (table name is CartItems)
        await (0, db_1.query)(`DELETE FROM CartItems WHERE cart_id IN (SELECT id FROM ShoppingCarts WHERE online_store_id = @id)`, { id });
        // 4. Delete carts (table name is ShoppingCarts)
        await (0, db_1.query)(`DELETE FROM ShoppingCarts WHERE online_store_id = @id`, { id });
        // 5. Delete online products
        await (0, db_1.query)(`DELETE FROM OnlineProducts WHERE online_store_id = @id`, { id });
        // 6. Delete shipping zones
        await (0, db_1.query)(`DELETE FROM ShippingZones WHERE online_store_id = @id`, { id });
        // 7. Delete online customers
        await (0, db_1.query)(`DELETE FROM OnlineCustomers WHERE online_store_id = @id`, { id });
        // 8. Finally delete the online store
        await (0, db_1.query)(`DELETE FROM OnlineStores WHERE id = @id AND store_id = @storeId`, { id, storeId });
        return true;
    }
    /**
     * Count online stores for a store owner
     */
    async count(storeId) {
        const result = await (0, db_1.queryOne)(`SELECT COUNT(*) as total FROM OnlineStores WHERE store_id = @storeId`, { storeId });
        return result?.total ?? 0;
    }
}
exports.OnlineStoreRepository = OnlineStoreRepository;
// Export singleton instance
exports.onlineStoreRepository = new OnlineStoreRepository();
//# sourceMappingURL=online-store-repository.js.map