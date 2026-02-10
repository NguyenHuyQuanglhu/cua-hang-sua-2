"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unitRepository = exports.UnitRepository = void 0;
/**
 * @deprecated This repository uses inline SQL queries.
 * For new code, use UnitsSPRepository from './units-sp-repository' which uses stored procedures.
 * This file is kept for backward compatibility and type exports.
 * Requirements: 8.1-8.4 - All unit operations should use stored procedures.
 */
const base_repository_1 = require("./base-repository");
const db_1 = require("../db");
/**
 * Unit repository for managing measurement units
 */
class UnitRepository extends base_repository_1.BaseRepository {
    constructor() {
        super('Units', 'id');
    }
    /**
     * Map database record to Unit entity
     */
    mapToEntity(record) {
        const r = record;
        return {
            id: r.id,
            storeId: r.store_id,
            name: r.name,
            description: r.description || undefined,
            baseUnitId: r.base_unit_id || undefined,
            conversionFactor: r.conversion_factor ?? 1,
        };
    }
    /**
     * Map Unit entity to database record
     */
    mapToRecord(entity) {
        const record = {};
        if (entity.id !== undefined)
            record.id = entity.id;
        if (entity.storeId !== undefined)
            record.store_id = entity.storeId;
        if (entity.name !== undefined)
            record.name = entity.name;
        if (entity.description !== undefined)
            record.description = entity.description || null;
        if (entity.baseUnitId !== undefined)
            record.base_unit_id = entity.baseUnitId || null;
        if (entity.conversionFactor !== undefined)
            record.conversion_factor = entity.conversionFactor;
        return record;
    }
    /**
     * Find all units for a store
     */
    async findAll(storeId, options) {
        let queryString = `SELECT * FROM Units WHERE store_id = @storeId`;
        if (options?.orderBy) {
            const direction = options.orderDirection || 'ASC';
            queryString += ` ORDER BY ${options.orderBy} ${direction}`;
        }
        else {
            queryString += ` ORDER BY name ASC`;
        }
        const results = await (0, db_1.query)(queryString, { storeId });
        return results.map((r) => this.mapToEntity(r));
    }
    /**
     * Find unit by ID
     */
    async findById(id, storeId) {
        const result = await (0, db_1.queryOne)(`SELECT * FROM Units WHERE id = @id AND store_id = @storeId`, { id, storeId });
        return result ? this.mapToEntity(result) : null;
    }
    /**
     * Find unit by name within a store
     */
    async findByName(name, storeId) {
        const result = await (0, db_1.queryOne)(`SELECT * FROM Units WHERE name = @name AND store_id = @storeId`, { name, storeId });
        return result ? this.mapToEntity(result) : null;
    }
    /**
     * Check if unit name exists (for validation)
     */
    async nameExists(name, storeId, excludeId) {
        let queryString = `SELECT 1 FROM Units WHERE name = @name AND store_id = @storeId`;
        const params = { name, storeId };
        if (excludeId) {
            queryString += ` AND id != @excludeId`;
            params.excludeId = excludeId;
        }
        const result = await (0, db_1.queryOne)(queryString, params);
        return result !== null;
    }
    /**
     * Create a new unit
     */
    async create(entity, storeId) {
        const id = crypto.randomUUID();
        await (0, db_1.query)(`INSERT INTO Units (id, store_id, name, description, base_unit_id, conversion_factor, created_at, updated_at)
       VALUES (@id, @storeId, @name, @description, @baseUnitId, @conversionFactor, GETDATE(), GETDATE())`, {
            id,
            storeId,
            name: entity.name,
            description: entity.description || null,
            baseUnitId: entity.baseUnitId || null,
            conversionFactor: entity.conversionFactor ?? 1,
        });
        return this.findById(id, storeId);
    }
    /**
     * Update a unit
     */
    async update(id, entity, storeId) {
        const existing = await this.findById(id, storeId);
        if (!existing)
            return null;
        await (0, db_1.query)(`UPDATE Units SET 
        name = @name, 
        description = @description, 
        base_unit_id = @baseUnitId,
        conversion_factor = @conversionFactor,
        updated_at = GETDATE()
       WHERE id = @id AND store_id = @storeId`, {
            id,
            storeId,
            name: entity.name ?? existing.name,
            description: entity.description ?? existing.description ?? null,
            baseUnitId: entity.baseUnitId ?? existing.baseUnitId ?? null,
            conversionFactor: entity.conversionFactor ?? existing.conversionFactor,
        });
        return this.findById(id, storeId);
    }
    /**
     * Delete a unit
     */
    async delete(id, storeId) {
        await (0, db_1.query)(`DELETE FROM Units WHERE id = @id AND store_id = @storeId`, {
            id,
            storeId,
        });
        return true;
    }
    /**
     * Get all units with base unit information
     */
    async findAllWithBaseUnit(storeId, options) {
        let queryString = `
      SELECT u.*, bu.name as base_unit_name
      FROM Units u
      LEFT JOIN Units bu ON u.base_unit_id = bu.id
      WHERE u.store_id = @storeId
    `;
        if (options?.orderBy) {
            const direction = options.orderDirection || 'ASC';
            queryString += ` ORDER BY u.${options.orderBy} ${direction}`;
        }
        else {
            queryString += ` ORDER BY u.name ASC`;
        }
        const results = await (0, db_1.query)(queryString, { storeId });
        return results.map((r) => ({
            ...this.mapToEntity(r),
            baseUnitName: r.base_unit_name || undefined,
        }));
    }
    /**
     * Get base units only (units without a base unit reference)
     */
    async findBaseUnits(storeId) {
        const results = await (0, db_1.query)(`SELECT * FROM Units WHERE store_id = @storeId AND base_unit_id IS NULL ORDER BY name ASC`, { storeId });
        return results.map((r) => this.mapToEntity(r));
    }
    /**
     * Convert quantity from one unit to another
     */
    async convertQuantity(quantity, fromUnitId, toUnitId, storeId) {
        const fromUnit = await this.findById(fromUnitId, storeId);
        const toUnit = await this.findById(toUnitId, storeId);
        if (!fromUnit || !toUnit) {
            return null;
        }
        if (fromUnitId === toUnitId) {
            return quantity;
        }
        const fromBaseId = fromUnit.baseUnitId || fromUnitId;
        const toBaseId = toUnit.baseUnitId || toUnitId;
        if (fromBaseId !== toBaseId) {
            return null;
        }
        const fromFactor = fromUnit.conversionFactor;
        const toFactor = toUnit.conversionFactor;
        const convertedQuantity = (quantity * fromFactor) / toFactor;
        return convertedQuantity;
    }
}
exports.UnitRepository = UnitRepository;
// Export singleton instance
exports.unitRepository = new UnitRepository();
//# sourceMappingURL=unit-repository.js.map