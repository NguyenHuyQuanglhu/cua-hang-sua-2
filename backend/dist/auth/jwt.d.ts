import type { Permissions, UserRole } from '../types';
/**
 * Legacy JWT Payload (for backward compatibility)
 */
export interface JwtPayload {
    userId: string;
    email: string;
    displayName?: string;
    role: string;
    permissions?: Permissions;
    iat?: number;
    exp?: number;
}
/**
 * Multi-tenant JWT Payload structure
 * Aligned with design document specification
 *
 * Requirements: 5.1, 5.4
 */
export interface MultiTenantJwtPayload {
    sub: string;
    tenant_id: string;
    tenant_user_id: string;
    email: string;
    role: UserRole;
    stores: string[];
    session_id: string;
    iat?: number;
    exp?: number;
}
export interface Store {
    id: string;
    ownerId: string;
    name: string;
    code: string;
    address?: string;
    phone?: string;
    businessType?: string;
    logo?: string;
    settings?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
    status: 'active' | 'inactive';
}
/**
 * User with stores info (for login response)
 */
export interface UserWithStores {
    id: string;
    tenantId: string;
    tenantUserId: string;
    email: string;
    displayName?: string;
    role: UserRole;
    permissions?: Permissions;
    stores: Store[];
    currentStoreId?: string;
}
/**
 * Generate a legacy JWT token for authenticated user
 * Token is valid for 8 hours
 * @param user - User data to encode in token
 * @returns JWT token string
 * @deprecated Use generateMultiTenantToken for multi-tenant support
 */
export declare function generateToken(user: {
    id: string;
    email: string;
    displayName?: string;
    role: string;
    permissions?: Permissions;
}): string;
/**
 * Generate a multi-tenant JWT token
 * Token is valid for 8 hours as per requirement 5.4
 *
 * @param payload - Multi-tenant payload data
 * @returns JWT token string
 *
 * Requirements: 5.1, 5.4
 */
export declare function generateMultiTenantToken(payload: {
    userId: string;
    tenantUserId: string;
    tenantId: string;
    email: string;
    role: UserRole;
    stores: string[];
    sessionId: string;
}): string;
/**
 * Validate and decode a JWT token (legacy format)
 * @param token - JWT token to validate
 * @returns Decoded payload if valid, null if invalid or expired
 */
export declare function validateToken(token: string): JwtPayload | null;
/**
 * Validate and decode a multi-tenant JWT token
 * @param token - JWT token to validate
 * @returns Decoded payload if valid, null if invalid or expired
 *
 * Requirements: 5.1, 5.4
 */
export declare function validateMultiTenantToken(token: string): MultiTenantJwtPayload | null;
/**
 * Decode a JWT token without validation (for debugging)
 * @param token - JWT token to decode
 * @returns Decoded payload or null
 */
export declare function decodeToken(token: string): JwtPayload | MultiTenantJwtPayload | null;
/**
 * Check if a token is a multi-tenant token
 * @param token - JWT token to check
 * @returns True if multi-tenant token, false otherwise
 */
export declare function isMultiTenantToken(token: string): boolean;
/**
 * Check if a token is expired
 * @param token - JWT token to check
 * @returns True if expired, false otherwise
 */
export declare function isTokenExpired(token: string): boolean;
/**
 * Get tenant_id from a multi-tenant token
 * @param token - JWT token
 * @returns tenant_id or null
 */
export declare function getTenantIdFromToken(token: string): string | null;
/**
 * Get user_id from a token (supports both legacy and multi-tenant)
 * @param token - JWT token
 * @returns user_id or null
 */
export declare function getUserIdFromToken(token: string): string | null;
/**
 * Get accessible stores from a multi-tenant token
 * @param token - JWT token
 * @returns Array of store IDs or empty array
 */
export declare function getStoresFromToken(token: string): string[];
/**
 * Get role from a token (supports both legacy and multi-tenant)
 * @param token - JWT token
 * @returns role or null
 */
export declare function getRoleFromToken(token: string): string | null;
//# sourceMappingURL=jwt.d.ts.map