"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogRepository = void 0;
exports.getIpAddress = getIpAddress;
exports.getUserAgent = getUserAgent;
exports.logAudit = logAudit;
exports.logCreate = logCreate;
exports.logUpdate = logUpdate;
exports.logDelete = logDelete;
exports.logLogin = logLogin;
exports.logLogout = logLogout;
exports.logLoginFailed = logLoginFailed;
exports.logExport = logExport;
exports.logView = logView;
const audit_log_repository_1 = require("../repositories/audit-log-repository");
/**
 * Extract IP address from request
 */
function getIpAddress(request) {
    // Try X-Forwarded-For header first (for proxied requests)
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
        const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
        return ip.split(',')[0].trim();
    }
    // Try X-Real-IP header
    const realIp = request.headers['x-real-ip'];
    if (realIp) {
        return Array.isArray(realIp) ? realIp[0] : realIp;
    }
    // Try socket remote address
    if (request.socket?.remoteAddress) {
        return request.socket.remoteAddress;
    }
    // Default to unknown
    return 'unknown';
}
/**
 * Extract User-Agent from request
 */
function getUserAgent(request) {
    const userAgent = request.headers['user-agent'];
    return userAgent || 'unknown';
}
/**
 * Log an audit event
 */
async function logAudit(input) {
    try {
        await audit_log_repository_1.auditLogRepository.create(input);
    }
    catch (error) {
        // Log error but don't throw - audit logging should not break the main flow
        console.error('Failed to create audit log:', error);
    }
}
/**
 * Log a CREATE action
 */
async function logCreate(storeId, entityType, entityId, newValues, userId, ipAddress, userAgent) {
    await logAudit({
        storeId,
        action: 'CREATE',
        entityType,
        entityId,
        newValues,
        userId,
        ipAddress,
        userAgent,
    });
}
/**
 * Log an UPDATE action
 */
async function logUpdate(storeId, entityType, entityId, oldValues, newValues, userId, ipAddress, userAgent) {
    await logAudit({
        storeId,
        action: 'UPDATE',
        entityType,
        entityId,
        oldValues,
        newValues,
        userId,
        ipAddress,
        userAgent,
    });
}
/**
 * Log a DELETE action
 */
async function logDelete(storeId, entityType, entityId, oldValues, userId, ipAddress, userAgent) {
    await logAudit({
        storeId,
        action: 'DELETE',
        entityType,
        entityId,
        oldValues,
        userId,
        ipAddress,
        userAgent,
    });
}
/**
 * Log a LOGIN action
 */
async function logLogin(storeId, userId, ipAddress, userAgent) {
    await logAudit({
        storeId,
        action: 'LOGIN',
        entityType: 'User',
        entityId: userId,
        userId,
        ipAddress,
        userAgent,
    });
}
/**
 * Log a LOGOUT action
 */
async function logLogout(storeId, userId, ipAddress, userAgent) {
    await logAudit({
        storeId,
        action: 'LOGOUT',
        entityType: 'User',
        entityId: userId,
        userId,
        ipAddress,
        userAgent,
    });
}
/**
 * Log a LOGIN_FAILED action
 */
async function logLoginFailed(storeId, email, ipAddress, userAgent) {
    await logAudit({
        storeId,
        action: 'LOGIN_FAILED',
        entityType: 'User',
        newValues: { email },
        ipAddress,
        userAgent,
    });
}
/**
 * Log an EXPORT action
 */
async function logExport(storeId, entityType, userId, ipAddress, userAgent, details) {
    await logAudit({
        storeId,
        action: 'EXPORT',
        entityType,
        newValues: details,
        userId,
        ipAddress,
        userAgent,
    });
}
/**
 * Log a VIEW action
 */
async function logView(storeId, entityType, entityId, userId, ipAddress, userAgent) {
    await logAudit({
        storeId,
        action: 'VIEW',
        entityType,
        entityId,
        userId,
        ipAddress,
        userAgent,
    });
}
// Re-export types and repository
var audit_log_repository_2 = require("../repositories/audit-log-repository");
Object.defineProperty(exports, "auditLogRepository", { enumerable: true, get: function () { return audit_log_repository_2.auditLogRepository; } });
//# sourceMappingURL=index.js.map