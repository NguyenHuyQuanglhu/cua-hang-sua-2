"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = generateToken;
exports.generateMultiTenantToken = generateMultiTenantToken;
exports.validateToken = validateToken;
exports.validateMultiTenantToken = validateMultiTenantToken;
exports.decodeToken = decodeToken;
exports.isMultiTenantToken = isMultiTenantToken;
exports.isTokenExpired = isTokenExpired;
exports.getTenantIdFromToken = getTenantIdFromToken;
exports.getUserIdFromToken = getUserIdFromToken;
exports.getStoresFromToken = getStoresFromToken;
exports.getRoleFromToken = getRoleFromToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'smart-inventory-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h'; // 8 hours as per requirement 5.4
/**
 * Generate a legacy JWT token for authenticated user
 * Token is valid for 8 hours
 * @param user - User data to encode in token
 * @returns JWT token string
 * @deprecated Use generateMultiTenantToken for multi-tenant support
 */
function generateToken(user) {
    const payload = {
        userId: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        permissions: user.permissions,
    };
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
/**
 * Generate a multi-tenant JWT token
 * Token is valid for 8 hours as per requirement 5.4
 *
 * @param payload - Multi-tenant payload data
 * @returns JWT token string
 *
 * Requirements: 5.1, 5.4
 */
function generateMultiTenantToken(payload) {
    const tokenPayload = {
        sub: payload.userId,
        tenant_id: payload.tenantId,
        tenant_user_id: payload.tenantUserId,
        email: payload.email,
        role: payload.role,
        stores: payload.stores,
        session_id: payload.sessionId,
    };
    return jsonwebtoken_1.default.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
/**
 * Validate and decode a JWT token (legacy format)
 * @param token - JWT token to validate
 * @returns Decoded payload if valid, null if invalid or expired
 */
function validateToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        return decoded;
    }
    catch {
        return null;
    }
}
/**
 * Validate and decode a multi-tenant JWT token
 * @param token - JWT token to validate
 * @returns Decoded payload if valid, null if invalid or expired
 *
 * Requirements: 5.1, 5.4
 */
function validateMultiTenantToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Check if it's a multi-tenant token by verifying required fields
        if (decoded.tenant_id && decoded.sub) {
            return decoded;
        }
        return null;
    }
    catch {
        return null;
    }
}
/**
 * Decode a JWT token without validation (for debugging)
 * @param token - JWT token to decode
 * @returns Decoded payload or null
 */
function decodeToken(token) {
    try {
        return jsonwebtoken_1.default.decode(token);
    }
    catch {
        return null;
    }
}
/**
 * Check if a token is a multi-tenant token
 * @param token - JWT token to check
 * @returns True if multi-tenant token, false otherwise
 */
function isMultiTenantToken(token) {
    const decoded = decodeToken(token);
    if (!decoded)
        return false;
    return 'tenant_id' in decoded && 'sub' in decoded;
}
/**
 * Check if a token is expired
 * @param token - JWT token to check
 * @returns True if expired, false otherwise
 */
function isTokenExpired(token) {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp)
        return true;
    return Date.now() >= decoded.exp * 1000;
}
/**
 * Get tenant_id from a multi-tenant token
 * @param token - JWT token
 * @returns tenant_id or null
 */
function getTenantIdFromToken(token) {
    const decoded = validateMultiTenantToken(token);
    return decoded?.tenant_id || null;
}
/**
 * Get user_id from a token (supports both legacy and multi-tenant)
 * @param token - JWT token
 * @returns user_id or null
 */
function getUserIdFromToken(token) {
    const decoded = decodeToken(token);
    if (!decoded)
        return null;
    // Multi-tenant token uses 'sub' field
    if ('sub' in decoded) {
        return decoded.sub;
    }
    // Legacy token uses 'userId' field
    if ('userId' in decoded) {
        return decoded.userId;
    }
    return null;
}
/**
 * Get accessible stores from a multi-tenant token
 * @param token - JWT token
 * @returns Array of store IDs or empty array
 */
function getStoresFromToken(token) {
    const decoded = validateMultiTenantToken(token);
    return decoded?.stores || [];
}
/**
 * Get role from a token (supports both legacy and multi-tenant)
 * @param token - JWT token
 * @returns role or null
 */
function getRoleFromToken(token) {
    const decoded = decodeToken(token);
    if (!decoded)
        return null;
    return decoded.role || null;
}
//# sourceMappingURL=jwt.js.map