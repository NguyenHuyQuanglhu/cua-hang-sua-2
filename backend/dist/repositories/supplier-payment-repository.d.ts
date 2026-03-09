import { BaseRepository, QueryOptions, PaginationOptions, PaginatedResult } from './base-repository';
/**
 * Supplier Payment entity interface
 */
export interface SupplierPayment {
    id: string;
    storeId: string;
    supplierId: string;
    paymentDate: string;
    amount: number;
    notes?: string;
    createdBy?: string;
    createdAt: string;
}
/**
 * Supplier Payment with supplier information
 */
export interface SupplierPaymentWithSupplier extends SupplierPayment {
    supplierName: string;
    supplierPhone?: string;
}
/**
 * Supplier Payment repository for managing payments to suppliers
 * Extends BaseRepository with store-scoped CRUD operations
 */
export declare class SupplierPaymentRepository extends BaseRepository<SupplierPayment> {
    constructor();
    /**
     * Map database record to SupplierPayment entity
     */
    protected mapToEntity(record: Record<string, unknown>): SupplierPayment;
    /**
     * Map SupplierPayment entity to database record
     */
    protected mapToRecord(entity: Partial<SupplierPayment>): Record<string, unknown>;
    /**
     * Find payments by supplier
     */
    findBySupplier(supplierId: string, storeId: string, options?: QueryOptions): Promise<SupplierPayment[]>;
    /**
     * Find all payments with supplier information
     */
    findAllWithSupplier(storeId: string, options?: PaginationOptions & {
        supplierId?: string;
        dateFrom?: string;
        dateTo?: string;
    }): Promise<PaginatedResult<SupplierPaymentWithSupplier>>;
    /**
     * Get total payments for a supplier
     */
    getTotalPayments(supplierId: string, storeId: string): Promise<number>;
    /**
     * Get payments summary by date range
     */
    getPaymentsSummary(storeId: string, dateFrom: string, dateTo: string): Promise<{
        totalAmount: number;
        count: number;
    }>;
}
export declare const supplierPaymentRepository: SupplierPaymentRepository;
//# sourceMappingURL=supplier-payment-repository.d.ts.map