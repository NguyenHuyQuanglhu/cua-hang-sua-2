"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loyaltyPointsRepository = exports.LoyaltyPointsRepository = void 0;
const db_1 = require("../db");
/**
 * Repository for managing loyalty points
 */
class LoyaltyPointsRepository {
    /**
     * Get current points balance for a customer
     */
    async getBalance(customerId, storeId) {
        const result = await (0, db_1.queryOne)(`SELECT TOP 1 balance_after
       FROM LoyaltyPointsTransactions
       WHERE customer_id = @customerId AND store_id = @storeId
       ORDER BY created_at DESC`, { customerId, storeId });
        return result?.balance_after || 0;
    }
    /**
     * Get transaction history for a customer
     */
    async getHistory(customerId, storeId, limit = 50) {
        const results = await (0, db_1.query)(`SELECT TOP (@limit) *
       FROM LoyaltyPointsTransactions
       WHERE customer_id = @customerId AND store_id = @storeId
       ORDER BY created_at DESC`, { customerId, storeId, limit });
        return results.map((r) => ({
            id: r.id,
            storeId: r.store_id,
            customerId: r.customer_id,
            transactionType: r.transaction_type,
            points: r.points,
            referenceType: r.reference_type || undefined,
            referenceId: r.reference_id || undefined,
            description: r.description || undefined,
            balanceAfter: r.balance_after,
            createdBy: r.created_by || undefined,
            createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
        }));
    }
    /**
     * Add points transaction (earn, redeem, or adjustment)
     */
    async addTransaction(transaction) {
        const id = crypto.randomUUID();
        await (0, db_1.query)(`INSERT INTO LoyaltyPointsTransactions 
       (id, store_id, customer_id, transaction_type, points, reference_type, reference_id, description, balance_after, created_by, created_at)
       VALUES 
       (@id, @storeId, @customerId, @transactionType, @points, @referenceType, @referenceId, @description, @balanceAfter, @createdBy, GETDATE())`, {
            id,
            storeId: transaction.storeId,
            customerId: transaction.customerId,
            transactionType: transaction.transactionType,
            points: transaction.points,
            referenceType: transaction.referenceType || null,
            referenceId: transaction.referenceId || null,
            description: transaction.description || null,
            balanceAfter: transaction.balanceAfter,
            createdBy: transaction.createdBy || null,
        });
        const created = await (0, db_1.queryOne)(`SELECT * FROM LoyaltyPointsTransactions WHERE id = @id`, { id });
        if (!created) {
            throw new Error('Failed to create transaction');
        }
        return {
            id: created.id,
            storeId: created.store_id,
            customerId: created.customer_id,
            transactionType: created.transaction_type,
            points: created.points,
            referenceType: created.reference_type || undefined,
            referenceId: created.reference_id || undefined,
            description: created.description || undefined,
            balanceAfter: created.balance_after,
            createdBy: created.created_by || undefined,
            createdAt: created.created_at instanceof Date ? created.created_at.toISOString() : String(created.created_at),
        };
    }
    /**
     * Get loyalty points settings for a store
     */
    async getSettings(storeId) {
        const result = await (0, db_1.queryOne)(`SELECT * FROM LoyaltyPointsSettings WHERE store_id = @storeId`, { storeId });
        if (!result)
            return null;
        return {
            id: result.id,
            storeId: result.store_id,
            enabled: result.enabled,
            earnRate: result.earn_rate,
            redeemRate: result.redeem_rate,
            minPointsToRedeem: result.min_points_to_redeem,
            maxRedeemPercentage: result.max_redeem_percentage,
            pointsExpiryDays: result.points_expiry_days || undefined,
            createdAt: result.created_at instanceof Date ? result.created_at.toISOString() : String(result.created_at),
            updatedAt: result.updated_at instanceof Date ? result.updated_at.toISOString() : String(result.updated_at),
        };
    }
    /**
     * Update loyalty points settings for a store
     */
    async updateSettings(storeId, settings) {
        const existing = await this.getSettings(storeId);
        if (!existing) {
            throw new Error('Settings not found for store');
        }
        await (0, db_1.query)(`UPDATE LoyaltyPointsSettings
       SET enabled = @enabled,
           earn_rate = @earnRate,
           redeem_rate = @redeemRate,
           min_points_to_redeem = @minPointsToRedeem,
           max_redeem_percentage = @maxRedeemPercentage,
           points_expiry_days = @pointsExpiryDays,
           updated_at = GETDATE()
       WHERE store_id = @storeId`, {
            storeId,
            enabled: settings.enabled ?? existing.enabled,
            earnRate: settings.earnRate ?? existing.earnRate,
            redeemRate: settings.redeemRate ?? existing.redeemRate,
            minPointsToRedeem: settings.minPointsToRedeem ?? existing.minPointsToRedeem,
            maxRedeemPercentage: settings.maxRedeemPercentage ?? existing.maxRedeemPercentage,
            pointsExpiryDays: settings.pointsExpiryDays ?? existing.pointsExpiryDays ?? null,
        });
        const updated = await this.getSettings(storeId);
        if (!updated) {
            throw new Error('Failed to update settings');
        }
        return updated;
    }
    /**
     * Get transaction by ID
     */
    async getTransactionById(id, storeId) {
        const result = await (0, db_1.queryOne)(`SELECT * FROM LoyaltyPointsTransactions WHERE id = @id AND store_id = @storeId`, { id, storeId });
        if (!result)
            return null;
        return {
            id: result.id,
            storeId: result.store_id,
            customerId: result.customer_id,
            transactionType: result.transaction_type,
            points: result.points,
            referenceType: result.reference_type || undefined,
            referenceId: result.reference_id || undefined,
            description: result.description || undefined,
            balanceAfter: result.balance_after,
            createdBy: result.created_by || undefined,
            createdAt: result.created_at instanceof Date ? result.created_at.toISOString() : String(result.created_at),
        };
    }
}
exports.LoyaltyPointsRepository = LoyaltyPointsRepository;
// Export singleton instance
exports.loyaltyPointsRepository = new LoyaltyPointsRepository();
//# sourceMappingURL=loyalty-points-repository.js.map