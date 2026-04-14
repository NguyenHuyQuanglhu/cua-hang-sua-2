import { Sale, SalesItem } from '../repositories/sales-repository';
import { UnitConversionLog } from '../repositories/unit-conversion-log-repository';
/**
 * Input for creating a sale item
 */
export interface CreateSaleItemInput {
    productId: string;
    quantity: number;
    price: number;
    unitId?: string;
}
/**
 * Input for creating a sale
 */
export interface CreateSaleInput {
    customerId?: string;
    contractorId?: string;
    shiftId?: string;
    projectName?: string;
    items: CreateSaleItemInput[];
    discount?: number;
    discountType?: 'percentage' | 'amount';
    discountValue?: number;
    tierDiscountPercentage?: number;
    tierDiscountAmount?: number;
    pointsUsed?: number;
    pointsDiscount?: number;
    customerPayment?: number;
    previousDebt?: number;
    vatAmount?: number;
    status?: 'pending' | 'processed';
}
/**
 * Result of creating a sale
 */
export interface CreateSaleResult {
    sale: Sale;
    items: SalesItem[];
    conversions: UnitConversionLog[];
}
/**
 * Sales Service
 * Handles sales transactions with automatic inventory deduction and unit conversion
 */
export declare class SalesService {
    private resolvePreferredColumnName;
    private resolveStoreColumnName;
    /**
     * Generate a unique invoice number
     */
    private generateInvoiceNumber;
    /**
     * Create a new sale with automatic inventory deduction
     */
    createSale(saleData: CreateSaleInput, storeId: string, userId?: string): Promise<CreateSaleResult>;
    /**
     * Cancel a sale and restore inventory
     */
    cancelSale(saleId: string, storeId: string): Promise<void>;
    /**
     * Get default unit ID for a product
     * Returns unit_id from Products table
     */
    private getDefaultUnitId;
    /**
     * Map database record to Sale entity
     */
    private mapSaleToEntity;
}
export declare const salesService: SalesService;
//# sourceMappingURL=sales-service.d.ts.map