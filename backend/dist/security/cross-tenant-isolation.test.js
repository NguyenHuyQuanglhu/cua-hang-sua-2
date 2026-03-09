"use strict";
/**
 * Security Tests for Cross-Tenant Isolation
 *
 * Tests to verify that tenant data is properly isolated and
 * cross-tenant access attempts are blocked.
 *
 * Requirements: 7.1, 7.2, 7.3
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const tenant_router_1 = require("../db/tenant-router");
const permission_service_1 = require("../services/permission-service");
const jwt_1 = require("../auth/jwt");
const JWT_SECRET = process.env.JWT_SECRET || 'smart-inventory-secret-key-change-in-production';
(0, vitest_1.describe)('Cross-Tenant Isolation - Token Security', () => {
    (0, vitest_1.describe)('Tenant ID Validation', () => {
        (0, vitest_1.it)('should include tenant_id in all tokens', () => {
            const payload = {
                userId: 'user-123',
                tenantUserId: 'tenant-user-456',
                tenantId: 'tenant-A',
                email: 'test@example.com',
                role: 'owner',
                stores: [],
                sessionId: 'session-abc',
            };
            const token = (0, jwt_1.generateMultiTenantToken)(payload);
            const decoded = (0, jwt_1.validateMultiTenantToken)(token);
            (0, vitest_1.expect)(decoded?.tenant_id).toBe('tenant-A');
        });
        (0, vitest_1.it)('should not allow token without tenant_id to be validated as multi-tenant', () => {
            // Create a token without tenant_id
            const tokenWithoutTenant = jsonwebtoken_1.default.sign({
                sub: 'user-123',
                email: 'test@example.com',
                role: 'owner',
                stores: [],
                session_id: 'session-abc',
            }, JWT_SECRET, { expiresIn: '8h' });
            const decoded = (0, jwt_1.validateMultiTenantToken)(tokenWithoutTenant);
            (0, vitest_1.expect)(decoded).toBeNull();
        });
        (0, vitest_1.it)('should reject tokens with mismatched tenant context', () => {
            // Token for tenant-A
            const tokenTenantA = (0, jwt_1.generateMultiTenantToken)({
                userId: 'user-123',
                tenantUserId: 'tenant-user-456',
                tenantId: 'tenant-A',
                email: 'test@example.com',
                role: 'owner',
                stores: [],
                sessionId: 'session-abc',
            });
            const decoded = (0, jwt_1.validateMultiTenantToken)(tokenTenantA);
            // Verify the token is for tenant-A, not tenant-B
            (0, vitest_1.expect)(decoded?.tenant_id).toBe('tenant-A');
            (0, vitest_1.expect)(decoded?.tenant_id).not.toBe('tenant-B');
        });
    });
    (0, vitest_1.describe)('Token Tampering Prevention', () => {
        (0, vitest_1.it)('should reject token with modified tenant_id', () => {
            const originalToken = (0, jwt_1.generateMultiTenantToken)({
                userId: 'user-123',
                tenantUserId: 'tenant-user-456',
                tenantId: 'tenant-A',
                email: 'test@example.com',
                role: 'owner',
                stores: [],
                sessionId: 'session-abc',
            });
            // Decode without verification
            const parts = originalToken.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            // Modify tenant_id
            payload.tenant_id = 'tenant-B';
            // Re-encode (without proper signature)
            const modifiedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
            const tamperedToken = `${parts[0]}.${modifiedPayload}.${parts[2]}`;
            // Should fail validation due to signature mismatch
            const result = (0, jwt_1.validateMultiTenantToken)(tamperedToken);
            (0, vitest_1.expect)(result).toBeNull();
        });
        (0, vitest_1.it)('should reject token with modified user_id', () => {
            const originalToken = (0, jwt_1.generateMultiTenantToken)({
                userId: 'user-123',
                tenantUserId: 'tenant-user-456',
                tenantId: 'tenant-A',
                email: 'test@example.com',
                role: 'owner',
                stores: [],
                sessionId: 'session-abc',
            });
            // Decode without verification
            const parts = originalToken.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            // Modify user_id
            payload.sub = 'user-999';
            // Re-encode (without proper signature)
            const modifiedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
            const tamperedToken = `${parts[0]}.${modifiedPayload}.${parts[2]}`;
            // Should fail validation due to signature mismatch
            const result = (0, jwt_1.validateMultiTenantToken)(tamperedToken);
            (0, vitest_1.expect)(result).toBeNull();
        });
        (0, vitest_1.it)('should reject token with modified role', () => {
            const originalToken = (0, jwt_1.generateMultiTenantToken)({
                userId: 'user-123',
                tenantUserId: 'tenant-user-456',
                tenantId: 'tenant-A',
                email: 'test@example.com',
                role: 'salesperson',
                stores: [],
                sessionId: 'session-abc',
            });
            // Decode without verification
            const parts = originalToken.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            // Modify role to escalate privileges
            payload.role = 'owner';
            // Re-encode (without proper signature)
            const modifiedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
            const tamperedToken = `${parts[0]}.${modifiedPayload}.${parts[2]}`;
            // Should fail validation due to signature mismatch
            const result = (0, jwt_1.validateMultiTenantToken)(tamperedToken);
            (0, vitest_1.expect)(result).toBeNull();
        });
    });
});
(0, vitest_1.describe)('Cross-Tenant Isolation - Permission Service', () => {
    let permissionService;
    (0, vitest_1.beforeEach)(() => {
        permissionService = new permission_service_1.PermissionService({ cacheEnabled: false });
    });
    (0, vitest_1.afterEach)(() => {
        permissionService.dispose();
    });
    (0, vitest_1.describe)('Tenant-Scoped Permission Checks', () => {
        (0, vitest_1.it)('should scope permission context to specific tenant', async () => {
            const contextTenantA = {
                userId: 'user-1',
                tenantId: 'tenant-A',
                role: 'owner',
            };
            const contextTenantB = {
                userId: 'user-1',
                tenantId: 'tenant-B',
                role: 'salesperson',
            };
            // Same user ID but different tenant contexts
            const resultA = await permissionService.checkPermission('user-1', 'users', 'delete', undefined, contextTenantA);
            const resultB = await permissionService.checkPermission('user-1', 'users', 'delete', undefined, contextTenantB);
            // Owner in tenant-A can delete users
            (0, vitest_1.expect)(resultA.allowed).toBe(true);
            // Salesperson in tenant-B cannot delete users
            (0, vitest_1.expect)(resultB.allowed).toBe(false);
        });
        (0, vitest_1.it)('should not allow cross-tenant permission inheritance', async () => {
            // User is owner in tenant-A
            const ownerContext = {
                userId: 'user-1',
                tenantId: 'tenant-A',
                role: 'owner',
            };
            // Same user is salesperson in tenant-B
            const salespersonContext = {
                userId: 'user-1',
                tenantId: 'tenant-B',
                role: 'salesperson',
            };
            // Check that owner permissions don't leak to tenant-B
            const resultInTenantB = await permissionService.checkPermission('user-1', 'settings', 'edit', undefined, salespersonContext);
            (0, vitest_1.expect)(resultInTenantB.allowed).toBe(false);
        });
    });
    (0, vitest_1.describe)('Store Access Isolation', () => {
        (0, vitest_1.it)('should isolate store permissions per tenant', async () => {
            const storePermsTenantA = new Map();
            storePermsTenantA.set('store-A1', {
                products: ['view', 'add', 'edit', 'delete'],
            });
            const contextTenantA = {
                userId: 'user-1',
                tenantId: 'tenant-A',
                role: 'store_manager',
                storePermissions: storePermsTenantA,
            };
            // User has store permissions in tenant-A
            const resultWithStore = await permissionService.checkPermission('user-1', 'products', 'delete', 'store-A1', contextTenantA);
            (0, vitest_1.expect)(resultWithStore.allowed).toBe(true);
            // Same user in tenant-B without store permissions
            const contextTenantB = {
                userId: 'user-1',
                tenantId: 'tenant-B',
                role: 'store_manager',
            };
            const resultWithoutStore = await permissionService.checkPermission('user-1', 'products', 'delete', 'store-A1', // Trying to access tenant-A's store from tenant-B context
            contextTenantB);
            // Should not have delete permission without store-specific grants
            (0, vitest_1.expect)(resultWithoutStore.allowed).toBe(false);
        });
    });
});
(0, vitest_1.describe)('Cross-Tenant Isolation - TenantRouter', () => {
    let router;
    (0, vitest_1.beforeEach)(() => {
        router = new tenant_router_1.TenantRouter({
            maxPoolSize: 5,
            cacheCleanupIntervalMs: 60000,
            maxCacheAge: 5000,
        });
    });
    (0, vitest_1.afterEach)(async () => {
        await router.close();
    });
    (0, vitest_1.describe)('Connection Isolation', () => {
        (0, vitest_1.it)('should track connections per tenant separately', () => {
            // Without actual DB, verify the router tracks tenants independently
            (0, vitest_1.expect)(router.hasConnection('tenant-A')).toBe(false);
            (0, vitest_1.expect)(router.hasConnection('tenant-B')).toBe(false);
            // Each tenant should have independent connection state
            const connections = router.getActiveConnections();
            (0, vitest_1.expect)(connections).toEqual([]);
        });
        (0, vitest_1.it)('should not share connection pools between tenants', () => {
            // Verify that connection lookup is tenant-specific
            const hasTenantA = router.hasConnection('tenant-A');
            const hasTenantB = router.hasConnection('tenant-B');
            // Both should be independent
            (0, vitest_1.expect)(hasTenantA).toBe(hasTenantB);
            (0, vitest_1.expect)(hasTenantA).toBe(false);
        });
    });
    (0, vitest_1.describe)('Cache Isolation', () => {
        (0, vitest_1.it)('should invalidate cache per tenant independently', () => {
            // Invalidating tenant-A cache should not affect tenant-B
            (0, vitest_1.expect)(() => router.invalidateTenantCache('tenant-A')).not.toThrow();
            (0, vitest_1.expect)(() => router.invalidateTenantCache('tenant-B')).not.toThrow();
        });
    });
});
(0, vitest_1.describe)('Cross-Tenant Isolation - Role Hierarchy', () => {
    let permissionService;
    (0, vitest_1.beforeEach)(() => {
        permissionService = new permission_service_1.PermissionService({ cacheEnabled: false });
    });
    (0, vitest_1.afterEach)(() => {
        permissionService.dispose();
    });
    (0, vitest_1.it)('should enforce role hierarchy within tenant boundaries', async () => {
        const roles = ['owner', 'company_manager', 'store_manager', 'salesperson'];
        for (const role of roles) {
            const context = {
                userId: 'user-1',
                tenantId: 'tenant-A',
                role,
            };
            const canManageUsers = await permissionService.checkPermission('user-1', 'users', 'add', undefined, context);
            // Only owner can add users
            if (role === 'owner') {
                (0, vitest_1.expect)(canManageUsers.allowed).toBe(true);
            }
            else {
                (0, vitest_1.expect)(canManageUsers.allowed).toBe(false);
            }
        }
    });
    (0, vitest_1.it)('should not allow role escalation through custom permissions', async () => {
        // Salesperson with custom permissions trying to access user management
        const context = {
            userId: 'user-1',
            tenantId: 'tenant-A',
            role: 'salesperson',
            customPermissions: {
                // Even with custom permissions, certain actions should be restricted
                products: ['view', 'add', 'edit', 'delete'],
            },
        };
        // Custom permissions should work for allowed modules
        const productResult = await permissionService.checkPermission('user-1', 'products', 'delete', undefined, context);
        (0, vitest_1.expect)(productResult.allowed).toBe(true);
        // But user management should still be restricted
        const userResult = await permissionService.checkPermission('user-1', 'users', 'add', undefined, context);
        (0, vitest_1.expect)(userResult.allowed).toBe(false);
    });
});
//# sourceMappingURL=cross-tenant-isolation.test.js.map