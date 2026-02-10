/**
 * @deprecated This repository uses inline SQL queries.
 * For new code, use SalesSPRepository from './sales-sp-repository' which uses stored procedures.
 * This file is kept for backward compatibility and type exports.
 * Requirements: 2.1-2.5 - All sales operations should use stored procedures.
 */
import { BaseRepository, QueryOptions } from './base-repository';
/**
 * Sale entity interface (matches database schema)
 */
export interface Sale {
    id: string;
    storeId: string;
    invoiceNumber: string;
    customerId?: string;
    shiftId?: string;
    transactionDate: string;
    status: 'pending' | 'unprinted' | 'printed';
    totalAmount: number;
    vatAmount: number;
    finalAmount: number;
    discount: number;
    discountType?: 'percentage' | 'amount';
    discountValue?: number;
    tierDiscountPercentage?: number;
    tierDiscountAmount?: number;
    pointsUsed: number;
    pointsDiscount: number;
    customerPayment?: number;
    previousDebt?: number;
    remainingDebt?: number;
    createdAt?: string;
    updatedAt?: string;
}
/**
 * SalesItem entity interface
 */
export interface SalesItem {
    id: string;
    salesTransactionId: string;
    productId: string;
    quantity: number;
    price: number;
}
/**
 * Sales repository for managing sales transactions
 */
export declare class SalesRepository extends BaseRepository<Sale> {
    constructor();
    /**
     * Map database record to Sale entity
     */
    protected mapToEntity(record: Record<string, unknown>): Sale;
    /**
     * Find all sales for a store
     */
    findAll(storeId: string, options?: QueryOptions): Promise<Sale[]>;
    /**
     * Find sale by ID
     */
    findById(id: string, storeId: string): Promise<Sale | null>;
    /**
     * Find sales by date range
     */
    findByDateRange(storeId: string, dateFrom: Date, dateTo: Date): Promise<Sale[]>;
    /**
     * Find sales by customer
     */
    findByCustomer(customerId: string, storeId: string): Promise<Sale[]>;
    /**
     * Get sales items for a sale
     */
    getSalesItems(salesId: string): Promise<SalesItem[]>;
    /**
     * Create a new sale
     */
    create(entity: Omit<Sale, 'id' | 'createdAt' | 'updatedAt'>, storeId: string): Promise<Sale>;
    /**
     * Add sales item
     */
    addSalesItem(salesId: string, item: Omit<SalesItem, 'id' | 'salesTransactionId'>): Promise<SalesItem>;
    /**
     * Delete a sale
     */
    delete(id: string, storeId: string): Promise<boolean>;
    /**
     * Get total revenue for a store
     */
    getTotalRevenue(storeId: string, dateFrom?: Date, dateTo?: Date): Promise<number>;
    /**
     * Get sales count for a store
     */
    getSalesCount(storeId: string, dateFrom?: Date, dateTo?: Date): Promise<number>;
}
export declare const salesRepository: SalesRepository;
//# sourceMappingURL=sales-repository.d.ts.map