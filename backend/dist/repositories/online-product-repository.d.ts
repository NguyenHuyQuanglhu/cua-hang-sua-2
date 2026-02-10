/**
 * Online Product entity interface
 */
export interface OnlineProduct {
    id: string;
    onlineStoreId: string;
    productId: string;
    isPublished: boolean;
    onlinePrice?: number;
    onlineDescription?: string;
    displayOrder: number;
    seoTitle?: string;
    seoDescription?: string;
    seoSlug: string;
    images?: string;
    createdAt?: string;
    updatedAt?: string;
}
/**
 * Online Product with inventory product details
 */
export interface OnlineProductWithDetails extends OnlineProduct {
    productName: string;
    productSku?: string;
    productPrice: number;
    stockQuantity: number;
    categoryName?: string;
}
/**
 * Create online product input
 */
export type CreateOnlineProductInput = Omit<OnlineProduct, 'id' | 'createdAt' | 'updatedAt'>;
/**
 * Update online product input
 */
export type UpdateOnlineProductInput = Partial<Omit<OnlineProduct, 'id' | 'onlineStoreId' | 'productId' | 'createdAt' | 'updatedAt'>>;
/**
 * Online Product repository for managing online product catalog
 */
export declare class OnlineProductRepository {
    /**
     * Map database record to OnlineProduct entity
     */
    private mapToEntity;
    /**
     * Map database record to OnlineProductWithDetails entity
     */
    private mapToEntityWithDetails;
    /**
     * Find all online products for an online store
     */
    findAll(onlineStoreId: string): Promise<OnlineProduct[]>;
    /**
     * Find all online products with inventory product details
     */
    findAllWithDetails(onlineStoreId: string): Promise<OnlineProductWithDetails[]>;
    /**
     * Find published products for storefront display
     */
    findPublished(onlineStoreId: string): Promise<OnlineProductWithDetails[]>;
    /**
     * Find online product by ID
     */
    findById(id: string, onlineStoreId: string): Promise<OnlineProduct | null>;
    /**
     * Find online product by SEO slug (for storefront routing)
     */
    findBySlug(seoSlug: string, onlineStoreId: string): Promise<OnlineProductWithDetails | null>;
    /**
     * Find online product by inventory product ID
     */
    findByProductId(productId: string, onlineStoreId: string): Promise<OnlineProduct | null>;
    /**
     * Check if SEO slug is available
     */
    isSlugAvailable(seoSlug: string, onlineStoreId: string, excludeId?: string): Promise<boolean>;
    /**
     * Create a new online product
     */
    create(data: CreateOnlineProductInput): Promise<OnlineProduct>;
    /**
     * Update an online product
     */
    update(id: string, data: UpdateOnlineProductInput, onlineStoreId: string): Promise<OnlineProduct>;
    /**
     * Sync online product with inventory product
     */
    syncWithInventory(id: string, onlineStoreId: string): Promise<OnlineProduct>;
    /**
     * Delete an online product
     */
    delete(id: string, onlineStoreId: string): Promise<boolean>;
    /**
     * Bulk publish/unpublish products
     */
    bulkUpdatePublishStatus(ids: string[], isPublished: boolean, onlineStoreId: string): Promise<number>;
    /**
     * Count online products for an online store
     */
    count(onlineStoreId: string, publishedOnly?: boolean): Promise<number>;
}
export declare const onlineProductRepository: OnlineProductRepository;
//# sourceMappingURL=online-product-repository.d.ts.map