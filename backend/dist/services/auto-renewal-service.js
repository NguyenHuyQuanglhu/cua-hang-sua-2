"use strict";
/**
 * Auto Renewal Service
 *
 * Xử lý tự động gia hạn gói dịch vụ và lưu lịch sử giao dịch
 * Chạy định kỳ để kiểm tra và gia hạn các gói sắp hết hạn
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoRenewalService = exports.AutoRenewalService = void 0;
const db_1 = require("../db");
const transaction_1 = require("../db/transaction");
const subscription_transaction_service_1 = require("./subscription-transaction-service");
/**
 * Service xử lý tự động gia hạn gói dịch vụ
 */
class AutoRenewalService {
    /**
     * Lấy danh sách gói dịch vụ sắp hết hạn (trong vòng 24 giờ tới)
     */
    async getExpiringSubscriptions() {
        const query24Hours = `
      SELECT 
        u.id as userId,
        u.subscription_plan_id as planId,
        u.max_stores as maxStores,
        u.subscription_end_date as endDate,
        u.auto_renewal as autoRenewal,
        u.email,
        u.full_name as fullName
      FROM Users u
      WHERE u.subscription_end_date IS NOT NULL
        AND u.subscription_end_date <= DATEADD(HOUR, 24, GETDATE())
        AND u.subscription_end_date > GETDATE()
        AND u.auto_renewal = 1
        AND u.subscription_status = 'active'
        AND u.subscription_plan_id != 'basic'
    `;
        const results = await (0, db_1.query)(query24Hours);
        return results.map(row => ({
            userId: row.userId,
            planId: row.planId,
            maxStores: row.maxStores,
            endDate: new Date(row.endDate),
            autoRenewal: Boolean(row.autoRenewal),
            email: row.email,
            fullName: row.fullName,
        }));
    }
    /**
     * Xử lý tự động gia hạn cho một người dùng
     */
    async processAutoRenewal(subscription) {
        try {
            console.log(`[AutoRenewal] Processing renewal for user ${subscription.userId} - Plan: ${subscription.planId}`);
            const planPrice = this.getPlanPrice(subscription.planId);
            const now = new Date();
            const newStartDate = subscription.endDate;
            const newEndDate = new Date(subscription.endDate);
            newEndDate.setMonth(newEndDate.getMonth() + 1); // Gia hạn thêm 1 tháng
            return await (0, transaction_1.withTransaction)(async (transaction) => {
                // Cập nhật thông tin gói dịch vụ
                await (0, transaction_1.transactionQuery)(transaction, `
          UPDATE Users
          SET subscription_start_date = @newStartDate,
              subscription_end_date = @newEndDate,
              subscription_status = 'active',
              updated_at = GETDATE()
          WHERE id = @userId
        `, {
                    userId: subscription.userId,
                    newStartDate,
                    newEndDate,
                });
                // Tạo bản ghi lịch sử gói dịch vụ
                await (0, transaction_1.transactionQuery)(transaction, `
          INSERT INTO SubscriptionHistory (
            id, user_id, plan_id, max_stores, amount, payment_method, 
            start_date, end_date, status, auto_renewal, created_at
          ) VALUES (
            NEWID(), @userId, @planId, @maxStores, @amount, 'auto_payment',
            @startDate, @endDate, 'active', 1, GETDATE()
          )
        `, {
                    userId: subscription.userId,
                    planId: subscription.planId,
                    maxStores: subscription.maxStores,
                    amount: planPrice,
                    startDate: newStartDate,
                    endDate: newEndDate,
                });
                // Lưu lịch sử giao dịch để Admin/Quản lý theo dõi
                const subscriptionTransaction = await subscription_transaction_service_1.subscriptionTransactionService.createTransaction({
                    userId: subscription.userId,
                    transactionType: 'auto_renewal',
                    planId: subscription.planId,
                    maxStores: subscription.maxStores,
                    amount: planPrice,
                    paymentMethod: 'auto_payment',
                    paymentStatus: 'completed',
                    startDate: newStartDate,
                    endDate: newEndDate,
                    autoRenewal: true,
                    processedByRole: 'system',
                    notes: `Tự động gia hạn gói ${subscription.planId} cho ${subscription.fullName} (${subscription.email})`,
                    metadata: {
                        renewalSource: 'auto_system',
                        previousEndDate: subscription.endDate.toISOString(),
                        processedAt: now.toISOString(),
                        userEmail: subscription.email,
                        userFullName: subscription.fullName,
                    }
                });
                // Ghi log audit
                await (0, transaction_1.transactionQuery)(transaction, `
          INSERT INTO AuditLogs (
            id, user_id, action, entity_type, entity_id, details, created_at
          ) VALUES (
            NEWID(), @userId, 'subscription_auto_renewal', 'subscription', @planId, @details, GETDATE()
          )
        `, {
                    userId: subscription.userId,
                    planId: subscription.planId,
                    details: JSON.stringify({
                        planId: subscription.planId,
                        maxStores: subscription.maxStores,
                        amount: planPrice,
                        previousEndDate: subscription.endDate.toISOString(),
                        newStartDate: newStartDate.toISOString(),
                        newEndDate: newEndDate.toISOString(),
                        transactionId: subscriptionTransaction.id,
                        processedAt: now.toISOString(),
                    })
                });
                console.log(`[AutoRenewal] Successfully renewed subscription for user ${subscription.userId}`);
                return {
                    success: true,
                    userId: subscription.userId,
                    planId: subscription.planId,
                    transactionId: subscriptionTransaction.id,
                };
            });
        }
        catch (error) {
            console.error(`[AutoRenewal] Failed to renew subscription for user ${subscription.userId}:`, error);
            // Ghi log lỗi
            try {
                await (0, db_1.query)(`
          INSERT INTO AuditLogs (
            id, user_id, action, entity_type, entity_id, details, created_at
          ) VALUES (
            NEWID(), @userId, 'subscription_auto_renewal_failed', 'subscription', @planId, @details, GETDATE()
          )
        `, {
                    userId: subscription.userId,
                    planId: subscription.planId,
                    details: JSON.stringify({
                        error: error instanceof Error ? error.message : String(error),
                        planId: subscription.planId,
                        endDate: subscription.endDate.toISOString(),
                        processedAt: new Date().toISOString(),
                    })
                });
            }
            catch (logError) {
                console.error('[AutoRenewal] Failed to log error:', logError);
            }
            return {
                success: false,
                userId: subscription.userId,
                planId: subscription.planId,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    /**
     * Chạy quy trình tự động gia hạn cho tất cả gói sắp hết hạn
     */
    async runAutoRenewalProcess() {
        console.log('[AutoRenewal] Starting auto-renewal process...');
        const expiringSubscriptions = await this.getExpiringSubscriptions();
        console.log(`[AutoRenewal] Found ${expiringSubscriptions.length} subscriptions expiring in next 24 hours`);
        if (expiringSubscriptions.length === 0) {
            return {
                processed: 0,
                successful: 0,
                failed: 0,
                results: [],
            };
        }
        const results = [];
        let successful = 0;
        let failed = 0;
        // Xử lý từng gói một cách tuần tự để tránh race condition
        for (const subscription of expiringSubscriptions) {
            const result = await this.processAutoRenewal(subscription);
            results.push(result);
            if (result.success) {
                successful++;
            }
            else {
                failed++;
            }
            // Thêm delay nhỏ giữa các lần xử lý
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.log(`[AutoRenewal] Process completed: ${successful} successful, ${failed} failed`);
        return {
            processed: expiringSubscriptions.length,
            successful,
            failed,
            results,
        };
    }
    /**
     * Lấy giá gói dịch vụ
     */
    getPlanPrice(planId) {
        const prices = {
            basic: 199000,
            pro: 499000,
            enterprise: 1999000,
        };
        return prices[planId] || 0;
    }
    /**
     * Kiểm tra gói dịch vụ đã hết hạn
     */
    async getExpiredSubscriptions() {
        const expiredQuery = `
      SELECT 
        u.id as userId,
        u.subscription_plan_id as planId,
        u.max_stores as maxStores,
        u.subscription_end_date as endDate,
        u.auto_renewal as autoRenewal,
        u.email,
        u.full_name as fullName
      FROM Users u
      WHERE u.subscription_end_date IS NOT NULL
        AND u.subscription_end_date < GETDATE()
        AND u.subscription_status = 'active'
        AND u.subscription_plan_id != 'basic'
    `;
        const results = await (0, db_1.query)(expiredQuery);
        return results.map(row => ({
            userId: row.userId,
            planId: row.planId,
            maxStores: row.maxStores,
            endDate: new Date(row.endDate),
            autoRenewal: Boolean(row.autoRenewal),
            email: row.email,
            fullName: row.fullName,
        }));
    }
    /**
     * Đánh dấu gói dịch vụ đã hết hạn
     */
    async markSubscriptionsAsExpired() {
        const updateQuery = `
      UPDATE Users
      SET subscription_status = 'expired',
          updated_at = GETDATE()
      WHERE subscription_end_date < GETDATE()
        AND subscription_status = 'active'
        AND subscription_plan_id != 'basic'
    `;
        const result = await (0, db_1.query)(updateQuery);
        const affectedRows = result?.rowsAffected?.[0] || 0;
        if (affectedRows > 0) {
            console.log(`[AutoRenewal] Marked ${affectedRows} subscriptions as expired`);
        }
        return affectedRows;
    }
}
exports.AutoRenewalService = AutoRenewalService;
// Export singleton instance
exports.autoRenewalService = new AutoRenewalService();
//# sourceMappingURL=auto-renewal-service.js.map