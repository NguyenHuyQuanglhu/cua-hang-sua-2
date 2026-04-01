"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onlineProductRepository = exports.OnlineProductRepository = void 0;
const db_1 = require("../db");
/**
 * Online Product repository for managing online product catalog
 */
class OnlineProductRepository {
    /**
     * Map database record to OnlineProduct entity
     */
    mapToEntity(record) {
        return {
            id: record.id,
            onlineStoreId: record.online_store_id,
            productId: record.product_id,
            isPublished: record.is_published,
            onlinePrice: record.online_price ?? undefined,
            onlineDescription: record.online_description || undefined,
            displayOrder: record.display_order,
            seoTitle: record.seo_title || undefined,
            seoDescription: record.seo_description || undefined,
            seoSlug: record.seo_slug,
            images: record.images || undefined,
            createdAt: record.created_at instanceof Date
                ? record.created_at.toISOString()
                : String(record.created_at),
            updatedAt: record.updated_at instanceof Date
                ? record.updated_at.toISOString()
                : String(record.updated_at),
        };
    }
    /**
     * Map database record to OnlineProductWithDetails entity
     */
    mapToEntityWithDetails(record) {
        return {
            ...this.mapToEntity(record),
            productName: record.product_name,
            productSku: record.product_sku || undefined,
            productPrice: record.product_price,
            stockQuantity: record.stock_quantity,
            categoryName: record.category_name || undefined,
        };
    }
    /**
     * Find all online products for an online store
     */
    async findAll(onlineStoreId) {
        const results = await (0, db_1.query)(`SELECT * FROM OnlineProducts WHERE online_store_id = @onlineStoreId ORDER BY display_order ASC`, { onlineStoreId });
        return results.map((r) => this.mapToEntity(r));
    }
    /**
     * Find all online products with inventory product details
     */
    async findAllWithDetails(onlineStoreId) {
        const results = await (0, db_1.query)(`SELECT op.*, p.name as product_name, p.sku as product_sku, p.price as product_price,
              p.stock_quantity, c.name as category_name
       FROM OnlineProducts op
       INNER JOIN Products p ON op.product_id = p.id
       LEFT JOIN Categories c ON p.category_id = c.id
       WHERE op.online_store_id = @onlineStoreId
       ORDER BY op.display_order ASC`, { onlineStoreId });
        return results.map((r) => this.mapToEntityWithDetails(r));
    }
    /**
     * Find published products for storefront display
     */
    async findPublished(onlineStoreId) {
        const results = await (0, db_1.query)(`SELECT op.*, p.name as product_name, p.sku as product_sku, p.price as product_price,
              p.stock_quantity, c.name as category_name
       FROM OnlineProducts op
       INNER JOIN Products p ON op.product_id = p.id
       LEFT JOIN Categories c ON p.category_id = c.id
       WHERE op.online_store_id = @onlineStoreId AND op.is_published = 1
       ORDER BY op.display_order ASC`, { onlineStoreId });
        return results.map((r) => this.mapToEntityWithDetails(r));
    }
    /**
     * Find online product by ID
     */
    async findById(id, onlineStoreId) {
        const result = await (0, db_1.queryOne)(`SELECT * FROM OnlineProducts WHERE id = @id AND online_store_id = @onlineStoreId`, { id, onlineStoreId });
        return result ? this.mapToEntity(result) : null;
    }
    /**
     * Find online product by SEO slug (for storefront routing)
     */
    async findBySlug(seoSlug, onlineStoreId) {
        const result = await (0, db_1.queryOne)(`SELECT op.*, p.name as product_name, p.sku as product_sku, p.price as product_price,
              p.stock_quantity, c.name as category_name
       FROM OnlineProducts op
       INNER JOIN Products p ON op.product_id = p.id
       LEFT JOIN Categories c ON p.category_id = c.id
       WHERE op.seo_slug = @seoSlug AND op.online_store_id = @onlineStoreId AND op.is_published = 1`, { seoSlug, onlineStoreId });
        return result ? this.mapToEntityWithDetails(result) : null;
    }
    /**
     * Find online product by inventory product ID
     */
    async findByProductId(productId, onlineStoreId) {
        const result = await (0, db_1.queryOne)(`SELECT * FROM OnlineProducts WHERE product_id = @productId AND online_store_id = @onlineStoreId`, { productId, onlineStoreId });
        return result ? this.mapToEntity(result) : null;
    }
    /**
     * Check if SEO slug is available
     */
    async isSlugAvailable(seoSlug, onlineStoreId, excludeId) {
        let queryString = `SELECT 1 FROM OnlineProducts WHERE seo_slug = @seoSlug AND online_store_id = @onlineStoreId`;
        const params = { seoSlug, onlineStoreId };
        if (excludeId) {
            queryString += ` AND id != @excludeId`;
            params.excludeId = excludeId;
        }
        const result = await (0, db_1.queryOne)(queryString, params);
        return result === null;
    }
    /**
     * Create a new online product
     */
    async create(data) {
        const id = crypto.randomUUID();
        await (0, db_1.query)(`INSERT INTO OnlineProducts (
        id, online_store_id, product_id, is_published, online_price, online_description,
        display_order, seo_title, seo_description, seo_slug, images, created_at, updated_at
      ) VALUES (
        @id, @onlineStoreId, @productId, @isPublished, @onlinePrice, @onlineDescription,
        @displayOrder, @seoTitle, @seoDescription, @seoSlug, @images, GETDATE(), GETDATE()
      )`, {
            id,
            onlineStoreId: data.onlineStoreId,
            productId: data.productId,
            isPublished: data.isPublished ?? false,
            onlinePrice: data.onlinePrice ?? null,
            onlineDescription: data.onlineDescription || null,
            displayOrder: data.displayOrder ?? 0,
            seoTitle: data.seoTitle || null,
            seoDescription: data.seoDescription || null,
            seoSlug: data.seoSlug,
            images: data.images || null,
        });
        const created = await this.findById(id, data.onlineStoreId);
        if (!created) {
            throw new Error('Failed to create online product');
        }
        return created;
    }
    /**
     * Update an online product
     */
    async update(id, data, onlineStoreId) {
        const existing = await this.findById(id, onlineStoreId);
        if (!existing) {
            throw new Error('Online product not found');
        }
        await (0, db_1.query)(`UPDATE OnlineProducts SET
        is_published = @isPublished,
        online_price = @onlinePrice,
        online_description = @onlineDescription,
        display_order = @displayOrder,
        seo_title = @seoTitle,
        seo_description = @seoDescription,
        seo_slug = @seoSlug,
        images = @images,
        updated_at = GETDATE()
      WHERE id = @id AND online_store_id = @onlineStoreId`, {
            id,
            onlineStoreId,
            isPublished: data.isPublished ?? existing.isPublished,
            onlinePrice: data.onlinePrice ?? existing.onlinePrice ?? null,
            onlineDescription: data.onlineDescription ?? existing.onlineDescription ?? null,
            displayOrder: data.displayOrder ?? existing.displayOrder,
            seoTitle: data.seoTitle ?? existing.seoTitle ?? null,
            seoDescription: data.seoDescription ?? existing.seoDescription ?? null,
            seoSlug: data.seoSlug ?? existing.seoSlug,
            images: data.images ?? existing.images ?? null,
        });
        const updated = await this.findById(id, onlineStoreId);
        if (!updated) {
            throw new Error('Failed to update online product');
        }
        return updated;
    }
    /**
     * Sync online product with inventory product
     */
    async syncWithInventory(id, onlineStoreId) {
        const existing = await this.findById(id, onlineStoreId);
        if (!existing) {
            throw new Error('Online product not found');
        }
        // Get the latest product info from inventory
        const productInfo = await (0, db_1.queryOne)(`SELECT name, description, price, images FROM Products WHERE id = @productId`, { productId: existing.productId });
        if (!productInfo) {
            throw new Error('Inventory product not found');
        }
        // Update online product with inventory data (only if online-specific values are not set)
        await (0, db_1.query)(`UPDATE OnlineProducts SET
        online_description = COALESCE(online_description, @description),
        images = COALESCE(images, @images),
        updated_at = GETDATE()
      WHERE id = @id AND online_store_id = @onlineStoreId`, {
            id,
            onlineStoreId,
            description: productInfo.description,
            images: productInfo.images,
        });
        const updated = await this.findById(id, onlineStoreId);
        if (!updated) {
            throw new Error('Failed to sync online product');
        }
        return updated;
    }
    /**
     * Delete an online product
     */
    async delete(id, onlineStoreId) {
        const existing = await this.findById(id, onlineStoreId);
        if (!existing) {
            throw new Error('Online product not found');
        }
        await (0, db_1.query)(`DELETE FROM OnlineProducts WHERE id = @id AND online_store_id = @onlineStoreId`, { id, onlineStoreId });
        return true;
    }
    /**
     * Bulk publish/unpublish products
     */
    async bulkUpdatePublishStatus(ids, isPublished, onlineStoreId) {
        if (ids.length === 0)
            return 0;
        // Build parameterized query for multiple IDs
        const idParams = ids.map((_, i) => `@id${i}`).join(', ');
        const params = { onlineStoreId, isPublished };
        ids.forEach((id, i) => {
            params[`id${i}`] = id;
        });
        await (0, db_1.query)(`UPDATE OnlineProducts SET is_published = @isPublished, updated_at = GETDATE()
       WHERE online_store_id = @onlineStoreId AND id IN (${idParams})`, params);
        return ids.length;
    }
    /**
     * Count online products for an online store
     */
    async count(onlineStoreId, publishedOnly) {
        let queryString = `SELECT COUNT(*) as total FROM OnlineProducts WHERE online_store_id = @onlineStoreId`;
        if (publishedOnly) {
            queryString += ` AND is_published = 1`;
        }
        const result = await (0, db_1.queryOne)(queryString, { onlineStoreId });
        return result?.total ?? 0;
    }
}
exports.OnlineProductRepository = OnlineProductRepository;
// Export singleton instance
exports.onlineProductRepository = new OnlineProductRepository();
//# sourceMappingURL=online-product-repository.js.map