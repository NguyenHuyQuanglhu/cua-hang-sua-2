"use strict";
/**
 * Units SP Repository
 *
 * Repository for unit operations using stored procedures.
 * Implements CRUD operations via sp_Units_* stored procedures.
 * Requirements: 8.1-8.4
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.unitsSPRepository = exports.UnitsSPRepository = void 0;
const sp_base_repository_1 = require("./sp-base-repository");
/**
 * Units repository using stored procedures
 */
class UnitsSPRepository extends sp_base_repository_1.SPBaseRepository {
    tableName = 'Units';
    /**
     * Map database record to Unit entity
     */
    mapToEntity(record) {
        return {
            id: record.id || record.Id || '',
            storeId: record.store_id || record.storeId || '',
            name: record.name,
            description: record.description || undefined,
            baseUnitId: record.base_unit_id || record.baseUnitId || undefined,
            conversionFactor: record.conversion_factor ?? record.conversionFactor ?? 1,
            createdAt: (record.created_at || record.createdAt)
                ? (record.created_at || record.createdAt) instanceof Date
                    ? (record.created_at || record.createdAt).toISOString()
                    : String(record.created_at || record.createdAt)
                : undefined,
            updatedAt: (record.updated_at || record.updatedAt)
                ? (record.updated_at || record.updatedAt) instanceof Date
                    ? (record.updated_at || record.updatedAt).toISOString()
                    : String(record.updated_at || record.updatedAt)
                : undefined,
        };
    }
    /**
     * Create a new unit using sp_Units_Create
     * Requirements: 8.1
     *
     * @param input - Unit data to create
     * @returns Created unit
     */
    async create(input) {
        const id = input.id || crypto.randomUUID();
        const params = {
            id,
            storeId: input.storeId,
            name: input.name,
            description: input.description || null,
            baseUnitId: input.baseUnitId || null,
            conversionFactor: input.conversionFactor ?? 1,
        };
        // sp_Units_Create returns the created unit directly
        const result = await this.executeSPSingle('sp_Units_Create', params);
        if (result) {
            return this.mapToEntity(result);
        }
        // Fallback: fetch by id (case-insensitive comparison)
        const units = await this.getByStore(input.storeId);
        const unit = units.find((u) => u.id.toLowerCase() === id.toLowerCase());
        if (!unit) {
            throw new Error('Failed to create unit');
        }
        return unit;
    }
    /**
     * Update a unit using sp_Units_Update
     * Requirements: 8.2
     *
     * @param id - Unit ID
     * @param storeId - Store ID
     * @param data - Fields to update
     * @returns Updated unit or null if not found
     */
    async update(id, storeId, data) {
        const params = {
            id,
            storeId,
            name: data.name,
            description: data.description,
            baseUnitId: data.baseUnitId,
            conversionFactor: data.conversionFactor,
        };
        const result = await this.executeSPSingle('sp_Units_Update', params);
        if (!result || result.AffectedRows === 0) {
            return null;
        }
        return this.getById(id, storeId);
    }
    /**
     * Delete a unit using sp_Units_Delete
     * Requirements: 8.3
     *
     * @param id - Unit ID
     * @param storeId - Store ID
     * @returns True if deleted, false if not found
     */
    async delete(id, storeId) {
        const result = await this.executeSPSingle('sp_Units_Delete', { id, storeId });
        return (result?.AffectedRows ?? 0) > 0;
    }
    /**
     * Get all units for a store using sp_Units_GetByStore
     * Requirements: 8.4
     *
     * @param storeId - Store ID
     * @returns Array of units
     */
    async getByStore(storeId) {
        const params = {
            storeId,
        };
        const results = await this.executeSP('sp_Units_GetByStore', params);
        return results.map((r) => this.mapToEntity(r));
    }
    /**
     * Get a single unit by ID
     *
     * @param id - Unit ID
     * @param storeId - Store ID
     * @returns Unit or null if not found
     */
    async getById(id, storeId) {
        const units = await this.getByStore(storeId);
        return units.find((u) => u.id.toLowerCase() === id.toLowerCase()) || null;
    }
    /**
     * Find unit by name within a store
     *
     * @param name - Unit name
     * @param storeId - Store ID
     * @returns Unit or null if not found
     */
    async findByName(name, storeId) {
        const units = await this.getByStore(storeId);
        return units.find((u) => u.name.toLowerCase() === name.toLowerCase()) || null;
    }
    /**
     * Check if unit name exists (for validation)
     *
     * @param name - Unit name
     * @param storeId - Store ID
     * @param excludeId - Optional ID to exclude from check
     * @returns True if name exists
     */
    async nameExists(name, storeId, excludeId) {
        const units = await this.getByStore(storeId);
        return units.some((u) => u.name.toLowerCase() === name.toLowerCase() && u.id !== excludeId);
    }
    /**
     * Get base units only (units without a base unit reference)
     *
     * @param storeId - Store ID
     * @returns Array of base units
     */
    async getBaseUnits(storeId) {
        const units = await this.getByStore(storeId);
        return units.filter((u) => !u.baseUnitId);
    }
    /**
     * Convert quantity from one unit to another
     *
     * @param quantity - Quantity to convert
     * @param fromUnitId - Source unit ID
     * @param toUnitId - Target unit ID
     * @param storeId - Store ID
     * @returns Converted quantity or null if conversion not possible
     */
    async convertQuantity(quantity, fromUnitId, toUnitId, storeId) {
        if (fromUnitId === toUnitId) {
            return quantity;
        }
        const fromUnit = await this.getById(fromUnitId, storeId);
        const toUnit = await this.getById(toUnitId, storeId);
        if (!fromUnit || !toUnit) {
            return null;
        }
        // Check if units share the same base
        const fromBaseId = fromUnit.baseUnitId || fromUnitId;
        const toBaseId = toUnit.baseUnitId || toUnitId;
        if (fromBaseId !== toBaseId) {
            return null;
        }
        const fromFactor = fromUnit.conversionFactor;
        const toFactor = toUnit.conversionFactor;
        return (quantity * fromFactor) / toFactor;
    }
}
exports.UnitsSPRepository = UnitsSPRepository;
// Export singleton instance
exports.unitsSPRepository = new UnitsSPRepository();
//# sourceMappingURL=units-sp-repository.js.map