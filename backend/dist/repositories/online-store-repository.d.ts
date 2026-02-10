/**
 * Online Store entity interface
 */
export interface OnlineStore {
    id: string;
    storeId: string;
    slug: string;
    customDomain?: string;
    isActive: boolean;
    storeName: string;
    logo?: string;
    favicon?: string;
    description?: string;
    themeId: string;
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    contactEmail: string;
    contactPhone?: string;
    address?: string;
    facebookUrl?: string;
    instagramUrl?: string;
    currency: string;
    timezone: string;
    createdAt?: string;
    updatedAt?: string;
}
/**
 * Create online store input
 */
export type CreateOnlineStoreInput = Omit<OnlineStore, 'id' | 'createdAt' | 'updatedAt'>;
/**
 * Update online store input
 */
export type UpdateOnlineStoreInput = Partial<Omit<OnlineStore, 'id' | 'storeId' | 'createdAt' | 'updatedAt'>>;
/**
 * Online Store repository for managing online store configurations
 */
export declare class OnlineStoreRepository {
    /**
     * Map database record to OnlineStore entity
     */
    private mapToEntity;
    /**
     * Find all online stores for a store owner
     */
    findAll(storeId: string): Promise<OnlineStore[]>;
    /**
     * Find online store by ID
     */
    findById(id: string, storeId: string): Promise<OnlineStore | null>;
    /**
     * Find online store by slug (for storefront routing)
     */
    findBySlug(slug: string): Promise<OnlineStore | null>;
    /**
     * Find online store by storeId (for admin management)
     */
    findByStoreId(storeId: string): Promise<OnlineStore[]>;
    /**
     * Check if slug is available
     */
    isSlugAvailable(slug: string, excludeId?: string): Promise<boolean>;
    /**
     * Create a new online store
     */
    create(data: CreateOnlineStoreInput): Promise<OnlineStore>;
    /**
     * Update an online store
     */
    update(id: string, data: UpdateOnlineStoreInput, storeId: string): Promise<OnlineStore>;
    /**
     * Deactivate an online store (soft delete)
     */
    deactivate(id: string, storeId: string): Promise<boolean>;
    /**
     * Delete an online store
     */
    delete(id: string, storeId: string): Promise<boolean>;
    /**
     * Permanently delete an online store and all related data
     */
    permanentDelete(id: string, storeId: string): Promise<boolean>;
    /**
     * Count online stores for a store owner
     */
    count(storeId: string): Promise<number>;
}
export declare const onlineStoreRepository: OnlineStoreRepository;
//# sourceMappingURL=online-store-repository.d.ts.map