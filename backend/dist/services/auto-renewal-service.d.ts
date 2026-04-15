/**
 * Auto Renewal Service
 *
 * Xử lý tự động gia hạn gói dịch vụ và lưu lịch sử giao dịch
 * Chạy định kỳ để kiểm tra và gia hạn các gói sắp hết hạn
 */
/**
 * Thông tin gói dịch vụ sắp hết hạn
 */
interface ExpiringSubscription {
    userId: string;
    planId: string;
    maxStores: number;
    endDate: Date;
    autoRenewal: boolean;
    email: string;
    fullName: string;
}
/**
 * Kết quả xử lý auto-renewal
 */
interface AutoRenewalResult {
    success: boolean;
    userId: string;
    planId: string;
    transactionId?: string;
    error?: string;
}
/**
 * Service xử lý tự động gia hạn gói dịch vụ
 */
export declare class AutoRenewalService {
    /**
     * Lấy danh sách gói dịch vụ sắp hết hạn (trong vòng 24 giờ tới)
     */
    getExpiringSubscriptions(): Promise<ExpiringSubscription[]>;
    /**
     * Xử lý tự động gia hạn cho một người dùng
     */
    processAutoRenewal(subscription: ExpiringSubscription): Promise<AutoRenewalResult>;
    /**
     * Chạy quy trình tự động gia hạn cho tất cả gói sắp hết hạn
     */
    runAutoRenewalProcess(): Promise<{
        processed: number;
        successful: number;
        failed: number;
        results: AutoRenewalResult[];
    }>;
    /**
     * Lấy giá gói dịch vụ
     */
    private getPlanPrice;
    /**
     * Kiểm tra gói dịch vụ đã hết hạn
     */
    getExpiredSubscriptions(): Promise<ExpiringSubscription[]>;
    /**
     * Đánh dấu gói dịch vụ đã hết hạn
     */
    markSubscriptionsAsExpired(): Promise<number>;
}
export declare const autoRenewalService: AutoRenewalService;
export {};
//# sourceMappingURL=auto-renewal-service.d.ts.map