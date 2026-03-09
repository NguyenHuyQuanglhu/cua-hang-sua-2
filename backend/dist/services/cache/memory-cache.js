"use strict";
/**
 * In-Memory Cache Implementation
 *
 * A high-performance in-memory cache with TTL support,
 * automatic cleanup, and LRU-like eviction.
 *
 * Requirements: 6.5
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryCache = void 0;
const cache_interface_1 = require("./cache-interface");
/**
 * In-memory cache implementation using Map
 */
class MemoryCache {
    cache = new Map();
    config;
    cleanupInterval = null;
    // Statistics
    hits = 0;
    misses = 0;
    constructor(config = {}) {
        this.config = { ...cache_interface_1.DEFAULT_CACHE_CONFIG, ...config };
        this.startCleanup();
    }
    /**
     * Get a value from cache
     */
    async get(key) {
        const fullKey = this.getFullKey(key);
        const entry = this.cache.get(fullKey);
        if (!entry) {
            this.misses++;
            return null;
        }
        // Check if expired
        if (this.isExpired(entry)) {
            this.cache.delete(fullKey);
            this.misses++;
            return null;
        }
        this.hits++;
        return entry.value;
    }
    /**
     * Set a value in cache
     */
    async set(key, value, ttlMs) {
        const fullKey = this.getFullKey(key);
        const ttl = ttlMs ?? this.config.ttlMs;
        // Check max size and evict if necessary
        if (this.config.maxSize && this.cache.size >= this.config.maxSize) {
            this.evictOldest();
        }
        this.cache.set(fullKey, {
            value,
            cachedAt: Date.now(),
            ttl,
        });
    }
    /**
     * Delete a specific key from cache
     */
    async delete(key) {
        const fullKey = this.getFullKey(key);
        return this.cache.delete(fullKey);
    }
    /**
     * Delete all keys matching a pattern
     * Supports simple wildcard patterns like "tenant:123:*"
     */
    async deletePattern(pattern) {
        const fullPattern = this.getFullKey(pattern);
        const regex = this.patternToRegex(fullPattern);
        let deleted = 0;
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
                deleted++;
            }
        }
        return deleted;
    }
    /**
     * Clear all entries from cache
     */
    async clear() {
        this.cache.clear();
    }
    /**
     * Check if a key exists and is not expired
     */
    async has(key) {
        const fullKey = this.getFullKey(key);
        const entry = this.cache.get(fullKey);
        if (!entry) {
            return false;
        }
        if (this.isExpired(entry)) {
            this.cache.delete(fullKey);
            return false;
        }
        return true;
    }
    /**
     * Get cache statistics
     */
    getStats() {
        const total = this.hits + this.misses;
        return {
            size: this.cache.size,
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? this.hits / total : 0,
        };
    }
    /**
     * Reset statistics counters
     */
    resetStats() {
        this.hits = 0;
        this.misses = 0;
    }
    /**
     * Dispose of cache resources
     */
    dispose() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.cache.clear();
    }
    /**
     * Get full key with prefix
     */
    getFullKey(key) {
        return this.config.keyPrefix ? `${this.config.keyPrefix}:${key}` : key;
    }
    /**
     * Check if cache entry is expired
     */
    isExpired(entry) {
        return Date.now() - entry.cachedAt > entry.ttl;
    }
    /**
     * Convert wildcard pattern to regex
     */
    patternToRegex(pattern) {
        const escaped = pattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
        return new RegExp(`^${escaped}$`);
    }
    /**
     * Evict oldest entries when cache is full
     */
    evictOldest() {
        let oldestKey = null;
        let oldestTime = Infinity;
        for (const [key, entry] of this.cache.entries()) {
            if (entry.cachedAt < oldestTime) {
                oldestTime = entry.cachedAt;
                oldestKey = key;
            }
        }
        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }
    /**
     * Start automatic cleanup of expired entries
     */
    startCleanup() {
        if (!this.config.cleanupIntervalMs) {
            return;
        }
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpired();
        }, this.config.cleanupIntervalMs);
        // Don't prevent process from exiting
        if (this.cleanupInterval.unref) {
            this.cleanupInterval.unref();
        }
    }
    /**
     * Remove all expired entries
     */
    cleanupExpired() {
        for (const [key, entry] of this.cache.entries()) {
            if (this.isExpired(entry)) {
                this.cache.delete(key);
            }
        }
    }
}
exports.MemoryCache = MemoryCache;
//# sourceMappingURL=memory-cache.js.map