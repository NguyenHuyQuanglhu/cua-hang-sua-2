/**
 * Cache Interface for Permission Caching
 *
 * Provides an abstraction layer for caching that supports both
 * in-memory and Redis implementations.
 *
 * Requirements: 6.5
 */
/**
 * Cache entry with metadata
 */
export interface CacheEntry<T> {
    value: T;
    cachedAt: number;
    ttl: number;
}
/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
}
/**
 * Cache configuration options
 */
export interface CacheConfig {
    /** Time-to-live in milliseconds */
    ttlMs: number;
    /** Maximum number of entries (for memory cache) */
    maxSize?: number;
    /** Cleanup interval in milliseconds */
    cleanupIntervalMs?: number;
    /** Key prefix for namespacing */
    keyPrefix?: string;
}
/**
 * Abstract cache interface
 * Implementations can use in-memory Map, Redis, or other backends
 */
export interface ICache<T> {
    /**
     * Get a value from cache
     * @returns The cached value or null if not found/expired
     */
    get(key: string): Promise<T | null>;
    /**
     * Set a value in cache
     * @param key - Cache key
     * @param value - Value to cache
     * @param ttlMs - Optional TTL override
     */
    set(key: string, value: T, ttlMs?: number): Promise<void>;
    /**
     * Delete a specific key from cache
     */
    delete(key: string): Promise<boolean>;
    /**
     * Delete all keys matching a pattern
     * @param pattern - Pattern to match (e.g., "tenant:123:*")
     */
    deletePattern(pattern: string): Promise<number>;
    /**
     * Clear all entries from cache
     */
    clear(): Promise<void>;
    /**
     * Check if a key exists and is not expired
     */
    has(key: string): Promise<boolean>;
    /**
     * Get cache statistics
     */
    getStats(): CacheStats;
    /**
     * Reset statistics counters
     */
    resetStats(): void;
    /**
     * Dispose of cache resources
     */
    dispose(): void;
}
/**
 * Default cache configuration
 */
export declare const DEFAULT_CACHE_CONFIG: CacheConfig;
//# sourceMappingURL=cache-interface.d.ts.map