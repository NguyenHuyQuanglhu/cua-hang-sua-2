/**
 * Tenant User Repository
 *
 * Repository for managing TenantUser records in the Master Database.
 * Handles authentication lookup and user-tenant mapping.
 *
 * Requirements: 1.1, 5.1
 */
/**
 * TenantUser entity interface
 */
export interface TenantUser {
    id: string;
    tenantId: string;
    email: string;
    isOwner: boolean;
    status: 'active' | 'inactive' | 'locked';
    failedLoginAttempts: number;
    lockedUntil?: Date;
    lastLogin?: Date;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * TenantUser with tenant info for authentication
 */
export interface TenantUserWithTenant extends TenantUser {
    tenantName: string;
    tenantSlug: string;
    tenantStatus: string;
    databaseName: string;
    databaseServer: string;
}
/**
 * Input for creating a new tenant user
 */
export interface CreateTenantUserInput {
    tenantId: string;
    email: string;
    password: string;
    isOwner?: boolean;
}
/**
 * Input for updating a tenant user
 */
export interface UpdateTenantUserInput {
    email?: string;
    password?: string;
    status?: 'active' | 'inactive' | 'locked';
}
/**
 * Login result
 */
export interface LoginResult {
    success: boolean;
    user?: TenantUserWithTenant;
    error?: string;
    isLocked?: boolean;
    lockRemainingMinutes?: number;
}
/**
 * Tenant User Repository class for Master Database operations
 */
export declare class TenantUserRepository {
    /**
     * Get the master database connection
     */
    private getPool;
    /**
     * Map database record to TenantUser entity
     */
    private mapToEntity;
    /**
     * Map database record to TenantUserWithTenant entity
     */
    private mapToEntityWithTenant;
    /**
     * Find all users for a tenant
     */
    findByTenant(tenantId: string): Promise<TenantUser[]>;
    /**
     * Find user by ID
     */
    findById(id: string): Promise<TenantUser | null>;
    /**
     * Find user by email (across all tenants)
     */
    findByEmail(email: string): Promise<TenantUserWithTenant | null>;
    /**
     * Find user by email within a specific tenant
     */
    findByEmailAndTenant(email: string, tenantId: string): Promise<TenantUser | null>;
    /**
     * Check if email exists within a tenant
     */
    emailExistsInTenant(email: string, tenantId: string, excludeId?: string): Promise<boolean>;
    /**
     * Create a new tenant user
     */
    create(input: CreateTenantUserInput): Promise<TenantUser>;
    /**
     * Update a tenant user
     */
    update(id: string, input: UpdateTenantUserInput): Promise<TenantUser>;
    /**
     * Delete a tenant user
     */
    delete(id: string): Promise<boolean>;
    /**
     * Authenticate user by email and password
     * Implements account lockout after failed attempts
     */
    authenticate(email: string, password: string): Promise<LoginResult>;
    /**
     * Increment failed login attempts
     */
    private incrementFailedAttempts;
    /**
     * Lock account after too many failed attempts
     */
    private lockAccount;
    /**
     * Reset lockout after lock expires
     */
    private resetLockout;
    /**
     * Record successful login
     */
    private recordSuccessfulLogin;
    /**
     * Update password
     */
    updatePassword(userId: string, newPassword: string): Promise<void>;
    /**
     * Count users for a tenant
     */
    countByTenant(tenantId: string): Promise<number>;
    /**
     * Get owner user for a tenant
     */
    getOwner(tenantId: string): Promise<TenantUser | null>;
}
export declare const tenantUserRepository: TenantUserRepository;
//# sourceMappingURL=tenant-user-repository.d.ts.map