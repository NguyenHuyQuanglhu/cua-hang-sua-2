export interface Voucher {
    id: string;
    storeId: string;
    promotionId?: string;
    code: string;
    name: string;
    description?: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    maxDiscountAmount?: number;
    minPurchaseAmount?: number;
    startDate: Date;
    endDate: Date;
    usageLimit?: number;
    usageCount: number;
    usagePerCustomer: number;
    status: 'active' | 'inactive' | 'expired';
}
export declare class VoucherService {
    /**
     * Validate and apply voucher
     */
    validateVoucher(code: string, storeId: string, subtotal: number, customerId?: string): Promise<{
        valid: boolean;
        voucher?: Voucher;
        discount?: number;
        error?: string;
    }>;
    /**
     * Record voucher usage
     */
    recordUsage(voucherId: string, saleId: string, discountAmount: number, customerId?: string): Promise<void>;
    /**
     * Generate random voucher code
     */
    generateCode(prefix?: string, length?: number): string;
}
export declare const voucherService: VoucherService;
//# sourceMappingURL=voucher-service.d.ts.map