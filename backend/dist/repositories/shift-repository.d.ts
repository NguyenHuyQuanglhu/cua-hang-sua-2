import { BaseRepository, PaginationOptions, PaginatedResult } from './base-repository';
import { SqlValue } from '../db';
/**
 * Shift entity interface
 */
export interface Shift {
    id: string;
    storeId: string;
    userId: string;
    userName: string;
    status: 'active' | 'closed';
    startTime: string;
    endTime?: string;
    startingCash: number;
    endingCash?: number;
    cashSales: number;
    cashPayments: number;
    totalCashInDrawer?: number;
    cashDifference?: number;
    totalRevenue: number;
    salesCount: number;
}
/**
 * Shift with summary info
 */
export interface ShiftWithSummary extends Shift {
    calculatedCashInDrawer: number;
    calculatedCashDifference: number;
}
/**
 * Input for creating a shift
 */
export interface CreateShiftInput {
    userId: string;
    userName: string;
    startingCash: number;
}
/**
 * Input for closing a shift
 */
export interface CloseShiftInput {
    endingCash: number;
}
/**
 * Shift repository for managing shift operations
 */
export declare class ShiftRepository extends BaseRepository<Shift> {
    constructor();
    /**
     * Map database record to Shift entity
     */
    protected mapToEntity(record: Record<string, unknown>): Shift;
    /**
     * Map Shift entity to database record
     */
    protected mapToRecord(entity: Partial<Shift>): Record<string, SqlValue>;
    /**
     * Get active shift for a user in a store
     */
    getActiveShift(userId: string, storeId: string): Promise<Shift | null>;
    /**
     * Get any active shift for a store (regardless of user)
     */
    getAnyActiveShift(storeId: string): Promise<Shift | null>;
    /**
     * Start a new shift
     */
    startShift(input: CreateShiftInput, storeId: string): Promise<Shift>;
    /**
     * Close a shift with ending cash and calculate differences
     */
    closeShift(shiftId: string, input: CloseShiftInput, storeId: string): Promise<ShiftWithSummary>;
    /**
     * Get shift with calculated summary
     */
    getShiftWithSummary(shiftId: string, storeId: string): Promise<ShiftWithSummary | null>;
    /**
     * Get all shifts with pagination and filtering
     */
    findAllShifts(storeId: string, options?: PaginationOptions & {
        userId?: string;
        status?: 'active' | 'closed';
        dateFrom?: string;
        dateTo?: string;
    }): Promise<PaginatedResult<Shift>>;
    /**
     * Update shift totals (called when a sale is made)
     */
    updateShiftTotals(shiftId: string, storeId: string, saleAmount: number, customerPayment: number): Promise<void>;
    /**
     * Revert shift totals (called when a sale is deleted)
     */
    revertShiftTotals(shiftId: string, storeId: string, saleAmount: number, customerPayment: number): Promise<void>;
    /**
     * Update shift with new starting/ending cash values
     */
    updateShiftCash(shiftId: string, storeId: string, startingCash: number, endingCash?: number): Promise<Shift>;
}
export declare const shiftRepository: ShiftRepository;
//# sourceMappingURL=shift-repository.d.ts.map