/**
 * Payment Gateway Service
 *
 * Integrates with VNPay and MoMo payment gateways for online payments.
 * Supports payment creation, verification, and refunds.
 */
export interface PaymentRequest {
    orderId: string;
    amount: number;
    orderInfo: string;
    bankCode?: string;
    locale?: 'vn' | 'en';
    ipAddress?: string;
    installment?: {
        term: number;
        provider: string;
    };
}
export interface PaymentResult {
    success: boolean;
    paymentUrl?: string;
    transactionId?: string;
    error?: string;
}
export interface VerificationResult {
    success: boolean;
    orderId: string;
    amount: number;
    transactionId: string;
    responseCode: string;
    message: string;
}
export declare function createVNPayPayment(request: PaymentRequest): Promise<PaymentResult>;
export declare function verifyVNPayReturn(vnpParams: Record<string, string>): Promise<VerificationResult>;
export declare function createMoMoPayment(request: PaymentRequest): Promise<PaymentResult>;
export declare function verifyMoMoCallback(momoParams: Record<string, string>): Promise<VerificationResult>;
export declare function getAvailableGateways(): string[];
export declare function createZaloPayPayment(request: PaymentRequest): Promise<PaymentResult>;
export declare function verifyZaloPayCallback(callbackData: Record<string, any>): Promise<VerificationResult>;
export declare function calculateInstallment(amount: number, term: number, interestRate?: number): {
    monthlyPayment: number;
    totalAmount: number;
    totalInterest: number;
};
export declare function getInstallmentOptions(amount: number): Array<{
    provider: string;
    providerName: string;
    term: number;
    monthlyPayment: number;
    totalAmount: number;
    totalInterest: number;
    interestRate: number;
}>;
declare global {
    interface Date {
        format(format: string): string;
    }
}
//# sourceMappingURL=payment-gateway-service.d.ts.map