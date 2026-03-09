"use strict";
/**
 * Cache Module Exports
 *
 * Provides caching infrastructure for permission and other data caching.
 * Currently supports in-memory caching with an interface ready for Redis.
 *
 * Requirements: 6.5
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissionCache = exports.PermissionCache = exports.MemoryCache = exports.DEFAULT_CACHE_CONFIG = void 0;
var cache_interface_1 = require("./cache-interface");
Object.defineProperty(exports, "DEFAULT_CACHE_CONFIG", { enumerable: true, get: function () { return cache_interface_1.DEFAULT_CACHE_CONFIG; } });
var memory_cache_1 = require("./memory-cache");
Object.defineProperty(exports, "MemoryCache", { enumerable: true, get: function () { return memory_cache_1.MemoryCache; } });
var permission_cache_1 = require("./permission-cache");
Object.defineProperty(exports, "PermissionCache", { enumerable: true, get: function () { return permission_cache_1.PermissionCache; } });
Object.defineProperty(exports, "permissionCache", { enumerable: true, get: function () { return permission_cache_1.permissionCache; } });
//# sourceMappingURL=index.js.map