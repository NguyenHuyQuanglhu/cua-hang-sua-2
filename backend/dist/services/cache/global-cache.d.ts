/**
 * Global Cache Instance and Middleware
 *
 * Provides application-wide caching with specialized caches
 * for different data types and endpoints.
 */
import { MemoryCache } from './memory-cache';
import { Request, Response, NextFunction } from 'express';
export declare const productCache: MemoryCache<any>;
export declare const categoryCache: MemoryCache<any>;
export declare const inventoryCache: MemoryCache<any>;
export declare const settingsCache: MemoryCache<any>;
export declare const reportCache: MemoryCache<any>;
export declare const queryCache: MemoryCache<any>;
export declare function getCacheKey(type: string, storeId: string, ...parts: (string | number | undefined)[]): string;
export declare function cacheMiddleware(cache: MemoryCache<any>, ttlMs?: number, keyGenerator?: (req: Request) => string): (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare function invalidateProductCache(storeId: string, productId?: string): Promise<void>;
export declare function invalidateCategoryCache(storeId: string): Promise<void>;
export declare function invalidateInventoryCache(storeId: string, productId?: string): Promise<void>;
export declare function invalidateSettingsCache(storeId: string): Promise<void>;
export declare function invalidateAllCaches(storeId: string): Promise<void>;
export declare function getAllCacheStats(): {
    products: import("./cache-interface").CacheStats;
    categories: import("./cache-interface").CacheStats;
    inventory: import("./cache-interface").CacheStats;
    settings: import("./cache-interface").CacheStats;
    reports: import("./cache-interface").CacheStats;
    query: import("./cache-interface").CacheStats;
};
//# sourceMappingURL=global-cache.d.ts.map