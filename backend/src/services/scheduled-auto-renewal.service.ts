/**
 * Scheduled Auto Renewal Service
 * 
 * Service chạy định kỳ để tự động gia hạn gói dịch vụ
 * Tích hợp vào hệ thống backend để chạy tự động
 */

import { autoRenewalService } from './auto-renewal-service';

/**
 * Service quản lý việc chạy tự động gia hạn theo lịch
 */
export class ScheduledAutoRenewalService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private readonly intervalMs: number;

  constructor(intervalHours = 24) {
    // Mặc định chạy mỗi 24 giờ
    this.intervalMs = intervalHours * 60 * 60 * 1000;
  }

  /**
   * Bắt đầu chạy tự động gia hạn theo lịch
   */
  start(): void {
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
  stop(): void {
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
  getStatus(): { isRunning: boolean; intervalMs: number; nextRunTime?: Date } {
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
  private async runAutoRenewalProcess(): Promise<void> {
    try {
      console.log('[ScheduledAutoRenewal] Starting scheduled auto-renewal process...');

      // Đánh dấu các gói đã hết hạn
      const expiredCount = await autoRenewalService.markSubscriptionsAsExpired();
      if (expiredCount > 0) {
        console.log(`[ScheduledAutoRenewal] Marked ${expiredCount} subscriptions as expired`);
      }

      // Chạy quy trình tự động gia hạn
      const result = await autoRenewalService.runAutoRenewalProcess();

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
          console.log('[ScheduledAutoRenewal] Successful renewals:', 
            successfulTransactions.map(t => `${t.userId}:${t.planId}`).join(', ')
          );
        }

        if (failedTransactions.length > 0) {
          console.log('[ScheduledAutoRenewal] Failed renewals:', 
            failedTransactions.map(t => `${t.userId}:${t.error}`).join(', ')
          );
        }
      }

    } catch (error) {
      console.error('[ScheduledAutoRenewal] Error during scheduled auto-renewal:', error);
    }
  }

  /**
   * Chạy thủ công (không theo lịch)
   */
  async runManually(): Promise<{
    success: boolean;
    expiredCount?: number;
    renewalResult?: any;
    error?: string;
  }> {
    try {
      console.log('[ScheduledAutoRenewal] Running manual auto-renewal process...');

      const expiredCount = await autoRenewalService.markSubscriptionsAsExpired();
      const renewalResult = await autoRenewalService.runAutoRenewalProcess();

      return {
        success: true,
        expiredCount,
        renewalResult,
      };

    } catch (error) {
      console.error('[ScheduledAutoRenewal] Error during manual auto-renewal:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// Export singleton instance
export const scheduledAutoRenewalService = new ScheduledAutoRenewalService();