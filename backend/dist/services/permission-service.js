"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissionService = exports.PermissionService = void 0;
exports.invalidateUserPermissionCache = invalidateUserPermissionCache;
exports.invalidateTenantPermissionCache = invalidateTenantPermissionCache;
exports.invalidateRolePermissionCache = invalidateRolePermissionCache;
exports.invalidateStorePermissionCache = invalidateStorePermissionCache;
const mssql_1 = __importDefault(require("mssql"));
const tenant_router_1 = require("../db/tenant-router");
const permissions_1 = require("../auth/permissions");
const permission_cache_1 = require("./cache/permission-cache");
const DEFAULT_CONFIG = {
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
class PermissionService {
    cache;
    config;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.cache = new permission_cache_1.PermissionCache({
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
    async checkPermission(userId, module, action, storeId, context) {
        try {
            // Get or load permission context
            const permContext = context || await this.getPermissionContext(userId);
            if (!permContext) {
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
            const effectivePerms = this.getEffectivePermissionsForStore(permContext, storeId);
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
                const actionNames = {
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
        }
        catch (error) {
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
    getEffectivePermissionsForStore(context, storeId) {
        // Start with default role permissions
        const defaultPerms = permissions_1.DEFAULT_PERMISSIONS[context.role] || {};
        // Merge with custom permissions (global)
        let effectivePerms = { ...defaultPerms };
        if (context.customPermissions) {
            for (const [mod, perms] of Object.entries(context.customPermissions)) {
                if (perms && perms.length > 0) {
                    effectivePerms[mod] = perms;
                }
            }
        }
        // Apply store-specific permissions if available
        if (storeId && context.storePermissions) {
            const storePerms = context.storePermissions.get(storeId);
            if (storePerms) {
                for (const [mod, perms] of Object.entries(storePerms)) {
                    if (perms && perms.length > 0) {
                        effectivePerms[mod] = perms;
                    }
                }
            }
        }
        return effectivePerms;
    }
    /**
     * Get permission context for a user (from cache or database)
     */
    async getPermissionContext(userId, tenantId) {
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
    cachedToContext(cached) {
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
    contextToCached(context) {
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
    async loadPermissionContext(userId, tenantId) {
        try {
            let pool;
            if (tenantId) {
                await tenant_router_1.tenantRouter.initialize();
                pool = await tenant_router_1.tenantRouter.getConnection(tenantId);
            }
            else {
                // Use default connection for non-multi-tenant mode
                const { getConnection } = await import('../db/connection.js');
                pool = await getConnection();
            }
            // Get user info with role
            const userResult = await pool.request()
                .input('userId', mssql_1.default.UniqueIdentifier, userId)
                .query(`
          SELECT id, role, permissions
          FROM Users
          WHERE id = @userId AND status = 'active'
        `);
            if (userResult.recordset.length === 0) {
                return null;
            }
            const user = userResult.recordset[0];
            const customPermissions = user.permissions
                ? JSON.parse(user.permissions)
                : undefined;
            // Load store-specific permissions (if Permissions table exists)
            let storePermsResult = { recordset: [] };
            try {
                storePermsResult = await pool.request()
                    .input('userId', mssql_1.default.UniqueIdentifier, userId)
                    .query(`
            SELECT StoreId, Module, Actions
            FROM Permissions
            WHERE UserId = @userId AND StoreId IS NOT NULL
          `);
            }
            catch (err) {
                // Permissions table may not exist in legacy databases
                console.log('Permissions table not found, using default permissions');
            }
            const storePermissions = new Map();
            for (const row of storePermsResult.recordset) {
                const storeId = row.StoreId;
                if (!storePermissions.has(storeId)) {
                    storePermissions.set(storeId, {});
                }
                const perms = storePermissions.get(storeId);
                perms[row.Module] = JSON.parse(row.Actions);
            }
            return {
                userId,
                tenantId: tenantId || '',
                role: user.role,
                customPermissions,
                storePermissions: storePermissions.size > 0 ? storePermissions : undefined,
            };
        }
        catch (error) {
            console.error('Error loading permission context:', error);
            return null;
        }
    }
    /**
     * Invalidate cache for a specific user
     * Call this when user's role or permissions change
     *
     * Requirements: 6.5
     */
    invalidateCache(userId, tenantId) {
        this.cache.invalidateUser(userId, tenantId);
    }
    /**
     * Invalidate all cache entries for a tenant
     */
    invalidateTenantCache(tenantId) {
        this.cache.invalidateTenant(tenantId);
    }
    /**
     * Invalidate cache for users with a specific role
     * Useful when default role permissions are changed
     *
     * Requirements: 6.5
     */
    invalidateRoleCache(role, tenantId) {
        this.cache.invalidateByRole(role, tenantId);
    }
    /**
     * Invalidate cache for users with access to a specific store
     * Call this when store-level permissions change
     *
     * Requirements: 6.5
     */
    invalidateStoreCache(storeId, tenantId) {
        this.cache.invalidateByStore(storeId, tenantId);
    }
    /**
     * Clear entire cache
     */
    clearCache() {
        this.cache.clear();
    }
    /**
     * Stop cache cleanup and clear resources
     */
    dispose() {
        this.cache.dispose();
    }
    /**
     * Get all permissions for a user (for API response)
     */
    async getUserPermissions(userId, tenantId, storeId) {
        const context = await this.getPermissionContext(userId, tenantId);
        if (!context) {
            return {};
        }
        return this.getEffectivePermissionsForStore(context, storeId);
    }
    /**
     * Check multiple permissions at once
     */
    async checkMultiplePermissions(userId, checks, tenantId) {
        const context = await this.getPermissionContext(userId, tenantId);
        const results = new Map();
        for (const check of checks) {
            const key = `${check.module}:${check.action}:${check.storeId || 'all'}`;
            const result = await this.checkPermission(userId, check.module, check.action, check.storeId, context || undefined);
            results.set(key, result);
        }
        return results;
    }
    /**
     * Check if user has access to a specific store
     */
    async checkStoreAccess(userId, storeId, tenantId) {
        try {
            let pool;
            if (tenantId) {
                await tenant_router_1.tenantRouter.initialize();
                pool = await tenant_router_1.tenantRouter.getConnection(tenantId);
            }
            else {
                const { getConnection } = await import('../db/connection.js');
                pool = await getConnection();
            }
            // Get user role
            const userResult = await pool.request()
                .input('userId', mssql_1.default.UniqueIdentifier, userId)
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
            const role = userResult.recordset[0].role;
            // Owner and company_manager have access to all stores
            if (role === 'owner' || role === 'company_manager') {
                return { allowed: true };
            }
            // Check UserStores for store_manager and salesperson
            const storeAccessResult = await pool.request()
                .input('userId', mssql_1.default.UniqueIdentifier, userId)
                .input('storeId', mssql_1.default.UniqueIdentifier, storeId)
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
        }
        catch (error) {
            console.error('Store access check error:', error);
            return {
                allowed: false,
                reason: 'Lỗi kiểm tra quyền truy cập cửa hàng',
                errorCode: 'PERM002',
            };
        }
    }
}
exports.PermissionService = PermissionService;
/**
 * Extended Permission Service with cache statistics
 */
class PermissionServiceWithStats extends PermissionService {
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return this.cache.getStats();
    }
    /**
     * Reset cache statistics
     */
    resetCacheStats() {
        this.cache.resetStats();
    }
}
// Export singleton instance with stats tracking
exports.permissionService = new PermissionServiceWithStats();
/**
 * Helper function to invalidate cache when user role changes
 * Call this from user management operations
 *
 * Requirements: 6.5
 */
function invalidateUserPermissionCache(userId, tenantId) {
    exports.permissionService.invalidateCache(userId, tenantId);
}
/**
 * Helper function to invalidate cache for all users in a tenant
 * Call this when tenant-wide permission changes occur
 *
 * Requirements: 6.5
 */
function invalidateTenantPermissionCache(tenantId) {
    exports.permissionService.invalidateTenantCache(tenantId);
}
/**
 * Helper function to invalidate cache for users with a specific role
 * Call this when default role permissions are changed
 *
 * Requirements: 6.5
 */
function invalidateRolePermissionCache(role, tenantId) {
    exports.permissionService.invalidateRoleCache(role, tenantId);
}
/**
 * Helper function to invalidate cache for users with access to a store
 * Call this when store-level permissions change
 *
 * Requirements: 6.5
 */
function invalidateStorePermissionCache(storeId, tenantId) {
    exports.permissionService.invalidateStoreCache(storeId, tenantId);
}
//# sourceMappingURL=permission-service.js.map