/**
 * Authentication Service for Multi-tenant RBAC
 *
 * Handles authentication flow using Master DB for user lookup
 * and Tenant DB for full user info and permissions.
 *
 * Requirements: 5.1, 5.2, 5.3
 */
import type { Permissions, UserRole } from '../types';
import { type MultiTenantJwtPayload } from '../auth/jwt';
/**
 * Re-export MultiTenantJwtPayload for backward compatibility
 * The canonical definition is now in auth/jwt.ts
 */
export type { MultiTenantJwtPayload } from '../auth/jwt';
/**
 * User info from Tenant DB
 */
export interface TenantDbUser {
    id: string;
    email: string;
    displayName?: string;
    role: UserRole;
    permissions?: Permissions;
    status: string;
}
/**
 * Store assignment info
 */
export interface UserStoreInfo {
    storeId: string;
    storeName: string;
    storeCode: string;
    roleOverride?: UserRole;
}
/**
 * Full authentication result
 */
export interface AuthenticationResult {
    success: boolean;
    error?: string;
    errorCode?: string;
    isLocked?: boolean;
    lockRemainingMinutes?: number;
    token?: string;
    expiresAt?: string;
    user?: {
        id: string;
        tenantUserId: string;
        tenantId: string;
        email: string;
        displayName?: string;
        role: UserRole;
        permissions: Permissions;
    };
    tenant?: {
        id: string;
        name: string;
        slug: string;
    };
    stores?: UserStoreInfo[];
}
/**
 * Authentication Service class
 */
export declare class AuthService {
    /**
     * Authenticate user using Master DB first, then Tenant DB
     *
     * Flow:
     * 1. Lookup user in Master DB (TenantUsers)
     * 2. Verify password and check lockout
     * 3. Get tenant info and connect to Tenant DB
     * 4. Get full user info and permissions from Tenant DB
     * 5. Generate JWT with tenant_id, role, and accessible stores
     *
     * Requirements: 5.1, 5.2, 5.3
     */
    authenticate(email: string, password: string): Promise<AuthenticationResult>;
    /**
     * Get user info from Tenant DB
     */
    private getTenantDbUser;
    /**
     * Get user's accessible stores from Tenant DB
     * For owner and company_manager, returns all active stores
     * For other roles, returns only assigned stores
     */
    private getUserStores;
    /**
     * Create session in Tenant DB
     */
    private createSession;
    /**
     * Validate and decode JWT token
     * Uses the new multi-tenant token format with 'sub' and 'tenant_id' fields
     */
    validateToken(token: string): MultiTenantJwtPayload | null;
    /**
     * Logout - invalidate session
     */
    logout(tenantId: string, sessionId: string): Promise<boolean>;
    /**
     * Validate session exists and is not expired
     */
    validateSession(tenantId: string, sessionId: string, userId: string): Promise<boolean>;
    /**
     * Get current user info (for /me endpoint)
     */
    getCurrentUser(tenantId: string, userId: string): Promise<AuthenticationResult | null>;
}
export declare const authService: AuthService;
//# sourceMappingURL=auth-service.d.ts.map