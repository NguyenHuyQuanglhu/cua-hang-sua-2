import { Request } from 'express';
export interface CustomerAuthPayload {
    customerId: string;
    onlineStoreId: string;
    email: string;
}
export interface CustomerAuthResult {
    success: boolean;
    customer?: CustomerAuthPayload;
    error?: string;
    status?: number;
}
/**
 * Authenticate customer request from storefront
 */
export declare function authenticateCustomer(request: Request): Promise<CustomerAuthResult>;
//# sourceMappingURL=customer-auth.d.ts.map