"use strict";
/**
 * Global Cache Instance and Middleware
 *
 * Provides application-wide caching with specialized caches
 * for different data types and endpoints.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryCache = exports.reportCache = exports.settingsCache = exports.inventoryCache = exports.categoryCache = exports.productCache = void 0;
exports.getCacheKey = getCacheKey;
exports.cacheMiddleware = cacheMiddleware;
exports.invalidateProductCache = invalidateProductCache;
exports.invalidateCategoryCache = invalidateCategoryCache;
exports.invalidateInventoryCache = invalidateInventoryCache;
exports.invalidateSettingsCache = invalidateSettingsCache;
exports.invalidateAllCaches = invalidateAllCaches;
exports.getAllCacheStats = getAllCacheStats;
const memory_cache_1 = require("./memory-cache");
// Cache instances for different data types
exports.productCache = new memory_cache_1.MemoryCache({
    keyPrefix: 'products',
    ttlMs: 5 * 60 * 1000, // 5 minutes
    maxSize: 1000,
    cleanupIntervalMs: 60 * 1000,
});
exports.categoryCache = new memory_cache_1.MemoryCache({
    keyPrefix: 'categories',
    ttlMs: 10 * 60 * 1000, // 10 minutes
    maxSize: 200,
    cleanupIntervalMs: 60 * 1000,
});
exports.inventoryCache = new memory_cache_1.MemoryCache({
    keyPrefix: 'inventory',
    ttlMs: 30 * 1000, // 30 seconds (inventory changes frequently)
    maxSize: 500,
    cleanupIntervalMs: 30 * 1000,
});
exports.settingsCache = new memory_cache_1.MemoryCache({
    keyPrefix: 'settings',
    ttlMs: 30 * 60 * 1000, // 30 minutes
    maxSize: 100,
    cleanupIntervalMs: 5 * 60 * 1000,
});
exports.reportCache = new memory_cache_1.MemoryCache({
    keyPrefix: 'reports',
    ttlMs: 2 * 60 * 1000, // 2 minutes
    maxSize: 100,
    cleanupIntervalMs: 60 * 1000,
});
// Generic query cache
exports.queryCache = new memory_cache_1.MemoryCache({
    keyPrefix: 'query',
    ttlMs: 60 * 1000, // 1 minute
    maxSize: 500,
    cleanupIntervalMs: 30 * 1000,
});
// Cache key generators
function getCacheKey(type, storeId, ...parts) {
    return [type, storeId, ...parts.filter(Boolean)].join(':');
}
// Cache middleware factory
function cacheMiddleware(cache, ttlMs, keyGenerator) {
    return async (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }
        const storeId = req.storeId || 'global';
        const cacheKey = keyGenerator
            ? keyGenerator(req)
            : `${storeId}:${req.originalUrl}`;
        try {
            // Try to get from cache
            const cached = await cache.get(cacheKey);
            if (cached) {
                return res.json(cached);
            }
            // Store original json method
            const originalJson = res.json.bind(res);
            // Override json to cache the response
            res.json = (body) => {
                // Only cache successful responses
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    cache.set(cacheKey, body, ttlMs).catch(console.error);
                }
                return originalJson(body);
            };
            next();
        }
        catch (error) {
            console.error('Cache middleware error:', error);
            next();
        }
    };
}
// Cache invalidation helpers
async function invalidateProductCache(storeId, productId) {
    if (productId) {
        await exports.productCache.delete(`${storeId}:${productId}`);
    }
    await exports.productCache.deletePattern(`${storeId}:*`);
    await exports.inventoryCache.deletePattern(`${storeId}:*`);
}
async function invalidateCategoryCache(storeId) {
    await exports.categoryCache.deletePattern(`${storeId}:*`);
}
async function invalidateInventoryCache(storeId, productId) {
    if (productId) {
        await exports.inventoryCache.delete(`${storeId}:${productId}`);
    }
    await exports.inventoryCache.deletePattern(`${storeId}:*`);
}
async function invalidateSettingsCache(storeId) {
    await exports.settingsCache.deletePattern(`${storeId}:*`);
}
async function invalidateAllCaches(storeId) {
    await Promise.all([
        exports.productCache.deletePattern(`${storeId}:*`),
        exports.categoryCache.deletePattern(`${storeId}:*`),
        exports.inventoryCache.deletePattern(`${storeId}:*`),
        exports.settingsCache.deletePattern(`${storeId}:*`),
        exports.reportCache.deletePattern(`${storeId}:*`),
        exports.queryCache.deletePattern(`${storeId}:*`),
    ]);
}
// Get all cache stats
function getAllCacheStats() {
    return {
        products: exports.productCache.getStats(),
        categories: exports.categoryCache.getStats(),
        inventory: exports.inventoryCache.getStats(),
        settings: exports.settingsCache.getStats(),
        reports: exports.reportCache.getStats(),
        query: exports.queryCache.getStats(),
    };
}
//# sourceMappingURL=global-cache.js.map