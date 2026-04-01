/**
 * Subscription Transaction Service
 *
 * Xử lý lưu lịch sử giao dịch thanh toán gói dịch vụ tự động
 * Cho phép Admin và Quản lý theo dõi các giao dịch
 */
/**
 * Loại giao dịch gói dịch vụ
 */
export type SubscriptionTransactionType = 'auto_renewal' | 'manual_upgrade' | 'manual_purchase';
/**
 * Trạng thái thanh toán
 */
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
/**
 * Phương thức thanh toán
 */
export type PaymentMethod = 'auto_payment' | 'bank_transfer' | 'credit_card' | 'cash';
/**
 * Vai trò người xử lý
 */
export type ProcessedByRole = 'system' | 'admin' | 'owner' | 'company_manager';
/**
 * Interface cho giao dịch gói dịch vụ
 */
export interface SubscriptionTransaction {
    id: string;
    userId: string;
    tenantId?: string;
    transactionType: SubscriptionTransactionType;
    planId: string;
    previousPlanId?: string;
    maxStores: number;
    amount: number;
    currency: string;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    transactionReference?: string;
    startDate: Date;
    endDate: Date;
    autoRenewal: boolean;
    processedBy?: string;
    processedByRole: ProcessedByRole;
    notes?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Input để tạo giao dịch mới
 */
export interface CreateSubscriptionTransactionInput {
    userId: string;
    tenantId?: string;
    transactionType: SubscriptionTransactionType;
    planId: string;
    previousPlanId?: string;
    maxStores: number;
    amount: number;
    paymentMethod: PaymentMethod;
    paymentStatus?: PaymentStatus;
    transactionReference?: string;
    startDate: Date;
    endDate: Date;
    autoRenewal?: boolean;
    processedBy?: string;
    processedByRole: ProcessedByRole;
    notes?: string;
    metadata?: Record<string, any>;
}
/**
 * Filter cho tìm kiếm giao dịch
 */
export interface SubscriptionTransactionFilter {
    userId?: string;
    tenantId?: string;
    transactionType?: SubscriptionTransactionType;
    planId?: string;
    paymentStatus?: PaymentStatus;
    paymentMethod?: PaymentMethod;
    processedByRole?: ProcessedByRole;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    offset?: number;
}
/**
 * Thống kê giao dịch
 */
export interface SubscriptionTransactionStats {
    totalTransactions: number;
    totalAmount: number;
    completedTransactions: number;
    completedAmount: number;
    failedTransactions: number;
    pendingTransactions: number;
    autoRenewalCount: number;
    manualUpgradeCount: number;
    byPlan: Record<string, {
        count: number;
        amount: number;
    }>;
    byPaymentMethod: Record<string, {
        count: number;
        amount: number;
    }>;
}
/**
 * Service xử lý giao dịch gói dịch vụ
 */
export declare class SubscriptionTransactionService {
    /**
     * Tạo giao dịch mới
     */
    createTransaction(input: CreateSubscriptionTransactionInput): Promise<SubscriptionTransaction>;
    /**
     * Lấy giao dịch theo ID
     */
    getTransactionById(transactionId: string): Promise<SubscriptionTransaction | null>;
    /**
     * Lấy danh sách giao dịch với filter
     */
    getTransactions(filter?: SubscriptionTransactionFilter): Promise<SubscriptionTransaction[]>;
    /**
     * Cập nhật trạng thái thanh toán
     */
    updatePaymentStatus(transactionId: string, paymentStatus: PaymentStatus, transactionReference?: string, notes?: string): Promise<void>;
    /**
     * Lấy thống kê giao dịch
     */
    getTransactionStats(filter?: SubscriptionTransactionFilter): Promise<SubscriptionTransactionStats>;
    /**
     * Lấy thông tin user
     */
    getUserInfo(userId: string): Promise<{
        fullName: string;
        email: string;
        phone?: string;
    } | null>;
    /**
     * Map database record to entity
     */
    private mapToEntity;
}
export declare const subscriptionTransactionService: SubscriptionTransactionService;
//# sourceMappingURL=subscription-transaction-service.d.ts.map