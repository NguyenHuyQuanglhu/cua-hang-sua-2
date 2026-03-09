/**
 * Permission Service for Multi-tenant RBAC
 *
 * Handles permission checking with support for:
 * - Default role-based permissions
 * - Custom user permissions
 * - Store-specific permissions
 * - Permission caching for performance (in-memory with Redis-ready interface)
 *
 * Requirements: 6.1, 6.2, 6.3, 6.5
 */
import type { Module, Permission, Permissions, UserRole } from '../types';
/**
 * Permission check result
 */
export interface PermissionCheckResult {
    allowed: boolean;
    reason?: string;
    errorCode?: string;
}
/**
 * User permission context
 */
export interface UserPermissionContext {
    userId: string;
    tenantId: string;
    role: UserRole;
    customPermissions?: Permissions;
    storePermissions?: Map<string, Permissions>;
}
/**
 * Permission Service configuration
 */
export interface PermissionServiceConfig {
    cacheEnabled: boolean;
    cacheTtlMs: number;
    cacheMaxSize: number;
}
/**
 * Permission Service class
 *
 * Provides centralized permission checking with caching support.
 * Loads default permissions based on role and merges with custom permissions.
 * Uses the PermissionCache module for efficient caching with Redis-ready interface.
 */
export declare class PermissionService {
    private cache;
    private config;
    constructor(config?: Partial<PermissionServiceConfig>);
    /**
     * Check if user has permission for a specific action on a module
     *
     * @param userId - User ID in Tenant DB
     * @param module - Module to check permission for
     * @param action - Action to check (view, add, edit, delete)
     * @param storeId - Optional store ID for store-specific permissions
     * @param context - Optional pre-loaded permission context
     *
     * Requirements: 6.1, 6.2, 6.3
     */
    checkPermission(userId: string, module: Module, action: Permission, storeId?: string, context?: UserPermissionContext): Promise<PermissionCheckResult>;
    /**
     * Get effective permissions for a user, considering store-specific overrides
     */
    private getEffectivePermissionsForStore;
    /**
     * Get permission context for a user (from cache or database)
     */
    getPermissionContext(userId: string, tenantId?: string): Promise<UserPermissionContext | null>;
    /**
     * Convert cached permission context to UserPermissionContext
     */
    private cachedToContext;
    /**
     * Convert UserPermissionContext to cached format
     */
    private contextToCached;
    /**
     * Load permission context from database
     */
    private loadPermissionContext;
    /**
     * Invalidate cache for a specific user
     * Call this when user's role or permissions change
     *
     * Requirements: 6.5
     */
    invalidateCache(userId: string, tenantId?: string): void;
    /**
     * Invalidate all cache entries for a tenant
     */
    invalidateTenantCache(tenantId: string): void;
    /**
     * Invalidate cache for users with a specific role
     * Useful when default role permissions are changed
     *
     * Requirements: 6.5
     */
    invalidateRoleCache(role: UserRole, tenantId?: string): void;
    /**
     * Invalidate cache for users with access to a specific store
     * Call this when store-level permissions change
     *
     * Requirements: 6.5
     */
    invalidateStoreCache(storeId: string, tenantId?: string): void;
    /**
     * Clear entire cache
     */
    clearCache(): void;
    /**
     * Stop cache cleanup and clear resources
     */
    dispose(): void;
    /**
     * Get all permissions for a user (for API response)
     */
    getUserPermissions(userId: string, tenantId?: string, storeId?: string): Promise<Permissions>;
    /**
     * Check multiple permissions at once
     */
    checkMultiplePermissions(userId: string, checks: Array<{
        module: Module;
        action: Permission;
        storeId?: string;
    }>, tenantId?: string): Promise<Map<string, PermissionCheckResult>>;
    /**
     * Check if user has access to a specific store
     */
    checkStoreAccess(userId: string, storeId: string, tenantId?: string): Promise<PermissionCheckResult>;
}
/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
    size: number;
    enabled: boolean;
    ttlMs: number;
    hits: number;
    misses: number;
    hitRate: number;
}
/**
 * Extended Permission Service with cache statistics
 */
declare class PermissionServiceWithStats extends PermissionService {
    /**
     * Get cache statistics
     */
    getCacheStats(): CacheStats;
    /**
     * Reset cache statistics
     */
    resetCacheStats(): void;
}
export declare const permissionService: PermissionServiceWithStats;
/**
 * Helper function to invalidate cache when user role changes
 * Call this from user management operations
 *
 * Requirements: 6.5
 */
export declare function invalidateUserPermissionCache(userId: string, tenantId?: string): void;
/**
 * Helper function to invalidate cache for all users in a tenant
 * Call this when tenant-wide permission changes occur
 *
 * Requirements: 6.5
 */
export declare function invalidateTenantPermissionCache(tenantId: string): void;
/**
 * Helper function to invalidate cache for users with a specific role
 * Call this when default role permissions are changed
 *
 * Requirements: 6.5
 */
export declare function invalidateRolePermissionCache(role: UserRole, tenantId?: string): void;
/**
 * Helper function to invalidate cache for users with access to a store
 * Call this when store-level permissions change
 *
 * Requirements: 6.5
 */
export declare function invalidateStorePermissionCache(storeId: string, tenantId?: string): void;
export {};
//# sourceMappingURL=permission-service.d.ts.map