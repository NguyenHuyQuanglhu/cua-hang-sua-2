/**
 * Service for managing loyalty points operations
 */
export declare class LoyaltyPointsService {
    /**
     * Calculate points earned from a purchase amount
     */
    calculateEarnedPoints(storeId: string, purchaseAmount: number): Promise<number>;
    /**
     * Calculate discount amount from points
     */
    calculatePointsDiscount(storeId: string, points: number): Promise<number>;
    /**
     * Earn points from a sale
     */
    earnPoints(customerId: string, storeId: string, purchaseAmount: number, saleId: string, userId?: string): Promise<{
        points: number;
        newBalance: number;
    }>;
    /**
     * Redeem points for a discount
     */
    redeemPoints(customerId: string, storeId: string, pointsToRedeem: number, orderAmount: number, saleId: string, userId?: string): Promise<{
        discount: number;
        newBalance: number;
    }>;
    /**
     * Adjust points manually (admin function)
     */
    adjustPoints(customerId: string, storeId: string, pointsAdjustment: number, reason: string, userId: string): Promise<{
        newBalance: number;
    }>;
    /**
     * Get customer points balance
     */
    getBalance(customerId: string, storeId: string): Promise<number>;
    /**
     * Get customer points history
     */
    getHistory(customerId: string, storeId: string, limit?: number): Promise<import("../repositories/loyalty-points-repository").LoyaltyPointsTransaction[]>;
    /**
     * Get loyalty points settings
     */
    getSettings(storeId: string): Promise<import("../repositories/loyalty-points-repository").LoyaltyPointsSettings | null>;
    /**
     * Update loyalty points settings
     */
    updateSettings(storeId: string, settings: any): Promise<import("../repositories/loyalty-points-repository").LoyaltyPointsSettings>;
    /**
     * Validate points redemption
     */
    validateRedemption(customerId: string, storeId: string, pointsToRedeem: number, orderAmount: number): Promise<{
        valid: boolean;
        error?: string;
        maxPoints?: number;
        discount?: number;
    }>;
}
export declare const loyaltyPointsService: LoyaltyPointsService;
//# sourceMappingURL=loyalty-points-service.d.ts.map