/**
 * Loyalty points transaction interface
 */
export interface LoyaltyPointsTransaction {
    id: string;
    storeId: string;
    customerId: string;
    transactionType: 'earn' | 'redeem' | 'adjustment' | 'expired';
    points: number;
    referenceType?: string;
    referenceId?: string;
    description?: string;
    balanceAfter: number;
    createdBy?: string;
    createdAt: string;
}
/**
 * Loyalty points settings interface
 */
export interface LoyaltyPointsSettings {
    id: string;
    storeId: string;
    enabled: boolean;
    earnRate: number;
    redeemRate: number;
    minPointsToRedeem: number;
    maxRedeemPercentage: number;
    pointsExpiryDays?: number;
    createdAt: string;
    updatedAt: string;
}
/**
 * Repository for managing loyalty points
 */
export declare class LoyaltyPointsRepository {
    /**
     * Get current points balance for a customer
     */
    getBalance(customerId: string, storeId: string): Promise<number>;
    /**
     * Get transaction history for a customer
     */
    getHistory(customerId: string, storeId: string, limit?: number): Promise<LoyaltyPointsTransaction[]>;
    /**
     * Add points transaction (earn, redeem, or adjustment)
     */
    addTransaction(transaction: Omit<LoyaltyPointsTransaction, 'id' | 'createdAt'>): Promise<LoyaltyPointsTransaction>;
    /**
     * Get loyalty points settings for a store
     */
    getSettings(storeId: string): Promise<LoyaltyPointsSettings | null>;
    /**
     * Update loyalty points settings for a store
     */
    updateSettings(storeId: string, settings: Partial<Omit<LoyaltyPointsSettings, 'id' | 'storeId' | 'createdAt' | 'updatedAt'>>): Promise<LoyaltyPointsSettings>;
    /**
     * Get transaction by ID
     */
    getTransactionById(id: string, storeId: string): Promise<LoyaltyPointsTransaction | null>;
}
export declare const loyaltyPointsRepository: LoyaltyPointsRepository;
//# sourceMappingURL=loyalty-points-repository.d.ts.map