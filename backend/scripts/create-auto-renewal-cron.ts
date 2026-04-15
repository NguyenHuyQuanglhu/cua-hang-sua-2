/**
 * Script để tạo cron job tự động gia hạn gói dịch vụ
 * 
 * Chạy script này để thiết lập tự động gia hạn chạy hàng ngày
 * Hoặc có thể tích hợp vào hệ thống scheduler như node-cron
 */

import { autoRenewalService } from '../src/services/auto-renewal-service';

/**
 * Chạy quy trình tự động gia hạn
 */
async function runAutoRenewalCron() {
  console.log('[AutoRenewalCron] Starting scheduled auto-renewal process...');
  
  try {
    // Đánh dấu các gói đã hết hạn
    const expiredCount = await autoRenewalService.markSubscriptionsAsExpired();
    console.log(`[AutoRenewalCron] Marked ${expiredCount} subscriptions as expired`);

    // Chạy quy trình tự động gia hạn
    const result = await autoRenewalService.runAutoRenewalProcess();
    
    console.log('[AutoRenewalCron] Auto-renewal process completed:', {
      processed: result.processed,
      successful: result.successful,
      failed: result.failed,
    });

    // Log chi tiết các giao dịch thành công
    const successfulTransactions = result.results.filter(r => r.success);
    if (successfulTransactions.length > 0) {
      console.log('[AutoRenewalCron] Successful renewals:');
      successfulTransactions.forEach(transaction => {
        console.log(`  - User ${transaction.userId}: ${transaction.planId} (Transaction: ${transaction.transactionId})`);
      });
    }

    // Log chi tiết các giao dịch thất bại
    const failedTransactions = result.results.filter(r => !r.success);
    if (failedTransactions.length > 0) {
      console.log('[AutoRenewalCron] Failed renewals:');
      failedTransactions.forEach(transaction => {
        console.log(`  - User ${transaction.userId}: ${transaction.planId} - Error: ${transaction.error}`);
      });
    }

    return {
      success: true,
      expiredCount,
      renewalResult: result,
    };

  } catch (error) {
    console.error('[AutoRenewalCron] Error during auto-renewal process:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Nếu chạy trực tiếp từ command line
if (require.main === module) {
  runAutoRenewalCron()
    .then(result => {
      console.log('[AutoRenewalCron] Process completed:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('[AutoRenewalCron] Unexpected error:', error);
      process.exit(1);
    });
}

export { runAutoRenewalCron };