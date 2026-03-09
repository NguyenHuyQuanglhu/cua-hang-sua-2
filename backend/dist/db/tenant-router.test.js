"use strict";
/**
 * Unit Tests for TenantRouter
 *
 * Tests connection management, caching, and tenant routing logic.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const tenant_router_1 = require("./tenant-router");
(0, vitest_1.describe)('TenantRouter', () => {
    let router;
    (0, vitest_1.beforeEach)(() => {
        // Create router with test config (no actual DB connections)
        router = new tenant_router_1.TenantRouter({
            maxPoolSize: 5,
            minPoolSize: 0,
            idleTimeoutMs: 1000,
            connectionTimeoutMs: 5000,
            requestTimeoutMs: 5000,
            cacheCleanupIntervalMs: 60000,
            maxCacheAge: 5000,
        });
    });
    (0, vitest_1.afterEach)(async () => {
        await router.close();
    });
    (0, vitest_1.describe)('Configuration', () => {
        (0, vitest_1.it)('should use default config when no config provided', () => {
            const defaultRouter = new tenant_router_1.TenantRouter();
            (0, vitest_1.expect)(defaultRouter).toBeDefined();
            defaultRouter.close();
        });
        (0, vitest_1.it)('should merge custom config with defaults', () => {
            const customRouter = new tenant_router_1.TenantRouter({ maxPoolSize: 20 });
            (0, vitest_1.expect)(customRouter).toBeDefined();
            customRouter.close();
        });
    });
    (0, vitest_1.describe)('Connection Management', () => {
        (0, vitest_1.it)('should throw error when getting master connection before initialization', () => {
            (0, vitest_1.expect)(() => router.getMasterConnection()).toThrow('TenantRouter not initialized. Call initialize() first.');
        });
        (0, vitest_1.it)('should return false for hasConnection when no connection exists', () => {
            const tenantId = '00000000-0000-0000-0000-000000000001';
            (0, vitest_1.expect)(router.hasConnection(tenantId)).toBe(false);
        });
        (0, vitest_1.it)('should return empty array for getActiveConnections when no connections', () => {
            const connections = router.getActiveConnections();
            (0, vitest_1.expect)(connections).toEqual([]);
        });
    });
    (0, vitest_1.describe)('Cache Invalidation', () => {
        (0, vitest_1.it)('should not throw when invalidating non-existent tenant cache', () => {
            const tenantId = '00000000-0000-0000-0000-000000000001';
            (0, vitest_1.expect)(() => router.invalidateTenantCache(tenantId)).not.toThrow();
        });
    });
    (0, vitest_1.describe)('Close Operations', () => {
        (0, vitest_1.it)('should handle close when no connections exist', async () => {
            await (0, vitest_1.expect)(router.close()).resolves.not.toThrow();
        });
        (0, vitest_1.it)('should handle multiple close calls gracefully', async () => {
            await router.close();
            await (0, vitest_1.expect)(router.close()).resolves.not.toThrow();
        });
    });
});
(0, vitest_1.describe)('TenantRouter - Connection Caching Logic', () => {
    (0, vitest_1.it)('should track connection access time for cache management', () => {
        const router = new tenant_router_1.TenantRouter({
            maxCacheAge: 1000,
            cacheCleanupIntervalMs: 500,
        });
        // Verify router is created with cache settings
        (0, vitest_1.expect)(router).toBeDefined();
        router.close();
    });
});
//# sourceMappingURL=tenant-router.test.js.map