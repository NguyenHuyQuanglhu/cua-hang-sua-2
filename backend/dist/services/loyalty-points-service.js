"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loyaltyPointsService = exports.LoyaltyPointsService = void 0;
const loyalty_points_repository_1 = require("../repositories/loyalty-points-repository");
const customers_sp_repository_1 = require("../repositories/customers-sp-repository");
/**
 * Service for managing loyalty points operations
 */
class LoyaltyPointsService {
    /**
     * Calculate points earned from a purchase amount
     */
    async calculateEarnedPoints(storeId, purchaseAmount) {
        const settings = await loyalty_points_repository_1.loyaltyPointsRepository.getSettings(storeId);
        if (!settings || !settings.enabled) {
            return 0;
        }
        return Math.floor(purchaseAmount * settings.earnRate);
    }
    /**
     * Calculate discount amount from points
     */
    async calculatePointsDiscount(storeId, points) {
        const settings = await loyalty_points_repository_1.loyaltyPointsRepository.getSettings(storeId);
        if (!settings || !settings.enabled) {
            return 0;
        }
        return points * settings.redeemRate;
    }
    /**
     * Earn points from a sale
     */
    async earnPoints(customerId, storeId, purchaseAmount, saleId, userId) {
        const settings = await loyalty_points_repository_1.loyaltyPointsRepository.getSettings(storeId);
        if (!settings || !settings.enabled) {
            return { points: 0, newBalance: 0 };
        }
        const points = await this.calculateEarnedPoints(storeId, purchaseAmount);
        if (points <= 0) {
            return { points: 0, newBalance: 0 };
        }
        const currentBalance = await loyalty_points_repository_1.loyaltyPointsRepository.getBalance(customerId, storeId);
        const newBalance = currentBalance + points;
        await loyalty_points_repository_1.loyaltyPointsRepository.addTransaction({
            storeId,
            customerId,
            transactionType: 'earn',
            points,
            referenceType: 'sale',
            referenceId: saleId,
            description: `Tích điểm từ đơn hàng ${saleId}`,
            balanceAfter: newBalance,
            createdBy: userId,
        });
        // Update customer's lifetime_points using SP Repository
        await customers_sp_repository_1.customersSPRepository.update(customerId, storeId, {
            lifetimePoints: newBalance,
        });
        return { points, newBalance };
    }
    /**
     * Redeem points for a discount
     */
    async redeemPoints(customerId, storeId, pointsToRedeem, orderAmount, saleId, userId) {
        const settings = await loyalty_points_repository_1.loyaltyPointsRepository.getSettings(storeId);
        if (!settings || !settings.enabled) {
            throw new Error('Loyalty points system is not enabled');
        }
        // Validate minimum points
        if (pointsToRedeem < settings.minPointsToRedeem) {
            throw new Error(`Minimum ${settings.minPointsToRedeem} points required to redeem`);
        }
        // Check current balance
        const currentBalance = await loyalty_points_repository_1.loyaltyPointsRepository.getBalance(customerId, storeId);
        if (pointsToRedeem > currentBalance) {
            throw new Error('Insufficient points balance');
        }
        // Calculate discount
        const discount = await this.calculatePointsDiscount(storeId, pointsToRedeem);
        // Validate max redeem percentage
        const maxDiscount = (orderAmount * settings.maxRedeemPercentage) / 100;
        if (discount > maxDiscount) {
            throw new Error(`Maximum ${settings.maxRedeemPercentage}% of order can be paid with points`);
        }
        const newBalance = currentBalance - pointsToRedeem;
        await loyalty_points_repository_1.loyaltyPointsRepository.addTransaction({
            storeId,
            customerId,
            transactionType: 'redeem',
            points: -pointsToRedeem,
            referenceType: 'sale',
            referenceId: saleId,
            description: `Đổi ${pointsToRedeem} điểm cho đơn hàng ${saleId}`,
            balanceAfter: newBalance,
            createdBy: userId,
        });
        // Update customer's lifetime_points using SP Repository
        await customers_sp_repository_1.customersSPRepository.update(customerId, storeId, {
            lifetimePoints: newBalance,
        });
        return { discount, newBalance };
    }
    /**
     * Adjust points manually (admin function)
     */
    async adjustPoints(customerId, storeId, pointsAdjustment, reason, userId) {
        const currentBalance = await loyalty_points_repository_1.loyaltyPointsRepository.getBalance(customerId, storeId);
        const newBalance = currentBalance + pointsAdjustment;
        if (newBalance < 0) {
            throw new Error('Cannot adjust points below zero');
        }
        await loyalty_points_repository_1.loyaltyPointsRepository.addTransaction({
            storeId,
            customerId,
            transactionType: 'adjustment',
            points: pointsAdjustment,
            referenceType: 'manual',
            description: reason,
            balanceAfter: newBalance,
            createdBy: userId,
        });
        // Update customer's lifetime_points using SP Repository
        await customers_sp_repository_1.customersSPRepository.update(customerId, storeId, {
            lifetimePoints: newBalance,
        });
        return { newBalance };
    }
    /**
     * Get customer points balance
     */
    async getBalance(customerId, storeId) {
        return loyalty_points_repository_1.loyaltyPointsRepository.getBalance(customerId, storeId);
    }
    /**
     * Get customer points history
     */
    async getHistory(customerId, storeId, limit = 50) {
        return loyalty_points_repository_1.loyaltyPointsRepository.getHistory(customerId, storeId, limit);
    }
    /**
     * Get loyalty points settings
     */
    async getSettings(storeId) {
        return loyalty_points_repository_1.loyaltyPointsRepository.getSettings(storeId);
    }
    /**
     * Update loyalty points settings
     */
    async updateSettings(storeId, settings) {
        return loyalty_points_repository_1.loyaltyPointsRepository.updateSettings(storeId, settings);
    }
    /**
     * Validate points redemption
     */
    async validateRedemption(customerId, storeId, pointsToRedeem, orderAmount) {
        const settings = await loyalty_points_repository_1.loyaltyPointsRepository.getSettings(storeId);
        if (!settings || !settings.enabled) {
            return { valid: false, error: 'Loyalty points system is not enabled' };
        }
        if (pointsToRedeem < settings.minPointsToRedeem) {
            return {
                valid: false,
                error: `Minimum ${settings.minPointsToRedeem} points required`,
            };
        }
        const currentBalance = await loyalty_points_repository_1.loyaltyPointsRepository.getBalance(customerId, storeId);
        if (pointsToRedeem > currentBalance) {
            return {
                valid: false,
                error: 'Insufficient points',
                maxPoints: currentBalance,
            };
        }
        const discount = await this.calculatePointsDiscount(storeId, pointsToRedeem);
        const maxDiscount = (orderAmount * settings.maxRedeemPercentage) / 100;
        if (discount > maxDiscount) {
            const maxPoints = Math.floor(maxDiscount / settings.redeemRate);
            return {
                valid: false,
                error: `Maximum ${settings.maxRedeemPercentage}% of order can be paid with points`,
                maxPoints,
            };
        }
        return { valid: true, discount };
    }
}
exports.LoyaltyPointsService = LoyaltyPointsService;
// Export singleton instance
exports.loyaltyPointsService = new LoyaltyPointsService();
//# sourceMappingURL=loyalty-points-service.js.map