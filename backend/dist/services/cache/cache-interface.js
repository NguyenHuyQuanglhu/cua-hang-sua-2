"use strict";
/**
 * Cache Interface for Permission Caching
 *
 * Provides an abstraction layer for caching that supports both
 * in-memory and Redis implementations.
 *
 * Requirements: 6.5
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CACHE_CONFIG = void 0;
/**
 * Default cache configuration
 */
exports.DEFAULT_CACHE_CONFIG = {
    ttlMs: 5 * 60 * 1000, // 5 minutes
    maxSize: 10000,
    cleanupIntervalMs: 60 * 1000, // 1 minute
    keyPrefix: '',
};
//# sourceMappingURL=cache-interface.js.map