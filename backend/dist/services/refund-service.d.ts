export interface RefundItem {
    saleItemId: number;
    productId: number;
    quantity: number;
    unitId?: number;
    reason?: string;
}
export interface RefundRequest {
    saleId: number;
    items: RefundItem[];
    refundType: 'full' | 'partial';
    refundMethod: 'cash' | 'store_credit' | 'original_payment';
    reason: string;
    notes?: string;
}
export interface RefundResult {
    refundId: number;
    refundNumber: string;
    totalRefundAmount: number;
    status: string;
}
export declare function createRefund(request: RefundRequest, storeId: string, tenantId: string, userId: string): Promise<RefundResult>;
export declare function getRefunds(storeId: string, tenantId: string, options?: {
    page?: number;
    pageSize?: number;
    saleId?: number;
}): Promise<{
    refunds: any[];
    total: number;
}>;
export declare function getRefundById(refundId: number, storeId: string, tenantId: string): Promise<{
    refund: any;
    items: any[];
} | null>;
//# sourceMappingURL=refund-service.d.ts.map