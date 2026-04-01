import { Request } from 'express';
import { CreateAuditLogInput } from '../repositories/audit-log-repository';
/**
 * Extract IP address from request
 */
export declare function getIpAddress(request: Request): string;
/**
 * Extract User-Agent from request
 */
export declare function getUserAgent(request: Request): string;
/**
 * Log an audit event
 */
export declare function logAudit(input: CreateAuditLogInput): Promise<void>;
/**
 * Log a CREATE action
 */
export declare function logCreate(storeId: string, entityType: string, entityId: string, newValues: Record<string, unknown>, userId?: string, ipAddress?: string, userAgent?: string): Promise<void>;
/**
 * Log an UPDATE action
 */
export declare function logUpdate(storeId: string, entityType: string, entityId: string, oldValues: Record<string, unknown>, newValues: Record<string, unknown>, userId?: string, ipAddress?: string, userAgent?: string): Promise<void>;
/**
 * Log a DELETE action
 */
export declare function logDelete(storeId: string, entityType: string, entityId: string, oldValues: Record<string, unknown>, userId?: string, ipAddress?: string, userAgent?: string): Promise<void>;
/**
 * Log a LOGIN action
 */
export declare function logLogin(storeId: string, userId: string, ipAddress?: string, userAgent?: string): Promise<void>;
/**
 * Log a LOGOUT action
 */
export declare function logLogout(storeId: string, userId: string, ipAddress?: string, userAgent?: string): Promise<void>;
/**
 * Log a LOGIN_FAILED action
 */
export declare function logLoginFailed(storeId: string, email: string, ipAddress?: string, userAgent?: string): Promise<void>;
/**
 * Log an EXPORT action
 */
export declare function logExport(storeId: string, entityType: string, userId?: string, ipAddress?: string, userAgent?: string, details?: Record<string, unknown>): Promise<void>;
/**
 * Log a VIEW action
 */
export declare function logView(storeId: string, entityType: string, entityId?: string, userId?: string, ipAddress?: string, userAgent?: string): Promise<void>;
export { auditLogRepository } from '../repositories/audit-log-repository';
export type { AuditLog, AuditAction, CreateAuditLogInput, AuditLogFilterOptions, PaginatedAuditLogs, } from '../repositories/audit-log-repository';
//# sourceMappingURL=index.d.ts.map