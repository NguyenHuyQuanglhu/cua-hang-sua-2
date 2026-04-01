/**
 * Permission Cache
 *
 * Specialized cache for user permissions with tenant-aware key management
 * and automatic invalidation support.
 *
 * Requirements: 6.5
 */
import type { CacheStats } from './cache-interface';
import type { Permissions, UserRole } from '../../types';
/**
 * Cached permission context for a user
 */
export interface CachedPermissionContext {
    userId: string;
    tenantId: string;
    role: UserRole;
    customPermissions?: Permissions;
    storePermissions?: Record<string, Permissions>;
    accessibleStores?: string[];
}
/**
 * Permission cache configuration
 */
export interface PermissionCacheConfig {
    /** Time-to-live in milliseconds (default: 5 minutes) */
    ttlMs?: number;
    /** Maximum number of cached users (default: 10000) */
    maxSize?: number;
    /** Enable/disable caching (default: true) */
    enabled?: boolean;
}
/**
 * Permission Cache class
 *
 * Provides tenant-aware caching for user permissions with
 * efficient invalidation patterns.
 */
export declare class PermissionCache {
    private cache;
    private config;
    private enabled;
    constructor(config?: PermissionCacheConfig);
    /**
     * Generate cache key for user permissions
     */
    private getCacheKey;
    /**
     * Get cached permission context for a user
     */
    get(userId: string, tenantId?: string): Promise<CachedPermissionContext | null>;
    /**
     * Cache permission context for a user
     */
    set(userId: string, context: CachedPermissionContext, tenantId?: string): Promise<void>;
    /**
     * Invalidate cache for a specific user
     * Call this when user's role or permissions change
     */
    invalidateUser(userId: string, tenantId?: string): Promise<void>;
    /**
     * Invalidate cache for all users in a tenant
     * Call this when tenant-wide permission changes occur
     */
    invalidateTenant(tenantId: string): Promise<void>;
    /**
     * Invalidate cache for users with a specific role in a tenant
     * Useful when default role permissions are changed
     */
    invalidateByRole(role: UserRole, tenantId?: string): Promise<void>;
    /**
     * Invalidate cache for users with access to a specific store
     * Call this when store-level permissions change
     */
    invalidateByStore(storeId: string, tenantId?: string): Promise<void>;
    /**
     * Clear all cached permissions
     */
    clear(): Promise<void>;
    /**
     * Check if caching is enabled
     */
    isEnabled(): boolean;
    /**
     * Enable or disable caching
     */
    setEnabled(enabled: boolean): void;
    /**
     * Get cache statistics
     */
    getStats(): CacheStats & {
        enabled: boolean;
        ttlMs: number;
    };
    /**
     * Reset cache statistics
     */
    resetStats(): void;
    /**
     * Dispose of cache resources
     */
    dispose(): void;
}
export declare const permissionCache: PermissionCache;
//# sourceMappingURL=permission-cache.d.ts.map