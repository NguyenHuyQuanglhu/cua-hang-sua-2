/**
 * Authentication Middleware for Multi-tenant RBAC
 *
 * Handles JWT validation and user context for both
 * multi-tenant and legacy authentication.
 *
 * Requirements: 5.1, 5.2
 */
import { Request, Response, NextFunction } from 'express';
import sql from 'mssql';
import type { Permissions } from '../types';
/**
 * Authenticated user info
 */
export interface AuthUser {
    id: string;
    email: string;
    displayName?: string;
    role: string;
    storeId?: string;
    tenantId?: string;
    tenantUserId?: string;
    permissions?: Permissions;
    stores?: string[];
}
/**
 * Extended request with auth info
 */
export interface AuthRequest extends Request {
    user?: AuthUser;
    storeId?: string;
    tenantId?: string;
    tenantPool?: sql.ConnectionPool;
}
/**
 * Authentication middleware
 *
 * Supports both multi-tenant and legacy JWT tokens.
 * For multi-tenant tokens, validates session in Tenant DB.
 * For legacy tokens, validates session in current DB.
 */
export declare function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Store context middleware - extracts storeId from header
 * Also validates store access for multi-tenant users
 */
export declare function storeContext(req: AuthRequest, res: Response, next: NextFunction): void;
/**
 * Role-based authorization middleware
 */
export declare function authorize(...allowedRoles: string[]): (req: AuthRequest, res: Response, next: NextFunction) => void;
/**
 * Permission-based authorization middleware
 * Checks if user has specific permission for a module
 */
export declare function requirePermission(module: string, action: 'view' | 'add' | 'edit' | 'delete'): (req: AuthRequest, res: Response, next: NextFunction) => void;
/**
 * Tenant context middleware
 * Ensures tenant connection is available for multi-tenant requests
 */
export declare function ensureTenantContext(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=auth.d.ts.map