"use strict";
/**
 * Authentication Middleware for Express
 *
 * Provides authentication and authorization utilities for API routes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTokenFromRequest = getTokenFromRequest;
exports.authenticateRequest = authenticateRequest;
exports.hasPermission = hasPermission;
exports.withAuth = withAuth;
exports.withAuthAndPermission = withAuthAndPermission;
exports.getStoreIdFromRequest = getStoreIdFromRequest;
exports.verifyStoreAccess = verifyStoreAccess;
exports.unauthorizedResponse = unauthorizedResponse;
exports.forbiddenResponse = forbiddenResponse;
const jwt_1 = require("./jwt");
const db_1 = require("../db");
const AUTH_COOKIE_NAME = 'auth-token';
/**
 * Extract JWT token from request (cookie or Authorization header)
 */
function getTokenFromRequest(request) {
    // Try cookie first
    const cookieToken = request.cookies?.[AUTH_COOKIE_NAME];
    if (cookieToken)
        return cookieToken;
    // Try Authorization header
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    return null;
}
/**
 * Authenticate a request and return user info
 * Checks both token validity and session in database
 */
async function authenticateRequest(request) {
    const token = getTokenFromRequest(request);
    if (!token) {
        return {
            success: false,
            error: 'Authentication required',
            status: 401,
        };
    }
    const payload = (0, jwt_1.validateToken)(token);
    if (!payload) {
        return {
            success: false,
            error: 'Invalid or expired token',
            status: 401,
        };
    }
    // Verify session exists in database
    try {
        const sessions = await (0, db_1.query)(`SELECT id FROM Sessions 
       WHERE token = @token AND expires_at > GETDATE()`, { token });
        if (sessions.length === 0) {
            return {
                success: false,
                error: 'Session expired or invalidated',
                status: 401,
            };
        }
    }
    catch {
        // If Sessions table doesn't exist, skip session check
    }
    return {
        success: true,
        user: payload,
    };
}
/**
 * Check if user has permission for a specific action on a module
 */
function hasPermission(user, module, permission) {
    // Admin/Owner has all permissions
    if (user.role === 'admin' || user.role === 'owner')
        return true;
    // Check specific permissions
    const permissions = user.permissions;
    const modulePermissions = permissions?.[module];
    if (!modulePermissions)
        return false;
    return modulePermissions.includes(permission);
}
/**
 * Express middleware for protected routes
 */
function withAuth(req, res, next) {
    authenticateRequest(req).then((authResult) => {
        if (!authResult.success || !authResult.user) {
            res.status(authResult.status || 401).json({ error: authResult.error });
            return;
        }
        req.user = authResult.user;
        next();
    }).catch((error) => {
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Internal server error' });
    });
}
/**
 * Express middleware for protected routes with permission check
 */
function withAuthAndPermission(module, permission) {
    return (req, res, next) => {
        authenticateRequest(req).then((authResult) => {
            if (!authResult.success || !authResult.user) {
                res.status(authResult.status || 401).json({ error: authResult.error });
                return;
            }
            if (!hasPermission(authResult.user, module, permission)) {
                res.status(403).json({ error: 'Permission denied' });
                return;
            }
            req.user = authResult.user;
            next();
        }).catch((error) => {
            console.error('Auth middleware error:', error);
            res.status(500).json({ error: 'Internal server error' });
        });
    };
}
/**
 * Get store ID from request headers or query params
 */
function getStoreIdFromRequest(request) {
    // Try header first
    const headerStoreId = request.headers['x-store-id'];
    if (headerStoreId) {
        return Array.isArray(headerStoreId) ? headerStoreId[0] : headerStoreId;
    }
    // Try query param
    return request.query.storeId;
}
/**
 * Verify user has access to a specific store
 */
async function verifyStoreAccess(userId, storeId) {
    const result = await (0, db_1.query)(`SELECT user_id FROM UserStores 
     WHERE user_id = @userId AND store_id = @storeId`, { userId, storeId });
    return result.length > 0;
}
/**
 * Create authentication error response object
 */
function unauthorizedResponse(message = 'Unauthorized') {
    return { error: message, status: 401 };
}
/**
 * Create forbidden error response object
 */
function forbiddenResponse(message = 'Forbidden') {
    return { error: message, status: 403 };
}
//# sourceMappingURL=middleware.js.map