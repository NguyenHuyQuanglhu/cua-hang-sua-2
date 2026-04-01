/**
 * Shipping Service
 *
 * Integrates with Vietnamese shipping providers:
 * - GHN (Giao Hang Nhanh)
 * - GHTK (Giao Hang Tiet Kiem)
 *
 * Supports shipping fee calculation, order creation, and tracking.
 */
export interface ShippingAddress {
    name: string;
    phone: string;
    address: string;
    wardCode?: string;
    districtId?: number;
    provinceId?: number;
    wardName?: string;
    districtName?: string;
    provinceName?: string;
}
export interface ShippingItem {
    name: string;
    quantity: number;
    weight: number;
    price: number;
}
export interface ShippingRequest {
    orderId: string;
    sender: ShippingAddress;
    receiver: ShippingAddress;
    items: ShippingItem[];
    totalWeight: number;
    codAmount?: number;
    note?: string;
    serviceType?: string;
}
export interface ShippingFeeResult {
    success: boolean;
    fee?: number;
    expectedDays?: number;
    error?: string;
}
export interface ShippingOrderResult {
    success: boolean;
    trackingCode?: string;
    shippingOrderId?: string;
    fee?: number;
    expectedDelivery?: string;
    error?: string;
}
export interface TrackingResult {
    success: boolean;
    status?: string;
    statusText?: string;
    location?: string;
    updatedAt?: string;
    history?: Array<{
        status: string;
        description: string;
        time: string;
        location?: string;
    }>;
    error?: string;
}
export declare function getAvailableProviders(): string[];
export declare function calculateGHNFee(request: ShippingRequest): Promise<ShippingFeeResult>;
export declare function createGHNOrder(request: ShippingRequest): Promise<ShippingOrderResult>;
export declare function trackGHNOrder(trackingCode: string): Promise<TrackingResult>;
export declare function calculateGHTKFee(request: ShippingRequest): Promise<ShippingFeeResult>;
export declare function createGHTKOrder(request: ShippingRequest): Promise<ShippingOrderResult>;
export declare function trackGHTKOrder(trackingCode: string): Promise<TrackingResult>;
export declare function updateShippingStatus(trackingCode: string, status: string): Promise<void>;
//# sourceMappingURL=shipping-service.d.ts.map