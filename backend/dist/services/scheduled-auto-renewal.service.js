"use strict";
/**
 * Scheduled Auto Renewal Service
 *
 * Service chạy định kỳ để tự động gia hạn gói dịch vụ
 * Tích hợp vào hệ thống backend để chạy tự động
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduledAutoRenewalService = exports.ScheduledAutoRenewalService = void 0;
const auto_renewal_service_1 = require("./auto-renewal-service");
/**
 * Service quản lý việc chạy tự động gia hạn theo lịch
 */
class ScheduledAutoRenewalService {
    intervalId = null;
    isRunning = false;
    intervalMs;
    constructor(intervalHours = 24) {
        // Mặc định chạy mỗi 24 giờ
        this.intervalMs = intervalHours * 60 * 60 * 1000;
    }
    /**
     * Bắt đầu chạy tự động gia hạn theo lịch
     */
    start() {
        if (this.isRunning) {
            console.log('[ScheduledAutoRenewal] Service is already running');
            return;
        }
        console.log(`[ScheduledAutoRenewal] Starting service with ${this.intervalMs / (60 * 60 * 1000)} hour interval`);
        // Chạy ngay lần đầu
        this.runAutoRenewalProcess();
        // Thiết lập interval để chạy định kỳ
        this.intervalId = setInterval(() => {
            this.runAutoRenewalProcess();
        }, this.intervalMs);
        this.isRunning = true;
    }
    /**
     * Dừng service
     */
    stop() {
        if (!this.isRunning) {
            console.log('[ScheduledAutoRenewal] Service is not running');
            return;
        }
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        console.log('[ScheduledAutoRenewal] Service stopped');
    }
    /**
     * Kiểm tra trạng thái service
     */
    getStatus() {
        const status = {
            isRunning: this.isRunning,
            intervalMs: this.intervalMs,
        };
        if (this.isRunning) {
            // Tính thời gian chạy tiếp theo (ước tính)
            const nextRunTime = new Date(Date.now() + this.intervalMs);
            return { ...status, nextRunTime };
        }
        return status;
    }
    /**
     * Chạy quy trình tự động gia hạn
     */
    async runAutoRenewalProcess() {
        try {
            console.log('[ScheduledAutoRenewal] Starting scheduled auto-renewal process...');
            // Đánh dấu các gói đã hết hạn
            const expiredCount = await auto_renewal_service_1.autoRenewalService.markSubscriptionsAsExpired();
            if (expiredCount > 0) {
                console.log(`[ScheduledAutoRenewal] Marked ${expiredCount} subscriptions as expired`);
            }
            // Chạy quy trình tự động gia hạn
            const result = await auto_renewal_service_1.autoRenewalService.runAutoRenewalProcess();
            console.log('[ScheduledAutoRenewal] Auto-renewal process completed:', {
                processed: result.processed,
                successful: result.successful,
                failed: result.failed,
                timestamp: new Date().toISOString(),
            });
            // Log chi tiết nếu có giao dịch
            if (result.processed > 0) {
                const successfulTransactions = result.results.filter(r => r.success);
                const failedTransactions = result.results.filter(r => !r.success);
                if (successfulTransactions.length > 0) {
                    console.log('[ScheduledAutoRenewal] Successful renewals:', successfulTransactions.map(t => `${t.userId}:${t.planId}`).join(', '));
                }
                if (failedTransactions.length > 0) {
                    console.log('[ScheduledAutoRenewal] Failed renewals:', failedTransactions.map(t => `${t.userId}:${t.error}`).join(', '));
                }
            }
        }
        catch (error) {
            console.error('[ScheduledAutoRenewal] Error during scheduled auto-renewal:', error);
        }
    }
    /**
     * Chạy thủ công (không theo lịch)
     */
    async runManually() {
        try {
            console.log('[ScheduledAutoRenewal] Running manual auto-renewal process...');
            const expiredCount = await auto_renewal_service_1.autoRenewalService.markSubscriptionsAsExpired();
            const renewalResult = await auto_renewal_service_1.autoRenewalService.runAutoRenewalProcess();
            return {
                success: true,
                expiredCount,
                renewalResult,
            };
        }
        catch (error) {
            console.error('[ScheduledAutoRenewal] Error during manual auto-renewal:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
}
exports.ScheduledAutoRenewalService = ScheduledAutoRenewalService;
// Export singleton instance
exports.scheduledAutoRenewalService = new ScheduledAutoRenewalService();
//# sourceMappingURL=scheduled-auto-renewal.service.js.map