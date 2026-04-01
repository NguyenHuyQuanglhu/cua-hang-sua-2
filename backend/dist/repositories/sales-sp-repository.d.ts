/**
 * Sales SP Repository
 *
 * Repository for sales operations using stored procedures.
 * Implements CRUD operations via sp_Sales_* stored procedures.
 * Requirements: 2.1-2.5
 */
import { SPBaseRepository } from './sp-base-repository';
import { Sale, SalesItem } from './sales-repository';
/**
 * Extended Sale with customer name
 */
export interface SaleWithCustomer extends Sale {
    customerName?: string;
    itemCount?: number;
}
/**
 * Extended SalesItem with product and unit names
 */
export interface SalesItemWithDetails extends SalesItem {
    unitId?: string;
    productName?: string;
    unitName?: string;
}
/**
 * Sale with items result
 */
export interface SaleWithItems {
    sale: SaleWithCustomer;
    items: SalesItemWithDetails[];
}
/**
 * Input for creating a sale via stored procedure
 */
export interface CreateSaleSPInput {
    id?: string;
    storeId: string;
    invoiceNumber?: string;
    customerId?: string | null;
    shiftId?: string | null;
    totalAmount: number;
    vatAmount?: number;
    finalAmount: number;
    discount?: number;
    discountType?: 'percentage' | 'amount' | null;
    discountValue?: number | null;
    tierDiscountPercentage?: number | null;
    tierDiscountAmount?: number | null;
    pointsUsed?: number;
    pointsDiscount?: number;
    customerPayment?: number;
    previousDebt?: number;
    remainingDebt?: number;
    status?: 'pending' | 'unprinted' | 'printed';
}
/**
 * Input for creating a sales item via stored procedure
 */
export interface CreateSalesItemSPInput {
    id?: string;
    salesTransactionId: string;
    productId: string;
    quantity: number;
    price: number;
    unitId: string;
}
/**
 * Filters for getting sales by store
 */
export interface GetSalesByStoreFilters {
    startDate?: Date | null;
    endDate?: Date | null;
    customerId?: string | null;
    status?: string | null;
}
/**
 * Sales repository using stored procedures
 */
export declare class SalesSPRepository extends SPBaseRepository<Sale> {
    protected tableName: string;
    /**
     * Map database record to Sale entity
     */
    private mapToSaleEntity;
    /**
     * Map database record to SalesItem entity
     */
    private mapToSalesItemEntity;
    /**
     * Create a new sale using sp_Sales_Create
     * Requirements: 2.1
     *
     * @param input - Sale data to create
     * @returns Created sale with ID and invoice number
     */
    create(input: CreateSaleSPInput): Promise<{
        id: string;
        invoiceNumber: string;
    }>;
    /**
     * Create a sales item using sp_SalesItems_Create
     * This also deducts inventory automatically
     * Requirements: 2.1, 2.5
     *
     * @param input - Sales item data to create
     * @returns Created sales item ID
     */
    createItem(input: CreateSalesItemSPInput): Promise<string>;
    /**
     * Create a sale with items in a single transaction
     * Requirements: 2.1, 2.5
     *
     * @param saleInput - Sale data
     * @param items - Array of sales items
     * @returns Created sale with items
     */
    createWithItems(saleInput: CreateSaleSPInput, items: Omit<CreateSalesItemSPInput, 'salesTransactionId'>[]): Promise<SaleWithItems>;
    /**
     * Get a sale by ID with items using sp_Sales_GetById
     * Returns multiple result sets: sale and items
     * Requirements: 2.2
     *
     * @param id - Sale ID
     * @param storeId - Store ID
     * @returns Sale with items or null if not found
     */
    getById(id: string, storeId: string): Promise<SaleWithItems | null>;
    /**
     * Get sales for a store using sp_Sales_GetByStore
     * Requirements: 2.3
     *
     * @param storeId - Store ID
     * @param filters - Optional filters (date range, customer, status)
     * @returns Array of sales with customer names
     */
    getByStore(storeId: string, filters?: GetSalesByStoreFilters): Promise<SaleWithCustomer[]>;
    /**
     * Update sale status using sp_Sales_UpdateStatus
     * Requirements: 2.4
     *
     * @param id - Sale ID
     * @param storeId - Store ID
     * @param status - New status
     * @returns True if updated, false if not found
     */
    updateStatus(id: string, storeId: string, status: 'pending' | 'unprinted' | 'printed'): Promise<boolean>;
    /**
     * Get sales by date range
     * Convenience method using getByStore with date filters
     *
     * @param storeId - Store ID
     * @param startDate - Start date
     * @param endDate - End date
     * @returns Array of sales
     */
    getByDateRange(storeId: string, startDate: Date, endDate: Date): Promise<SaleWithCustomer[]>;
    /**
     * Get sales by customer
     * Convenience method using getByStore with customer filter
     *
     * @param storeId - Store ID
     * @param customerId - Customer ID
     * @returns Array of sales
     */
    getByCustomer(storeId: string, customerId: string): Promise<SaleWithCustomer[]>;
}
export declare const salesSPRepository: SalesSPRepository;
//# sourceMappingURL=sales-sp-repository.d.ts.map