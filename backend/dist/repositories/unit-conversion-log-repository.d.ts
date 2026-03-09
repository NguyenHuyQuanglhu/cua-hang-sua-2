import { BaseRepository, PaginationOptions, PaginatedResult } from './base-repository';
/**
 * UnitConversionLog entity interface
 */
export interface UnitConversionLog {
    id: string;
    productId: string;
    storeId: string;
    salesTransactionId?: string;
    conversionDate: string;
    conversionType: 'auto_deduct' | 'manual_adjust';
    conversionUnitChange: number;
    baseUnitChange: number;
    beforeConversionUnitStock: number;
    beforeBaseUnitStock: number;
    afterConversionUnitStock: number;
    afterBaseUnitStock: number;
    notes?: string;
}
/**
 * UnitConversionLog with additional details
 */
export interface UnitConversionLogWithDetails extends UnitConversionLog {
    productName?: string;
    baseUnitName?: string;
    conversionUnitName?: string;
    salesInvoiceNumber?: string;
}
/**
 * UnitConversionLog repository for tracking conversion history
 */
export declare class UnitConversionLogRepository extends BaseRepository<UnitConversionLog> {
    constructor();
    /**
     * Map database record to UnitConversionLog entity
     */
    protected mapToEntity(record: Record<string, unknown>): UnitConversionLog;
    /**
     * Map UnitConversionLog entity to database record
     */
    protected mapToRecord(entity: Partial<UnitConversionLog>): Record<string, unknown>;
    /**
     * Create a new conversion log entry
     */
    create(entity: Omit<UnitConversionLog, 'id' | 'conversionDate'>, storeId: string): Promise<UnitConversionLog>;
    /**
     * Find conversion logs by product
     */
    findByProduct(productId: string, storeId: string, limit?: number): Promise<UnitConversionLog[]>;
    /**
     * Find conversion logs by product with details
     */
    findByProductWithDetails(productId: string, storeId: string, options?: PaginationOptions): Promise<PaginatedResult<UnitConversionLogWithDetails>>;
    /**
     * Find conversion logs by sales transaction
     */
    findBySalesTransaction(salesTransactionId: string): Promise<UnitConversionLog[]>;
    /**
     * Find all conversion logs for a store
     */
    findAllByStore(storeId: string, options?: PaginationOptions): Promise<PaginatedResult<UnitConversionLogWithDetails>>;
    /**
     * Get conversion statistics for a product
     */
    getConversionStats(productId: string, storeId: string, startDate?: Date, endDate?: Date): Promise<{
        totalConversions: number;
        totalConversionUnitChange: number;
        totalBaseUnitChange: number;
        autoConversions: number;
        manualAdjustments: number;
    }>;
    /**
     * Get recent conversions for a store
     */
    getRecentConversions(storeId: string, limit?: number): Promise<UnitConversionLogWithDetails[]>;
}
export declare const unitConversionLogRepository: UnitConversionLogRepository;
//# sourceMappingURL=unit-conversion-log-repository.d.ts.map