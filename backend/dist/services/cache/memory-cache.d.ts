/**
 * In-Memory Cache Implementation
 *
 * A high-performance in-memory cache with TTL support,
 * automatic cleanup, and LRU-like eviction.
 *
 * Requirements: 6.5
 */
import type { ICache, CacheConfig, CacheStats } from './cache-interface';
/**
 * In-memory cache implementation using Map
 */
export declare class MemoryCache<T> implements ICache<T> {
    private cache;
    private config;
    private cleanupInterval;
    private hits;
    private misses;
    constructor(config?: Partial<CacheConfig>);
    /**
     * Get a value from cache
     */
    get(key: string): Promise<T | null>;
    /**
     * Set a value in cache
     */
    set(key: string, value: T, ttlMs?: number): Promise<void>;
    /**
     * Delete a specific key from cache
     */
    delete(key: string): Promise<boolean>;
    /**
     * Delete all keys matching a pattern
     * Supports simple wildcard patterns like "tenant:123:*"
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
    /**
     * Get full key with prefix
     */
    private getFullKey;
    /**
     * Check if cache entry is expired
     */
    private isExpired;
    /**
     * Convert wildcard pattern to regex
     */
    private patternToRegex;
    /**
     * Evict oldest entries when cache is full
     */
    private evictOldest;
    /**
     * Start automatic cleanup of expired entries
     */
    private startCleanup;
    /**
     * Remove all expired entries
     */
    private cleanupExpired;
}
//# sourceMappingURL=memory-cache.d.ts.map