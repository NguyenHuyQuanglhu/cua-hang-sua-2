"use strict";
/**
 * Unit Tests for PermissionService
 *
 * Tests permission checking logic, role-based access, and caching.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const permission_service_1 = require("./permission-service");
(0, vitest_1.describe)('PermissionService', () => {
    let service;
    (0, vitest_1.beforeEach)(() => {
        service = new permission_service_1.PermissionService({
            cacheEnabled: false, // Disable cache for unit tests
            cacheTtlMs: 1000,
            cacheMaxSize: 100,
        });
    });
    (0, vitest_1.afterEach)(() => {
        service.dispose();
    });
    (0, vitest_1.describe)('Permission Checking with Context', () => {
        (0, vitest_1.it)('should allow owner to access any module', async () => {
            const context = {
                userId: 'user-1',
                tenantId: 'tenant-1',
                role: 'owner',
            };
            const result = await service.checkPermission('user-1', 'products', 'delete', undefined, context);
            (0, vitest_1.expect)(result.allowed).toBe(true);
        });
        (0, vitest_1.it)('should allow company_manager to view products', async () => {
            const context = {
                userId: 'user-1',
                tenantId: 'tenant-1',
                role: 'company_manager',
            };
            const result = await service.checkPermission('user-1', 'products', 'view', undefined, context);
            (0, vitest_1.expect)(result.allowed).toBe(true);
        });
        (0, vitest_1.it)('should deny salesperson from deleting products', async () => {
            const context = {
                userId: 'user-1',
                tenantId: 'tenant-1',
                role: 'salesperson',
            };
            const result = await service.checkPermission('user-1', 'products', 'delete', undefined, context);
            (0, vitest_1.expect)(result.allowed).toBe(false);
            (0, vitest_1.expect)(result.errorCode).toBe('PERM001');
        });
        (0, vitest_1.it)('should deny salesperson from accessing users module', async () => {
            const context = {
                userId: 'user-1',
                tenantId: 'tenant-1',
                role: 'salesperson',
            };
            const result = await service.checkPermission('user-1', 'users', 'view', undefined, context);
            (0, vitest_1.expect)(result.allowed).toBe(false);
        });
    });
    (0, vitest_1.describe)('Custom Permissions Override', () => {
        (0, vitest_1.it)('should apply custom permissions over default role permissions', async () => {
            const customPermissions = {
                products: ['view', 'add', 'edit', 'delete'],
            };
            const context = {
                userId: 'user-1',
                tenantId: 'tenant-1',
                role: 'salesperson',
                customPermissions,
            };
            const result = await service.checkPermission('user-1', 'products', 'delete', undefined, context);
            (0, vitest_1.expect)(result.allowed).toBe(true);
        });
    });
    (0, vitest_1.describe)('Store-Specific Permissions', () => {
        (0, vitest_1.it)('should apply store-specific permissions when storeId provided', async () => {
            const storePermissions = new Map();
            storePermissions.set('store-1', {
                products: ['view', 'add', 'edit', 'delete'],
            });
            const context = {
                userId: 'user-1',
                tenantId: 'tenant-1',
                role: 'salesperson',
                storePermissions,
            };
            const result = await service.checkPermission('user-1', 'products', 'delete', 'store-1', context);
            (0, vitest_1.expect)(result.allowed).toBe(true);
        });
        (0, vitest_1.it)('should use default permissions when store has no specific permissions', async () => {
            const storePermissions = new Map();
            storePermissions.set('store-1', {
                products: ['view', 'add', 'edit', 'delete'],
            });
            const context = {
                userId: 'user-1',
                tenantId: 'tenant-1',
                role: 'salesperson',
                storePermissions,
            };
            // Check for store-2 which has no specific permissions
            const result = await service.checkPermission('user-1', 'products', 'delete', 'store-2', context);
            (0, vitest_1.expect)(result.allowed).toBe(false);
        });
    });
    (0, vitest_1.describe)('Cache Operations', () => {
        (0, vitest_1.it)('should not throw when invalidating cache for non-existent user', () => {
            (0, vitest_1.expect)(() => service.invalidateCache('non-existent-user')).not.toThrow();
        });
        (0, vitest_1.it)('should not throw when invalidating tenant cache', () => {
            (0, vitest_1.expect)(() => service.invalidateTenantCache('tenant-1')).not.toThrow();
        });
        (0, vitest_1.it)('should not throw when invalidating role cache', () => {
            (0, vitest_1.expect)(() => service.invalidateRoleCache('owner')).not.toThrow();
        });
        (0, vitest_1.it)('should not throw when invalidating store cache', () => {
            (0, vitest_1.expect)(() => service.invalidateStoreCache('store-1')).not.toThrow();
        });
        (0, vitest_1.it)('should not throw when clearing cache', () => {
            (0, vitest_1.expect)(() => service.clearCache()).not.toThrow();
        });
    });
    (0, vitest_1.describe)('getUserPermissions', () => {
        (0, vitest_1.it)('should return empty object when context not found', async () => {
            // Without DB connection, this will return empty
            const perms = await service.getUserPermissions('non-existent', 'tenant-1');
            (0, vitest_1.expect)(perms).toEqual({});
        });
    });
    (0, vitest_1.describe)('checkMultiplePermissions', () => {
        (0, vitest_1.it)('should check multiple permissions at once', async () => {
            const context = {
                userId: 'user-1',
                tenantId: 'tenant-1',
                role: 'owner',
            };
            // Mock getPermissionContext to return our context
            const originalGetContext = service.getPermissionContext.bind(service);
            service.getPermissionContext = async () => context;
            const results = await service.checkMultiplePermissions('user-1', [
                { module: 'products', action: 'view' },
                { module: 'products', action: 'delete' },
                { module: 'users', action: 'add' },
            ], 'tenant-1');
            (0, vitest_1.expect)(results.size).toBe(3);
            (0, vitest_1.expect)(results.get('products:view:all')?.allowed).toBe(true);
            (0, vitest_1.expect)(results.get('products:delete:all')?.allowed).toBe(true);
            (0, vitest_1.expect)(results.get('users:add:all')?.allowed).toBe(true);
            // Restore original method
            service.getPermissionContext = originalGetContext;
        });
    });
});
(0, vitest_1.describe)('PermissionService - Role Hierarchy', () => {
    let service;
    (0, vitest_1.beforeEach)(() => {
        service = new permission_service_1.PermissionService({ cacheEnabled: false });
    });
    (0, vitest_1.afterEach)(() => {
        service.dispose();
    });
    const roles = ['owner', 'company_manager', 'store_manager', 'salesperson'];
    (0, vitest_1.it)('should grant owner full access to all modules', async () => {
        const context = {
            userId: 'user-1',
            tenantId: 'tenant-1',
            role: 'owner',
        };
        const modules = ['products', 'users', 'stores', 'settings'];
        const actions = ['view', 'add', 'edit', 'delete'];
        for (const module of modules) {
            for (const action of actions) {
                const result = await service.checkPermission('user-1', module, action, undefined, context);
                (0, vitest_1.expect)(result.allowed).toBe(true);
            }
        }
    });
    (0, vitest_1.it)('should restrict salesperson to POS and basic sales', async () => {
        const context = {
            userId: 'user-1',
            tenantId: 'tenant-1',
            role: 'salesperson',
        };
        // Should have access to POS
        const posResult = await service.checkPermission('user-1', 'pos', 'add', undefined, context);
        (0, vitest_1.expect)(posResult.allowed).toBe(true);
        // Should have access to view products
        const productsViewResult = await service.checkPermission('user-1', 'products', 'view', undefined, context);
        (0, vitest_1.expect)(productsViewResult.allowed).toBe(true);
        // Should NOT have access to edit products
        const productsEditResult = await service.checkPermission('user-1', 'products', 'edit', undefined, context);
        (0, vitest_1.expect)(productsEditResult.allowed).toBe(false);
    });
});
//# sourceMappingURL=permission-service.test.js.map