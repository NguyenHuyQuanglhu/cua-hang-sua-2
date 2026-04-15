/**
 * Scheduled Auto Renewal Service
 *
 * Service chạy định kỳ để tự động gia hạn gói dịch vụ
 * Tích hợp vào hệ thống backend để chạy tự động
 */
/**
 * Service quản lý việc chạy tự động gia hạn theo lịch
 */
export declare class ScheduledAutoRenewalService {
    private intervalId;
    private isRunning;
    private readonly intervalMs;
    constructor(intervalHours?: number);
    /**
     * Bắt đầu chạy tự động gia hạn theo lịch
     */
    start(): void;
    /**
     * Dừng service
     */
    stop(): void;
    /**
     * Kiểm tra trạng thái service
     */
    getStatus(): {
        isRunning: boolean;
        intervalMs: number;
        nextRunTime?: Date;
    };
    /**
     * Chạy quy trình tự động gia hạn
     */
    private runAutoRenewalProcess;
    /**
     * Chạy thủ công (không theo lịch)
     */
    runManually(): Promise<{
        success: boolean;
        expiredCount?: number;
        renewalResult?: any;
        error?: string;
    }>;
}
export declare const scheduledAutoRenewalService: ScheduledAutoRenewalService;
//# sourceMappingURL=scheduled-auto-renewal.service.d.ts.map