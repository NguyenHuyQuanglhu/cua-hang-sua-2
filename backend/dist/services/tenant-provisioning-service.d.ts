/**
 * Tenant Provisioning Service
 *
 * Handles database provisioning for new tenants including:
 * - Creating new tenant database
 * - Running schema migrations
 * - Creating owner account
 *
 * Requirements: 1.2, 1.3, 1.5
 */
/**
 * Provisioning status for progress tracking
 */
export type ProvisioningStatus = 'pending' | 'creating_database' | 'running_migrations' | 'creating_owner' | 'creating_default_store' | 'completed' | 'failed';
/**
 * Provisioning progress info
 */
export interface ProvisioningProgress {
    status: ProvisioningStatus;
    progress: number;
    message: string;
    error?: string;
}
/**
 * Input for provisioning a new tenant
 */
export interface ProvisionTenantInput {
    tenantId: string;
    databaseName: string;
    databaseServer: string;
    ownerEmail: string;
    ownerPassword: string;
    ownerDisplayName: string;
    defaultStoreName?: string;
}
/**
 * Result of tenant provisioning
 */
export interface ProvisioningResult {
    success: boolean;
    error?: string;
    ownerId?: string;
    defaultStoreId?: string;
}
/**
 * Tenant Provisioning Service class
 */
export declare class TenantProvisioningService {
    /**
     * Get provisioning progress for a tenant
     */
    getProgress(tenantId: string): ProvisioningProgress | null;
    /**
     * Update provisioning progress
     */
    private updateProgress;
    /**
     * Clear provisioning progress
     */
    clearProgress(tenantId: string): void;
    /**
     * Provision a new tenant database
     */
    provisionTenant(input: ProvisionTenantInput): Promise<ProvisioningResult>;
    /**
     * Create a new database for the tenant
     */
    private createDatabase;
    /**
     * Wait for database to be ready
     */
    private waitForDatabase;
    /**
     * Run schema migrations on the new tenant database
     */
    private runMigrations;
    /**
     * Create all tenant database tables
     */
    private createTenantTables;
    /**
     * Create additional tenant tables
     */
    private createMoreTenantTables;
    /**
     * Create remaining tenant tables
     */
    private createRemainingTenantTables;
    /**
     * Create indexes for performance
     */
    private createIndexes;
    /**
     * Create owner account in tenant database
     */
    private createOwnerAccount;
    /**
     * Create default store for tenant
     */
    private createDefaultStore;
    /**
     * Assign owner to store
     */
    private assignOwnerToStore;
    /**
     * Generate URL-friendly slug from name
     */
    private generateSlug;
    /**
     * Cleanup failed provisioning (drop database if created)
     */
    private cleanupFailedProvisioning;
}
export declare const tenantProvisioningService: TenantProvisioningService;
//# sourceMappingURL=tenant-provisioning-service.d.ts.map