/**
 * Audit action types
 */
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'VIEW' | 'EXPORT';
/**
 * AuditLog entity interface (matches SQL schema)
 */
export interface AuditLog {
    id: string;
    storeId: string;
    userId?: string;
    action: AuditAction;
    entityType: string;
    entityId?: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    createdAt: string;
}
/**
 * Input for creating an audit log entry
 */
export interface CreateAuditLogInput {
    storeId: string;
    userId?: string;
    action: AuditAction;
    entityType: string;
    entityId?: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
}
/**
 * Filter options for querying audit logs
 */
export interface AuditLogFilterOptions {
    userId?: string;
    action?: AuditAction;
    entityType?: string;
    entityId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
}
/**
 * Paginated result for audit logs
 */
export interface PaginatedAuditLogs {
    data: AuditLog[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
/**
 * AuditLog repository for managing audit trail
 * Note: This repository does NOT extend BaseRepository because audit logs
 * have different requirements (no update/delete)
 */
export declare class AuditLogRepository {
    /**
     * Map database record to AuditLog entity
     */
    private mapToEntity;
    /**
     * Create a new audit log entry
     */
    create(input: CreateAuditLogInput): Promise<AuditLog>;
    /**
     * Find audit logs for a specific store with filtering and pagination
     */
    findByStore(storeId: string, options?: AuditLogFilterOptions): Promise<PaginatedAuditLogs>;
    /**
     * Find audit logs for a specific entity
     */
    findByEntity(entityType: string, entityId: string, storeId?: string): Promise<AuditLog[]>;
    /**
     * Find audit logs for a specific user
     */
    findByUser(userId: string, options?: AuditLogFilterOptions): Promise<PaginatedAuditLogs>;
    /**
     * Get audit log by ID
     */
    findById(id: string): Promise<AuditLog | null>;
    /**
     * Get distinct entity types that have been audited
     */
    getAuditedEntityTypes(storeId?: string): Promise<string[]>;
    /**
     * Get audit summary statistics for a store
     */
    getSummary(storeId: string, dateFrom?: string, dateTo?: string): Promise<{
        totalActions: number;
        actionCounts: Record<string, number>;
        entityTypeCounts: Record<string, number>;
    }>;
}
export declare const auditLogRepository: AuditLogRepository;
//# sourceMappingURL=audit-log-repository.d.ts.map