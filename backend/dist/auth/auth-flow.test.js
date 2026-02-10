"use strict";
/**
 * Integration Tests for Authentication Flow
 *
 * Tests the multi-tenant authentication flow including:
 * - JWT token generation and validation
 * - Role-based authentication
 * - Token structure validation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_service_1 = require("../services/auth-service");
const jwt_1 = require("./jwt");
const JWT_SECRET = process.env.JWT_SECRET || 'smart-inventory-secret-key-change-in-production';
(0, vitest_1.describe)('Authentication Flow - JWT Token', () => {
    (0, vitest_1.describe)('Token Generation', () => {
        (0, vitest_1.it)('should generate valid JWT token with multi-tenant payload', () => {
            const payload = {
                userId: 'user-123',
                tenantUserId: 'tenant-user-456',
                tenantId: 'tenant-789',
                email: 'test@example.com',
                role: 'owner',
                stores: ['store-1', 'store-2'],
                sessionId: 'session-abc',
            };
            const token = (0, jwt_1.generateMultiTenantToken)(payload);
            (0, vitest_1.expect)(token).toBeDefined();
            (0, vitest_1.expect)(typeof token).toBe('string');
            (0, vitest_1.expect)(token.split('.')).toHaveLength(3); // JWT has 3 parts
        });
        (0, vitest_1.it)('should include all required fields in token payload', () => {
            const payload = {
                userId: 'user-123',
                tenantUserId: 'tenant-user-456',
                tenantId: 'tenant-789',
                email: 'test@example.com',
                role: 'store_manager',
                stores: ['store-1'],
                sessionId: 'session-abc',
            };
            const token = (0, jwt_1.generateMultiTenantToken)(payload);
            const decoded = jsonwebtoken_1.default.decode(token);
            (0, vitest_1.expect)(decoded.sub).toBe('user-123');
            (0, vitest_1.expect)(decoded.tenant_id).toBe('tenant-789');
            (0, vitest_1.expect)(decoded.tenant_user_id).toBe('tenant-user-456');
            (0, vitest_1.expect)(decoded.email).toBe('test@example.com');
            (0, vitest_1.expect)(decoded.role).toBe('store_manager');
            (0, vitest_1.expect)(decoded.stores).toEqual(['store-1']);
            (0, vitest_1.expect)(decoded.session_id).toBe('session-abc');
        });
        (0, vitest_1.it)('should set expiration time on token', () => {
            const payload = {
                userId: 'user-123',
                tenantUserId: 'tenant-user-456',
                tenantId: 'tenant-789',
                email: 'test@example.com',
                role: 'salesperson',
                stores: [],
                sessionId: 'session-abc',
            };
            const token = (0, jwt_1.generateMultiTenantToken)(payload);
            const decoded = jsonwebtoken_1.default.decode(token);
            (0, vitest_1.expect)(decoded.iat).toBeDefined();
            (0, vitest_1.expect)(decoded.exp).toBeDefined();
            (0, vitest_1.expect)(decoded.exp).toBeGreaterThan(decoded.iat);
        });
    });
    (0, vitest_1.describe)('Token Verification', () => {
        (0, vitest_1.it)('should verify valid token and return payload', () => {
            const payload = {
                userId: 'user-123',
                tenantUserId: 'tenant-user-456',
                tenantId: 'tenant-789',
                email: 'test@example.com',
                role: 'company_manager',
                stores: ['store-1', 'store-2'],
                sessionId: 'session-abc',
            };
            const token = (0, jwt_1.generateMultiTenantToken)(payload);
            const verified = (0, jwt_1.validateMultiTenantToken)(token);
            (0, vitest_1.expect)(verified).not.toBeNull();
            (0, vitest_1.expect)(verified?.sub).toBe('user-123');
            (0, vitest_1.expect)(verified?.tenant_id).toBe('tenant-789');
            (0, vitest_1.expect)(verified?.role).toBe('company_manager');
        });
        (0, vitest_1.it)('should return null for invalid token', () => {
            const result = (0, jwt_1.validateMultiTenantToken)('invalid-token');
            (0, vitest_1.expect)(result).toBeNull();
        });
        (0, vitest_1.it)('should return null for tampered token', () => {
            const payload = {
                userId: 'user-123',
                tenantUserId: 'tenant-user-456',
                tenantId: 'tenant-789',
                email: 'test@example.com',
                role: 'owner',
                stores: [],
                sessionId: 'session-abc',
            };
            const token = (0, jwt_1.generateMultiTenantToken)(payload);
            const tamperedToken = token.slice(0, -5) + 'xxxxx';
            const result = (0, jwt_1.validateMultiTenantToken)(tamperedToken);
            (0, vitest_1.expect)(result).toBeNull();
        });
        (0, vitest_1.it)('should return null for expired token', () => {
            // Create a token that's already expired
            const expiredToken = jsonwebtoken_1.default.sign({
                sub: 'user-123',
                tenant_id: 'tenant-789',
                email: 'test@example.com',
                role: 'owner',
                stores: [],
                session_id: 'session-abc',
            }, JWT_SECRET, { expiresIn: '-1h' } // Expired 1 hour ago
            );
            const result = (0, jwt_1.validateMultiTenantToken)(expiredToken);
            (0, vitest_1.expect)(result).toBeNull();
        });
    });
});
(0, vitest_1.describe)('AuthService - Token Validation', () => {
    let authService;
    (0, vitest_1.beforeEach)(() => {
        authService = new auth_service_1.AuthService();
    });
    (0, vitest_1.describe)('validateToken', () => {
        (0, vitest_1.it)('should validate and decode valid token', () => {
            const payload = {
                userId: 'user-123',
                tenantUserId: 'tenant-user-456',
                tenantId: 'tenant-789',
                email: 'test@example.com',
                role: 'owner',
                stores: ['store-1'],
                sessionId: 'session-abc',
            };
            const token = (0, jwt_1.generateMultiTenantToken)(payload);
            const decoded = authService.validateToken(token);
            (0, vitest_1.expect)(decoded).not.toBeNull();
            (0, vitest_1.expect)(decoded?.sub).toBe('user-123');
            (0, vitest_1.expect)(decoded?.tenant_id).toBe('tenant-789');
        });
        (0, vitest_1.it)('should return null for invalid token', () => {
            const result = authService.validateToken('invalid-token');
            (0, vitest_1.expect)(result).toBeNull();
        });
        (0, vitest_1.it)('should handle both old and new token formats', () => {
            // Old format token (for backward compatibility)
            const oldFormatToken = jsonwebtoken_1.default.sign({
                userId: 'user-123',
                tenantId: 'tenant-789',
                tenantUserId: 'tenant-user-456',
                email: 'test@example.com',
                role: 'owner',
                stores: [],
                sessionId: 'session-abc',
            }, JWT_SECRET, { expiresIn: '8h' });
            const decoded = authService.validateToken(oldFormatToken);
            (0, vitest_1.expect)(decoded).not.toBeNull();
            (0, vitest_1.expect)(decoded?.sub).toBe('user-123');
            (0, vitest_1.expect)(decoded?.tenant_id).toBe('tenant-789');
        });
    });
});
(0, vitest_1.describe)('Authentication Flow - Role Validation', () => {
    const validRoles = ['owner', 'company_manager', 'store_manager', 'salesperson'];
    (0, vitest_1.it)('should accept all valid roles in token', () => {
        for (const role of validRoles) {
            const payload = {
                userId: 'user-123',
                tenantUserId: 'tenant-user-456',
                tenantId: 'tenant-789',
                email: 'test@example.com',
                role,
                stores: [],
                sessionId: 'session-abc',
            };
            const token = (0, jwt_1.generateMultiTenantToken)(payload);
            const decoded = (0, jwt_1.validateMultiTenantToken)(token);
            (0, vitest_1.expect)(decoded).not.toBeNull();
            (0, vitest_1.expect)(decoded?.role).toBe(role);
        }
    });
});
(0, vitest_1.describe)('Authentication Flow - Store Access', () => {
    (0, vitest_1.it)('should include store IDs in token for store-specific access', () => {
        const stores = ['store-1', 'store-2', 'store-3'];
        const payload = {
            userId: 'user-123',
            tenantUserId: 'tenant-user-456',
            tenantId: 'tenant-789',
            email: 'test@example.com',
            role: 'store_manager',
            stores,
            sessionId: 'session-abc',
        };
        const token = (0, jwt_1.generateMultiTenantToken)(payload);
        const decoded = (0, jwt_1.validateMultiTenantToken)(token);
        (0, vitest_1.expect)(decoded?.stores).toEqual(stores);
        (0, vitest_1.expect)(decoded?.stores).toHaveLength(3);
    });
    (0, vitest_1.it)('should handle empty stores array for users without store assignments', () => {
        const payload = {
            userId: 'user-123',
            tenantUserId: 'tenant-user-456',
            tenantId: 'tenant-789',
            email: 'test@example.com',
            role: 'owner',
            stores: [],
            sessionId: 'session-abc',
        };
        const token = (0, jwt_1.generateMultiTenantToken)(payload);
        const decoded = (0, jwt_1.validateMultiTenantToken)(token);
        (0, vitest_1.expect)(decoded?.stores).toEqual([]);
    });
});
//# sourceMappingURL=auth-flow.test.js.map