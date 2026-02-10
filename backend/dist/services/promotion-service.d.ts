export interface Promotion {
    id: string;
    storeId: string;
    name: string;
    description?: string;
    type: 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'bundle' | 'voucher';
    status: 'active' | 'inactive' | 'expired' | 'scheduled';
    startDate: Date;
    endDate: Date;
    discountType?: 'percentage' | 'fixed';
    discountValue?: number;
    maxDiscountAmount?: number;
    buyQuantity?: number;
    getQuantity?: number;
    minPurchaseAmount?: number;
    minQuantity?: number;
    usageLimit?: number;
    usageCount: number;
    usagePerCustomer?: number;
    priority: number;
    applyTo: 'all' | 'specific_products' | 'specific_categories' | 'specific_customers';
}
export interface ApplicablePromotion extends Promotion {
    applicableProducts?: string[];
    applicableCategories?: string[];
    applicableCustomers?: string[];
}
export declare class PromotionService {
    /**
     * Get active promotions for a store
     */
    getActivePromotions(storeId: string): Promise<ApplicablePromotion[]>;
    /**
     * Calculate discount for cart items
     */
    calculateDiscount(storeId: string, items: Array<{
        productId: string;
        quantity: number;
        price: number;
        categoryId?: string;
    }>, customerId?: string, subtotal?: number): Promise<{
        totalDiscount: number;
        appliedPromotions: Array<{
            promotionId: string;
            name: string;
            discount: number;
        }>;
    }>;
    private isPromotionApplicable;
    private calculateSimpleDiscount;
    private calculateBuyXGetYDiscount;
    /**
     * Record promotion usage
     */
    recordUsage(promotionId: string, saleId: string, discountAmount: number, customerId?: string): Promise<void>;
}
export declare const promotionService: PromotionService;
//# sourceMappingURL=promotion-service.d.ts.map