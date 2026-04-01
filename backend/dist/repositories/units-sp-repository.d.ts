/**
 * Units SP Repository
 *
 * Repository for unit operations using stored procedures.
 * Implements CRUD operations via sp_Units_* stored procedures.
 * Requirements: 8.1-8.4
 */
import { SPBaseRepository } from './sp-base-repository';
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
    createdAt?: string;
    updatedAt?: string;
}
/**
 * Input for creating a unit via stored procedure
 */
export interface CreateUnitSPInput {
    id?: string;
    storeId: string;
    name: string;
    description?: string | null;
    baseUnitId?: string | null;
    conversionFactor?: number;
}
/**
 * Input for updating a unit via stored procedure
 */
export interface UpdateUnitSPInput {
    name?: string;
    description?: string | null;
    baseUnitId?: string | null;
    conversionFactor?: number;
}
/**
 * Units repository using stored procedures
 */
export declare class UnitsSPRepository extends SPBaseRepository<Unit> {
    protected tableName: string;
    /**
     * Map database record to Unit entity
     */
    private mapToEntity;
    /**
     * Create a new unit using sp_Units_Create
     * Requirements: 8.1
     *
     * @param input - Unit data to create
     * @returns Created unit
     */
    create(input: CreateUnitSPInput): Promise<Unit>;
    /**
     * Update a unit using sp_Units_Update
     * Requirements: 8.2
     *
     * @param id - Unit ID
     * @param storeId - Store ID
     * @param data - Fields to update
     * @returns Updated unit or null if not found
     */
    update(id: string, storeId: string, data: UpdateUnitSPInput): Promise<Unit | null>;
    /**
     * Delete a unit using sp_Units_Delete
     * Requirements: 8.3
     *
     * @param id - Unit ID
     * @param storeId - Store ID
     * @returns True if deleted, false if not found
     */
    delete(id: string, storeId: string): Promise<boolean>;
    /**
     * Get all units for a store using sp_Units_GetByStore
     * Requirements: 8.4
     *
     * @param storeId - Store ID
     * @returns Array of units
     */
    getByStore(storeId: string): Promise<Unit[]>;
    /**
     * Get a single unit by ID
     *
     * @param id - Unit ID
     * @param storeId - Store ID
     * @returns Unit or null if not found
     */
    getById(id: string, storeId: string): Promise<Unit | null>;
    /**
     * Find unit by name within a store
     *
     * @param name - Unit name
     * @param storeId - Store ID
     * @returns Unit or null if not found
     */
    findByName(name: string, storeId: string): Promise<Unit | null>;
    /**
     * Check if unit name exists (for validation)
     *
     * @param name - Unit name
     * @param storeId - Store ID
     * @param excludeId - Optional ID to exclude from check
     * @returns True if name exists
     */
    nameExists(name: string, storeId: string, excludeId?: string): Promise<boolean>;
    /**
     * Get base units only (units without a base unit reference)
     *
     * @param storeId - Store ID
     * @returns Array of base units
     */
    getBaseUnits(storeId: string): Promise<Unit[]>;
    /**
     * Convert quantity from one unit to another
     *
     * @param quantity - Quantity to convert
     * @param fromUnitId - Source unit ID
     * @param toUnitId - Target unit ID
     * @param storeId - Store ID
     * @returns Converted quantity or null if conversion not possible
     */
    convertQuantity(quantity: number, fromUnitId: string, toUnitId: string, storeId: string): Promise<number | null>;
}
export declare const unitsSPRepository: UnitsSPRepository;
//# sourceMappingURL=units-sp-repository.d.ts.map