"use strict";
/**
 * Permission Cache
 *
 * Specialized cache for user permissions with tenant-aware key management
 * and automatic invalidation support.
 *
 * Requirements: 6.5
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissionCache = exports.PermissionCache = void 0;
const memory_cache_1 = require("./memory-cache");
const DEFAULT_PERMISSION_CACHE_CONFIG = {
    ttlMs: 5 * 60 * 1000, // 5 minutes
    maxSize: 10000,
    enabled: true,
};
/**
 * Permission Cache class
 *
 * Provides tenant-aware caching for user permissions with
 * efficient invalidation patterns.
 */
class PermissionCache {
    cache;
    config;
    enabled;
    constructor(config = {}) {
        this.config = { ...DEFAULT_PERMISSION_CACHE_CONFIG, ...config };
        this.enabled = this.config.enabled;
        this.cache = new memory_cache_1.MemoryCache({
            ttlMs: this.config.ttlMs,
            maxSize: this.config.maxSize,
            keyPrefix: 'perm',
            cleanupIntervalMs: 60 * 1000,
        });
    }
    /**
     * Generate cache key for user permissions
     */
    getCacheKey(userId, tenantId) {
        return tenantId ? `${tenantId}:${userId}` : `default:${userId}`;
    }
    /**
     * Get cached permission context for a user
     */
    async get(userId, tenantId) {
        if (!this.enabled) {
            return null;
        }
        const key = this.getCacheKey(userId, tenantId);
        return this.cache.get(key);
    }
    /**
     * Cache permission context for a user
     */
    async set(userId, context, tenantId) {
        if (!this.enabled) {
            return;
        }
        const key = this.getCacheKey(userId, tenantId);
        await this.cache.set(key, context);
    }
    /**
     * Invalidate cache for a specific user
     * Call this when user's role or permissions change
     */
    async invalidateUser(userId, tenantId) {
        const key = this.getCacheKey(userId, tenantId);
        await this.cache.delete(key);
    }
    /**
     * Invalidate cache for all users in a tenant
     * Call this when tenant-wide permission changes occur
     */
    async invalidateTenant(tenantId) {
        await this.cache.deletePattern(`${tenantId}:*`);
    }
    /**
     * Invalidate cache for users with a specific role in a tenant
     * Useful when default role permissions are changed
     */
    async invalidateByRole(role, tenantId) {
        // For memory cache, we need to iterate and check role
        // This is a limitation of the simple pattern matching
        // A Redis implementation could use secondary indexes
        const pattern = tenantId ? `${tenantId}:*` : '*';
        await this.cache.deletePattern(pattern);
    }
    /**
     * Invalidate cache for users with access to a specific store
     * Call this when store-level permissions change
     */
    async invalidateByStore(storeId, tenantId) {
        // Similar limitation as invalidateByRole
        // Clear all tenant cache as a safe fallback
        if (tenantId) {
            await this.invalidateTenant(tenantId);
        }
        else {
            await this.clear();
        }
    }
    /**
     * Clear all cached permissions
     */
    async clear() {
        await this.cache.clear();
    }
    /**
     * Check if caching is enabled
     */
    isEnabled() {
        return this.enabled;
    }
    /**
     * Enable or disable caching
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.cache.clear();
        }
    }
    /**
     * Get cache statistics
     */
    getStats() {
        return {
            ...this.cache.getStats(),
            enabled: this.enabled,
            ttlMs: this.config.ttlMs,
        };
    }
    /**
     * Reset cache statistics
     */
    resetStats() {
        this.cache.resetStats();
    }
    /**
     * Dispose of cache resources
     */
    dispose() {
        this.cache.dispose();
    }
}
exports.PermissionCache = PermissionCache;
// Export singleton instance
exports.permissionCache = new PermissionCache();
//# sourceMappingURL=permission-cache.js.map