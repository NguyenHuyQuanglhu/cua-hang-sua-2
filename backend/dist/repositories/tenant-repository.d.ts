/**
 * Tenant Repository
 *
 * Repository for managing Tenant records in the Master Database.
 * Handles CRUD operations for tenants.
 *
 * Requirements: 1.1, 5.1
 */
/**
 * Tenant entity interface
 */
export interface Tenant {
    id: string;
    name: string;
    slug: string;
    email: string;
    phone?: string;
    status: 'active' | 'suspended' | 'deleted';
    subscriptionPlan: string;
    databaseName: string;
    databaseServer: string;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Input for creating a new tenant
 */
export interface CreateTenantInput {
    name: string;
    slug: string;
    email: string;
    phone?: string;
    subscriptionPlan?: string;
    databaseName: string;
    databaseServer: string;
}
/**
 * Input for updating a tenant
 */
export interface UpdateTenantInput {
    name?: string;
    slug?: string;
    email?: string;
    phone?: string;
    status?: 'active' | 'suspended' | 'deleted';
    subscriptionPlan?: string;
}
/**
 * Tenant Repository class for Master Database operations
 */
export declare class TenantRepository {
    /**
     * Get the master database connection
     */
    private getPool;
    /**
     * Map database record to Tenant entity
     */
    private mapToEntity;
    /**
     * Find all tenants
     */
    findAll(includeInactive?: boolean): Promise<Tenant[]>;
    /**
     * Find tenant by ID
     */
    findById(id: string): Promise<Tenant | null>;
    /**
     * Find tenant by slug
     */
    findBySlug(slug: string): Promise<Tenant | null>;
    /**
     * Find tenant by email
     */
    findByEmail(email: string): Promise<Tenant | null>;
    /**
     * Check if slug exists
     */
    slugExists(slug: string, excludeId?: string): Promise<boolean>;
    /**
     * Check if email exists
     */
    emailExists(email: string, excludeId?: string): Promise<boolean>;
    /**
     * Check if database name exists
     */
    databaseNameExists(databaseName: string, excludeId?: string): Promise<boolean>;
    /**
     * Create a new tenant
     */
    create(input: CreateTenantInput): Promise<Tenant>;
    /**
     * Update a tenant
     */
    update(id: string, input: UpdateTenantInput): Promise<Tenant>;
    /**
     * Suspend a tenant
     */
    suspend(id: string): Promise<Tenant>;
    /**
     * Activate a tenant
     */
    activate(id: string): Promise<Tenant>;
    /**
     * Soft delete a tenant (mark as deleted)
     */
    softDelete(id: string): Promise<Tenant>;
    /**
     * Count total tenants
     */
    count(includeInactive?: boolean): Promise<number>;
    /**
     * Count tenants by status
     */
    countByStatus(): Promise<{
        active: number;
        suspended: number;
        deleted: number;
    }>;
}
export declare const tenantRepository: TenantRepository;
//# sourceMappingURL=tenant-repository.d.ts.map