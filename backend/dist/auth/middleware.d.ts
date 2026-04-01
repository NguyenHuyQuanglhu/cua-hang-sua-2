/**
 * Authentication Middleware for Express
 *
 * Provides authentication and authorization utilities for API routes.
 */
import { Request, Response, NextFunction } from 'express';
import { type JwtPayload } from './jwt';
import type { Permission, Module } from '../types';
export interface AuthenticatedRequest extends Request {
    user?: JwtPayload;
    storeId?: string;
}
export interface AuthResult {
    success: boolean;
    user?: JwtPayload;
    error?: string;
    status?: number;
}
/**
 * Extract JWT token from request (cookie or Authorization header)
 */
export declare function getTokenFromRequest(request: Request): string | null;
/**
 * Authenticate a request and return user info
 * Checks both token validity and session in database
 */
export declare function authenticateRequest(request: Request): Promise<AuthResult>;
/**
 * Check if user has permission for a specific action on a module
 */
export declare function hasPermission(user: JwtPayload, module: Module, permission: Permission): boolean;
/**
 * Express middleware for protected routes
 */
export declare function withAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void;
/**
 * Express middleware for protected routes with permission check
 */
export declare function withAuthAndPermission(module: Module, permission: Permission): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
/**
 * Get store ID from request headers or query params
 */
export declare function getStoreIdFromRequest(request: Request): string | null;
/**
 * Verify user has access to a specific store
 */
export declare function verifyStoreAccess(userId: string, storeId: string): Promise<boolean>;
/**
 * Create authentication error response object
 */
export declare function unauthorizedResponse(message?: string): {
    error: string;
    status: number;
};
/**
 * Create forbidden error response object
 */
export declare function forbiddenResponse(message?: string): {
    error: string;
    status: number;
};
//# sourceMappingURL=middleware.d.ts.map