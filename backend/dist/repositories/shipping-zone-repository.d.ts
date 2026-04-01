/**
 * Shipping Zone entity interface
 */
export interface ShippingZone {
    id: string;
    onlineStoreId: string;
    name: string;
    provinces: string[];
    flatRate?: number;
    freeShippingThreshold?: number;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}
/**
 * Create shipping zone input
 */
export interface CreateShippingZoneInput {
    onlineStoreId: string;
    name: string;
    provinces: string[];
    flatRate?: number;
    freeShippingThreshold?: number;
    isActive?: boolean;
}
/**
 * Update shipping zone input
 */
export type UpdateShippingZoneInput = Partial<Omit<CreateShippingZoneInput, 'onlineStoreId'>>;
/**
 * Shipping fee calculation result
 */
export interface ShippingFeeResult {
    zoneId: string;
    zoneName: string;
    fee: number;
    isFreeShipping: boolean;
    freeShippingThreshold?: number;
}
/**
 * Shipping Zone repository for managing shipping zones and calculating fees
 */
export declare class ShippingZoneRepository {
    /**
     * Map database record to ShippingZone entity
     */
    private mapToEntity;
    /**
     * Find all shipping zones for an online store
     */
    findAll(onlineStoreId: string): Promise<ShippingZone[]>;
    /**
     * Find active shipping zones
     */
    findActive(onlineStoreId: string): Promise<ShippingZone[]>;
    /**
     * Find shipping zone by ID
     */
    findById(id: string, onlineStoreId: string): Promise<ShippingZone | null>;
    /**
     * Find shipping zone by province
     */
    findByProvince(province: string, onlineStoreId: string): Promise<ShippingZone | null>;
    /**
     * Create a new shipping zone
     */
    create(data: CreateShippingZoneInput): Promise<ShippingZone>;
    /**
     * Update a shipping zone
     */
    update(id: string, data: UpdateShippingZoneInput, onlineStoreId: string): Promise<ShippingZone>;
    /**
     * Delete a shipping zone
     */
    delete(id: string, onlineStoreId: string): Promise<boolean>;
    /**
     * Activate/deactivate a shipping zone
     */
    setActive(id: string, isActive: boolean, onlineStoreId: string): Promise<ShippingZone>;
    /**
     * Calculate shipping fee by province
     */
    calculateShippingFee(province: string, orderTotal: number, onlineStoreId: string): Promise<ShippingFeeResult | null>;
    /**
     * Get all provinces covered by shipping zones
     */
    getCoveredProvinces(onlineStoreId: string): Promise<string[]>;
    /**
     * Check if province is covered by any shipping zone
     */
    isProvinceCovered(province: string, onlineStoreId: string): Promise<boolean>;
}
export declare const shippingZoneRepository: ShippingZoneRepository;
//# sourceMappingURL=shipping-zone-repository.d.ts.map