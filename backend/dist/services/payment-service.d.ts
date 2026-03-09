import type { PaymentStatus, OnlineOrder } from '../repositories/online-order-repository';
/**
 * Payment confirmation input for bank transfer
 */
export interface BankTransferConfirmationInput {
    orderId: string;
    onlineStoreId: string;
    transactionReference?: string;
    confirmedBy?: string;
    note?: string;
}
/**
 * COD payment completion input
 */
export interface CODPaymentInput {
    orderId: string;
    onlineStoreId: string;
    collectedAmount: number;
    collectedBy?: string;
    note?: string;
}
/**
 * Payment result
 */
export interface PaymentResult {
    success: boolean;
    order: OnlineOrder;
    previousPaymentStatus: PaymentStatus;
    newPaymentStatus: PaymentStatus;
    timestamp: string;
}
/**
 * Bank account info for display
 */
export interface BankAccountInfo {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    branch?: string;
}
/**
 * Payment status error
 */
export declare class PaymentStatusError extends Error {
    orderId: string;
    currentStatus: PaymentStatus;
    constructor(message: string, orderId: string, currentStatus: PaymentStatus);
}
/**
 * Payment Service
 * Handles payment status updates for different payment methods
 */
export declare class PaymentService {
    /**
     * Map database record to OnlineOrder entity
     */
    private mapOrderToEntity;
    /**
     * Confirm bank transfer payment
     * Updates payment status to 'paid' after store owner confirms receipt
     */
    confirmBankTransfer(input: BankTransferConfirmationInput): Promise<PaymentResult>;
    /**
     * Complete COD payment
     * Updates payment status to 'paid' when delivery person collects payment
     */
    completeCODPayment(input: CODPaymentInput): Promise<PaymentResult>;
    /**
     * Mark payment as failed
     */
    markPaymentFailed(orderId: string, onlineStoreId: string, reason?: string): Promise<PaymentResult>;
    /**
     * Process refund
     */
    processRefund(orderId: string, onlineStoreId: string, refundAmount: number, reason?: string): Promise<PaymentResult>;
    /**
     * Get bank transfer payment instructions for an order
     */
    getBankTransferInstructions(orderId: string, onlineStoreId: string): Promise<{
        orderNumber: string;
        total: number;
        bankInfo: BankAccountInfo;
        transferContent: string;
        expiresAt: string;
    }>;
    /**
     * Check if payment is expired (for bank transfer orders)
     */
    isPaymentExpired(orderId: string, onlineStoreId: string): Promise<boolean>;
}
export declare const paymentService: PaymentService;
//# sourceMappingURL=payment-service.d.ts.map