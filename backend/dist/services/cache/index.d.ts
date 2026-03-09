/**
 * Cache Module Exports
 *
 * Provides caching infrastructure for permission and other data caching.
 * Currently supports in-memory caching with an interface ready for Redis.
 *
 * Requirements: 6.5
 */
export type { ICache, CacheConfig, CacheEntry, CacheStats } from './cache-interface';
export { DEFAULT_CACHE_CONFIG } from './cache-interface';
export { MemoryCache } from './memory-cache';
export { PermissionCache, permissionCache } from './permission-cache';
//# sourceMappingURL=index.d.ts.map