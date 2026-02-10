"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shippingZoneRepository = exports.ShippingZoneRepository = void 0;
const db_1 = require("../db");
/**
 * Shipping Zone repository for managing shipping zones and calculating fees
 */
class ShippingZoneRepository {
    /**
     * Map database record to ShippingZone entity
     */
    mapToEntity(record) {
        let provinces;
        try {
            provinces = JSON.parse(record.provinces);
        }
        catch {
            provinces = [];
        }
        return {
            id: record.id,
            onlineStoreId: record.online_store_id,
            name: record.name,
            provinces,
            flatRate: record.flat_rate ?? undefined,
            freeShippingThreshold: record.free_shipping_threshold ?? undefined,
            isActive: record.is_active,
            createdAt: record.created_at instanceof Date
                ? record.created_at.toISOString()
                : String(record.created_at),
            updatedAt: record.updated_at instanceof Date
                ? record.updated_at.toISOString()
                : String(record.updated_at),
        };
    }
    /**
     * Find all shipping zones for an online store
     */
    async findAll(onlineStoreId) {
        const results = await (0, db_1.query)(`SELECT * FROM ShippingZones WHERE online_store_id = @onlineStoreId ORDER BY name ASC`, { onlineStoreId });
        return results.map((r) => this.mapToEntity(r));
    }
    /**
     * Find active shipping zones
     */
    async findActive(onlineStoreId) {
        const results = await (0, db_1.query)(`SELECT * FROM ShippingZones WHERE online_store_id = @onlineStoreId AND is_active = 1 ORDER BY name ASC`, { onlineStoreId });
        return results.map((r) => this.mapToEntity(r));
    }
    /**
     * Find shipping zone by ID
     */
    async findById(id, onlineStoreId) {
        const result = await (0, db_1.queryOne)(`SELECT * FROM ShippingZones WHERE id = @id AND online_store_id = @onlineStoreId`, { id, onlineStoreId });
        return result ? this.mapToEntity(result) : null;
    }
    /**
     * Find shipping zone by province
     */
    async findByProvince(province, onlineStoreId) {
        // Get all active zones and check if province is in the list
        const zones = await this.findActive(onlineStoreId);
        for (const zone of zones) {
            if (zone.provinces.includes(province)) {
                return zone;
            }
        }
        return null;
    }
    /**
     * Create a new shipping zone
     */
    async create(data) {
        const id = crypto.randomUUID();
        await (0, db_1.query)(`INSERT INTO ShippingZones (
        id, online_store_id, name, provinces, flat_rate, free_shipping_threshold,
        is_active, created_at, updated_at
      ) VALUES (
        @id, @onlineStoreId, @name, @provinces, @flatRate, @freeShippingThreshold,
        @isActive, GETDATE(), GETDATE()
      )`, {
            id,
            onlineStoreId: data.onlineStoreId,
            name: data.name,
            provinces: JSON.stringify(data.provinces),
            flatRate: data.flatRate ?? null,
            freeShippingThreshold: data.freeShippingThreshold ?? null,
            isActive: data.isActive ?? true,
        });
        const created = await this.findById(id, data.onlineStoreId);
        if (!created) {
            throw new Error('Failed to create shipping zone');
        }
        return created;
    }
    /**
     * Update a shipping zone
     */
    async update(id, data, onlineStoreId) {
        const existing = await this.findById(id, onlineStoreId);
        if (!existing) {
            throw new Error('Shipping zone not found');
        }
        await (0, db_1.query)(`UPDATE ShippingZones SET
        name = @name,
        provinces = @provinces,
        flat_rate = @flatRate,
        free_shipping_threshold = @freeShippingThreshold,
        is_active = @isActive,
        updated_at = GETDATE()
      WHERE id = @id AND online_store_id = @onlineStoreId`, {
            id,
            onlineStoreId,
            name: data.name ?? existing.name,
            provinces: JSON.stringify(data.provinces ?? existing.provinces),
            flatRate: data.flatRate ?? existing.flatRate ?? null,
            freeShippingThreshold: data.freeShippingThreshold ?? existing.freeShippingThreshold ?? null,
            isActive: data.isActive ?? existing.isActive,
        });
        const updated = await this.findById(id, onlineStoreId);
        if (!updated) {
            throw new Error('Failed to update shipping zone');
        }
        return updated;
    }
    /**
     * Delete a shipping zone
     */
    async delete(id, onlineStoreId) {
        const existing = await this.findById(id, onlineStoreId);
        if (!existing) {
            throw new Error('Shipping zone not found');
        }
        await (0, db_1.query)(`DELETE FROM ShippingZones WHERE id = @id AND online_store_id = @onlineStoreId`, { id, onlineStoreId });
        return true;
    }
    /**
     * Activate/deactivate a shipping zone
     */
    async setActive(id, isActive, onlineStoreId) {
        const existing = await this.findById(id, onlineStoreId);
        if (!existing) {
            throw new Error('Shipping zone not found');
        }
        await (0, db_1.query)(`UPDATE ShippingZones SET is_active = @isActive, updated_at = GETDATE() WHERE id = @id AND online_store_id = @onlineStoreId`, { id, onlineStoreId, isActive });
        const updated = await this.findById(id, onlineStoreId);
        if (!updated) {
            throw new Error('Failed to update shipping zone');
        }
        return updated;
    }
    /**
     * Calculate shipping fee by province
     */
    async calculateShippingFee(province, orderTotal, onlineStoreId) {
        const zone = await this.findByProvince(province, onlineStoreId);
        if (!zone) {
            return null;
        }
        // Check if order qualifies for free shipping
        const isFreeShipping = zone.freeShippingThreshold !== undefined &&
            orderTotal >= zone.freeShippingThreshold;
        const fee = isFreeShipping ? 0 : (zone.flatRate ?? 0);
        return {
            zoneId: zone.id,
            zoneName: zone.name,
            fee,
            isFreeShipping,
            freeShippingThreshold: zone.freeShippingThreshold,
        };
    }
    /**
     * Get all provinces covered by shipping zones
     */
    async getCoveredProvinces(onlineStoreId) {
        const zones = await this.findActive(onlineStoreId);
        const provinces = new Set();
        for (const zone of zones) {
            for (const province of zone.provinces) {
                provinces.add(province);
            }
        }
        return Array.from(provinces).sort();
    }
    /**
     * Check if province is covered by any shipping zone
     */
    async isProvinceCovered(province, onlineStoreId) {
        const zone = await this.findByProvince(province, onlineStoreId);
        return zone !== null;
    }
}
exports.ShippingZoneRepository = ShippingZoneRepository;
// Export singleton instance
exports.shippingZoneRepository = new ShippingZoneRepository();
//# sourceMappingURL=shipping-zone-repository.js.map