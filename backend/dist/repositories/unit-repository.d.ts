/**
 * @deprecated This repository uses inline SQL queries.
 * For new code, use UnitsSPRepository from './units-sp-repository' which uses stored procedures.
 * This file is kept for backward compatibility and type exports.
 * Requirements: 8.1-8.4 - All unit operations should use stored procedures.
 */
import { BaseRepository, QueryOptions } from './base-repository';
/**
 * Unit entity interface
 */
export interface Unit {
    id: string;
    storeId: string;
    name: string;
    description?: string;
    baseUnitId?: string;
    conversionFactor: number;
}
/**
 * Unit with base unit info for display
 */
export interface UnitWithBaseUnit extends Unit {
    baseUnitName?: string;
}
/**
 * Unit repository for managing measurement units
 */
export declare class UnitRepository extends BaseRepository<Unit> {
    constructor();
    /**
     * Map database record to Unit entity
     */
    protected mapToEntity(record: Record<string, unknown>): Unit;
    /**
     * Map Unit entity to database record
     */
    protected mapToRecord(entity: Partial<Unit>): Record<string, unknown>;
    /**
     * Find all units for a store
     */
    findAll(storeId: string, options?: QueryOptions): Promise<Unit[]>;
    /**
     * Find unit by ID
     */
    findById(id: string, storeId: string): Promise<Unit | null>;
    /**
     * Find unit by name within a store
     */
    findByName(name: string, storeId: string): Promise<Unit | null>;
    /**
     * Check if unit name exists (for validation)
     */
    nameExists(name: string, storeId: string, excludeId?: string): Promise<boolean>;
    /**
     * Create a new unit
     */
    create(entity: Omit<Unit, 'id'>, storeId: string): Promise<Unit>;
    /**
     * Update a unit
     */
    update(id: string, entity: Partial<Unit>, storeId: string): Promise<Unit | null>;
    /**
     * Delete a unit
     */
    delete(id: string, storeId: string): Promise<boolean>;
    /**
     * Get all units with base unit information
     */
    findAllWithBaseUnit(storeId: string, options?: QueryOptions): Promise<UnitWithBaseUnit[]>;
    /**
     * Get base units only (units without a base unit reference)
     */
    findBaseUnits(storeId: string): Promise<Unit[]>;
    /**
     * Convert quantity from one unit to another
     */
    convertQuantity(quantity: number, fromUnitId: string, toUnitId: string, storeId: string): Promise<number | null>;
}
export declare const unitRepository: UnitRepository;
//# sourceMappingURL=unit-repository.d.ts.map