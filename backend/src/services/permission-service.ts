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

import sql from 'mssql';
import { tenantRouter } from '../db/tenant-router';
import { DEFAULT_PERMISSIONS, getEffectivePermissions } from '../auth/permissions';
import { PermissionCache, type CachedPermissionContext } from './cache/permission-cache';
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

const DEFAULT_CONFIG: PermissionServiceConfig = {
  cacheEnabled: true,
  cacheTtlMs: 5 * 60 * 1000, // 5 minutes
  cacheMaxSize: 10000,
};


/**
 * Permission Service class
 * 
 * Provides centralized permission checking with caching support.
 * Loads default permissions based on role and merges with custom permissions.
 * Uses the PermissionCache module for efficient caching with Redis-ready interface.
 */
export class PermissionService {
  private cache: PermissionCache;
  private config: PermissionServiceConfig;

  constructor(config: Partial<PermissionServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    this.cache = new PermissionCache({
      enabled: this.config.cacheEnabled,
      ttlMs: this.config.cacheTtlMs,
      maxSize: this.config.cacheMaxSize,
    });
  }

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
  async checkPermission(
    userId: string,
    module: Module,
    action: Permission,
    storeId?: string,
    context?: UserPermissionContext
  ): Promise<PermissionCheckResult> {
    try {
      // Get or load permission context
      const permContext = context || await this.getPermissionContext(userId);
      
      if (!permContext) {
        console.error('[PermissionService] No permission context found for user:', userId);
        return {
          allowed: false,
          reason: 'Không tìm thấy thông tin người dùng',
          errorCode: 'PERM001',
        };
      }

      // Owner has all permissions
      if (permContext.role === 'owner') {
        return { allowed: true };
      }

      // Get effective permissions for the user
      const effectivePerms = this.getEffectivePermissionsForStore(
        permContext,
        storeId
      );

      // Check module permissions
      const modulePerms = effectivePerms[module];
      if (!modulePerms || modulePerms.length === 0) {
        return {
          allowed: false,
          reason: `Bạn không có quyền truy cập module ${module}`,
          errorCode: 'PERM001',
        };
      }

      // Check specific action
      if (!modulePerms.includes(action)) {
        const actionNames: Record<Permission, string> = {
          view: 'xem',
          add: 'thêm',
          edit: 'sửa',
          delete: 'xóa',
        };
        return {
          allowed: false,
          reason: `Bạn không có quyền ${actionNames[action]} trong module ${module}`,
          errorCode: 'PERM001',
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Permission check error:', error);
      return {
        allowed: false,
        reason: 'Lỗi kiểm tra quyền hạn',
        errorCode: 'PERM001',
      };
    }
  }

  /**
   * Get effective permissions for a user, considering store-specific overrides
   */
  private getEffectivePermissionsForStore(
    context: UserPermissionContext,
    storeId?: string
  ): Permissions {
    // Start with default role permissions
    const defaultPerms = DEFAULT_PERMISSIONS[context.role] || {};
    
    // Merge with custom permissions (global)
    let effectivePerms: Permissions = { ...defaultPerms };
    
    if (context.customPermissions) {
      for (const [mod, perms] of Object.entries(context.customPermissions)) {
        if (perms && perms.length > 0) {
          effectivePerms[mod as Module] = perms;
        }
      }
    }

    // Apply store-specific permissions if available
    if (storeId && context.storePermissions) {
      const storePerms = context.storePermissions.get(storeId);
      if (storePerms) {
        for (const [mod, perms] of Object.entries(storePerms)) {
          if (perms && perms.length > 0) {
            effectivePerms[mod as Module] = perms;
          }
        }
      }
    }

    return effectivePerms;
  }

  /**
   * Get permission context for a user (from cache or database)
   */
  async getPermissionContext(
    userId: string,
    tenantId?: string
  ): Promise<UserPermissionContext | null> {
    // Check cache first
    if (this.config.cacheEnabled) {
      const cached = await this.cache.get(userId, tenantId);
      if (cached) {
        // Convert cached format to UserPermissionContext
        return this.cachedToContext(cached);
      }
    }

    // Load from database
    const context = await this.loadPermissionContext(userId, tenantId);
    
    if (context && this.config.cacheEnabled) {
      // Convert to cached format and store
      await this.cache.set(userId, this.contextToCached(context), tenantId);
    }

    return context;
  }

  /**
   * Convert cached permission context to UserPermissionContext
   */
  private cachedToContext(cached: CachedPermissionContext): UserPermissionContext {
    const storePermissions = cached.storePermissions 
      ? new Map(Object.entries(cached.storePermissions))
      : undefined;
    
    return {
      userId: cached.userId,
      tenantId: cached.tenantId,
      role: cached.role,
      customPermissions: cached.customPermissions,
      storePermissions,
    };
  }

  /**
   * Convert UserPermissionContext to cached format
   */
  private contextToCached(context: UserPermissionContext): CachedPermissionContext {
    const storePermissions = context.storePermissions
      ? Object.fromEntries(context.storePermissions)
      : undefined;
    
    return {
      userId: context.userId,
      tenantId: context.tenantId,
      role: context.role,
      customPermissions: context.customPermissions,
      storePermissions,
    };
  }

  /**
   * Load permission context from database
   */
  private async loadPermissionContext(
    userId: string,
    tenantId?: string
  ): Promise<UserPermissionContext | null> {
    try {
      let pool: sql.ConnectionPool;

      if (tenantId) {
        await tenantRouter.initialize();
        pool = await tenantRouter.getConnection(tenantId);
      } else {
        // Use default connection for non-multi-tenant mode
        const { getConnection } = await import('../db/connection.js');
        pool = await getConnection();
      }

      // Get user info with role
      const userResult = await pool.request()
        .input('userId', sql.UniqueIdentifier, userId)
        .query(`
          SELECT id, role, permissions
          FROM Users
          WHERE id = @userId AND status = 'active'
        `);

      if (userResult.recordset.length === 0) {
        console.log('[PermissionService] User not found or inactive:', userId);
        return null;
      }

      const user = userResult.recordset[0];
      const customPermissions = user.permissions 
        ? JSON.parse(user.permissions) 
        : undefined;

      // Load store-specific permissions (if Permissions table exists)
      let storePermsResult: { recordset: Array<{ StoreId: string; Module: string; Actions: string }> } = { recordset: [] };
      try {
        storePermsResult = await pool.request()
          .input('userId', sql.UniqueIdentifier, userId)
          .query(`
            SELECT StoreId, Module, Actions
            FROM Permissions
            WHERE UserId = @userId AND StoreId IS NOT NULL
          `);
      } catch (err) {
        // Permissions table may not exist in legacy databases
        console.log('[PermissionService] Permissions table not found, using default permissions');
      }

      const storePermissions = new Map<string, Permissions>();
      for (const row of storePermsResult.recordset) {
        const storeId = row.StoreId;
        if (!storePermissions.has(storeId)) {
          storePermissions.set(storeId, {});
        }
        const perms = storePermissions.get(storeId)!;
        perms[row.Module as Module] = JSON.parse(row.Actions);
      }

      const context = {
        userId,
        tenantId: tenantId || '',
        role: user.role as UserRole,
        customPermissions,
        storePermissions: storePermissions.size > 0 ? storePermissions : undefined,
      };

      return context;
    } catch (error) {
      console.error('[PermissionService] Error loading permission context:', {
        userId,
        tenantId,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      return null;
    }
  }

  /**
   * Invalidate cache for a specific user
   * Call this when user's role or permissions change
   * 
   * Requirements: 6.5
   */
  invalidateCache(userId: string, tenantId?: string): void {
    this.cache.invalidateUser(userId, tenantId);
  }

  /**
   * Invalidate all cache entries for a tenant
   */
  invalidateTenantCache(tenantId: string): void {
    this.cache.invalidateTenant(tenantId);
  }

  /**
   * Invalidate cache for users with a specific role
   * Useful when default role permissions are changed
   * 
   * Requirements: 6.5
   */
  invalidateRoleCache(role: UserRole, tenantId?: string): void {
    this.cache.invalidateByRole(role, tenantId);
  }

  /**
   * Invalidate cache for users with access to a specific store
   * Call this when store-level permissions change
   * 
   * Requirements: 6.5
   */
  invalidateStoreCache(storeId: string, tenantId?: string): void {
    this.cache.invalidateByStore(storeId, tenantId);
  }

  /**
   * Clear entire cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Stop cache cleanup and clear resources
   */
  dispose(): void {
    this.cache.dispose();
  }

  /**
   * Get all permissions for a user (for API response)
   */
  async getUserPermissions(
    userId: string,
    tenantId?: string,
    storeId?: string
  ): Promise<Permissions> {
    const context = await this.getPermissionContext(userId, tenantId);
    
    if (!context) {
      return {};
    }

    return this.getEffectivePermissionsForStore(context, storeId);
  }

  /**
   * Check multiple permissions at once
   */
  async checkMultiplePermissions(
    userId: string,
    checks: Array<{ module: Module; action: Permission; storeId?: string }>,
    tenantId?: string
  ): Promise<Map<string, PermissionCheckResult>> {
    const context = await this.getPermissionContext(userId, tenantId);
    const results = new Map<string, PermissionCheckResult>();

    for (const check of checks) {
      const key = `${check.module}:${check.action}:${check.storeId || 'all'}`;
      const result = await this.checkPermission(
        userId,
        check.module,
        check.action,
        check.storeId,
        context || undefined
      );
      results.set(key, result);
    }

    return results;
  }

  /**
   * Check if user has access to a specific store
   */
  async checkStoreAccess(
    userId: string,
    storeId: string,
    tenantId?: string
  ): Promise<PermissionCheckResult> {
    try {
      let pool: sql.ConnectionPool;

      if (tenantId) {
        await tenantRouter.initialize();
        pool = await tenantRouter.getConnection(tenantId);
      } else {
        const { getConnection } = await import('../db/connection.js');
        pool = await getConnection();
      }

      // Get user role
      const userResult = await pool.request()
        .input('userId', sql.UniqueIdentifier, userId)
        .query(`
          SELECT role FROM Users WHERE id = @userId AND status = 'active'
        `);

      if (userResult.recordset.length === 0) {
        return {
          allowed: false,
          reason: 'Không tìm thấy người dùng',
          errorCode: 'PERM002',
        };
      }

      const role = userResult.recordset[0].role as UserRole;

      // Owner and company_manager have access to all stores
      if (role === 'owner' || role === 'company_manager') {
        return { allowed: true };
      }

      // Check UserStores for store_manager and salesperson
      const storeAccessResult = await pool.request()
        .input('userId', sql.UniqueIdentifier, userId)
        .input('storeId', sql.UniqueIdentifier, storeId)
        .query(`
          SELECT 1 FROM UserStores 
          WHERE UserId = @userId AND StoreId = @storeId
        `);

      if (storeAccessResult.recordset.length === 0) {
        return {
          allowed: false,
          reason: 'Bạn không có quyền truy cập cửa hàng này',
          errorCode: 'PERM002',
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Store access check error:', error);
      return {
        allowed: false,
        reason: 'Lỗi kiểm tra quyền truy cập cửa hàng',
        errorCode: 'PERM002',
      };
    }
  }
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
class PermissionServiceWithStats extends PermissionService {
  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return (this as any).cache.getStats();
  }

  /**
   * Reset cache statistics
   */
  resetCacheStats(): void {
    (this as any).cache.resetStats();
  }
}

// Export singleton instance with stats tracking
export const permissionService = new PermissionServiceWithStats();

/**
 * Helper function to invalidate cache when user role changes
 * Call this from user management operations
 * 
 * Requirements: 6.5
 */
export function invalidateUserPermissionCache(
  userId: string,
  tenantId?: string
): void {
  permissionService.invalidateCache(userId, tenantId);
}

/**
 * Helper function to invalidate cache for all users in a tenant
 * Call this when tenant-wide permission changes occur
 * 
 * Requirements: 6.5
 */
export function invalidateTenantPermissionCache(tenantId: string): void {
  permissionService.invalidateTenantCache(tenantId);
}

/**
 * Helper function to invalidate cache for users with a specific role
 * Call this when default role permissions are changed
 * 
 * Requirements: 6.5
 */
export function invalidateRolePermissionCache(
  role: UserRole,
  tenantId?: string
): void {
  permissionService.invalidateRoleCache(role, tenantId);
}

/**
 * Helper function to invalidate cache for users with access to a store
 * Call this when store-level permissions change
 * 
 * Requirements: 6.5
 */
export function invalidateStorePermissionCache(
  storeId: string,
  tenantId?: string
): void {
  permissionService.invalidateStoreCache(storeId, tenantId);
}
