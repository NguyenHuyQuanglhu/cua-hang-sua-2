"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogRepository = exports.AuditLogRepository = void 0;
const db_1 = require("../db");
/**
 * AuditLog repository for managing audit trail
 * Note: This repository does NOT extend BaseRepository because audit logs
 * have different requirements (no update/delete)
 */
class AuditLogRepository {
    /**
     * Map database record to AuditLog entity
     */
    mapToEntity(record) {
        return {
            id: record.Id,
            storeId: record.StoreId,
            userId: record.UserId || undefined,
            action: record.Action,
            entityType: record.EntityType,
            entityId: record.EntityId || undefined,
            oldValues: record.OldValues ? JSON.parse(record.OldValues) : undefined,
            newValues: record.NewValues ? JSON.parse(record.NewValues) : undefined,
            ipAddress: record.IpAddress || undefined,
            userAgent: record.UserAgent || undefined,
            createdAt: record.CreatedAt instanceof Date
                ? record.CreatedAt.toISOString()
                : String(record.CreatedAt),
        };
    }
    /**
     * Create a new audit log entry
     */
    async create(input) {
        const record = {
            Id: crypto.randomUUID(),
            StoreId: input.storeId,
            UserId: input.userId || null,
            Action: input.action,
            EntityType: input.entityType,
            EntityId: input.entityId || null,
            OldValues: input.oldValues ? JSON.stringify(input.oldValues) : null,
            NewValues: input.newValues ? JSON.stringify(input.newValues) : null,
            IpAddress: input.ipAddress || null,
            UserAgent: input.userAgent || null,
            CreatedAt: new Date(),
        };
        const result = await (0, db_1.insert)('AuditLogs', record);
        if (!result) {
            throw new Error('Failed to create audit log entry');
        }
        return this.mapToEntity(result);
    }
    /**
     * Find audit logs for a specific store with filtering and pagination
     */
    async findByStore(storeId, options) {
        const page = options?.page || 1;
        const pageSize = options?.pageSize || 20;
        const offset = (page - 1) * pageSize;
        let whereClause = 'StoreId = @storeId';
        const params = { storeId };
        if (options?.userId) {
            whereClause += ' AND UserId = @userId';
            params.userId = options.userId;
        }
        if (options?.action) {
            whereClause += ' AND Action = @action';
            params.action = options.action;
        }
        if (options?.entityType) {
            whereClause += ' AND EntityType = @entityType';
            params.entityType = options.entityType;
        }
        if (options?.entityId) {
            whereClause += ' AND EntityId = @entityId';
            params.entityId = options.entityId;
        }
        if (options?.dateFrom) {
            whereClause += ' AND CreatedAt >= @dateFrom';
            params.dateFrom = new Date(options.dateFrom);
        }
        if (options?.dateTo) {
            whereClause += ' AND CreatedAt <= @dateTo';
            params.dateTo = new Date(options.dateTo);
        }
        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM AuditLogs WHERE ${whereClause}`;
        const countResult = await (0, db_1.queryOne)(countQuery, params);
        const total = countResult?.total ?? 0;
        // Get paginated results
        const dataQuery = `
      SELECT * FROM AuditLogs 
      WHERE ${whereClause}
      ORDER BY CreatedAt DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `;
        const results = await (0, db_1.query)(dataQuery, {
            ...params,
            offset,
            pageSize,
        });
        return {
            data: results.map((r) => this.mapToEntity(r)),
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        };
    }
    /**
     * Find audit logs for a specific entity
     */
    async findByEntity(entityType, entityId, storeId) {
        let whereClause = 'EntityType = @entityType AND EntityId = @entityId';
        const params = { entityType, entityId };
        if (storeId) {
            whereClause += ' AND StoreId = @storeId';
            params.storeId = storeId;
        }
        const results = await (0, db_1.query)(`SELECT * FROM AuditLogs 
       WHERE ${whereClause}
       ORDER BY CreatedAt DESC`, params);
        return results.map((r) => this.mapToEntity(r));
    }
    /**
     * Find audit logs for a specific user
     */
    async findByUser(userId, options) {
        const page = options?.page || 1;
        const pageSize = options?.pageSize || 20;
        const offset = (page - 1) * pageSize;
        let whereClause = 'UserId = @userId';
        const params = { userId };
        if (options?.action) {
            whereClause += ' AND Action = @action';
            params.action = options.action;
        }
        if (options?.entityType) {
            whereClause += ' AND EntityType = @entityType';
            params.entityType = options.entityType;
        }
        if (options?.dateFrom) {
            whereClause += ' AND CreatedAt >= @dateFrom';
            params.dateFrom = new Date(options.dateFrom);
        }
        if (options?.dateTo) {
            whereClause += ' AND CreatedAt <= @dateTo';
            params.dateTo = new Date(options.dateTo);
        }
        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM AuditLogs WHERE ${whereClause}`;
        const countResult = await (0, db_1.queryOne)(countQuery, params);
        const total = countResult?.total ?? 0;
        // Get paginated results
        const dataQuery = `
      SELECT * FROM AuditLogs 
      WHERE ${whereClause}
      ORDER BY CreatedAt DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `;
        const results = await (0, db_1.query)(dataQuery, {
            ...params,
            offset,
            pageSize,
        });
        return {
            data: results.map((r) => this.mapToEntity(r)),
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        };
    }
    /**
     * Get audit log by ID
     */
    async findById(id) {
        const result = await (0, db_1.queryOne)('SELECT * FROM AuditLogs WHERE Id = @id', { id });
        return result ? this.mapToEntity(result) : null;
    }
    /**
     * Get distinct entity types that have been audited
     */
    async getAuditedEntityTypes(storeId) {
        let whereClause = '1=1';
        const params = {};
        if (storeId) {
            whereClause = 'StoreId = @storeId';
            params.storeId = storeId;
        }
        const results = await (0, db_1.query)(`SELECT DISTINCT EntityType FROM AuditLogs 
       WHERE ${whereClause}
       ORDER BY EntityType`, params);
        return results.map((r) => r.EntityType);
    }
    /**
     * Get audit summary statistics for a store
     */
    async getSummary(storeId, dateFrom, dateTo) {
        let whereClause = 'StoreId = @storeId';
        const params = { storeId };
        if (dateFrom) {
            whereClause += ' AND CreatedAt >= @dateFrom';
            params.dateFrom = new Date(dateFrom);
        }
        if (dateTo) {
            whereClause += ' AND CreatedAt <= @dateTo';
            params.dateTo = new Date(dateTo);
        }
        // Get total count
        const totalResult = await (0, db_1.queryOne)(`SELECT COUNT(*) as total FROM AuditLogs WHERE ${whereClause}`, params);
        // Get action counts
        const actionResults = await (0, db_1.query)(`SELECT Action, COUNT(*) as Count FROM AuditLogs 
       WHERE ${whereClause}
       GROUP BY Action`, params);
        // Get entity type counts
        const entityTypeResults = await (0, db_1.query)(`SELECT EntityType, COUNT(*) as Count FROM AuditLogs 
       WHERE ${whereClause}
       GROUP BY EntityType`, params);
        const actionCounts = {};
        actionResults.forEach((r) => {
            actionCounts[r.Action] = r.Count;
        });
        const entityTypeCounts = {};
        entityTypeResults.forEach((r) => {
            entityTypeCounts[r.EntityType] = r.Count;
        });
        return {
            totalActions: totalResult?.total ?? 0,
            actionCounts,
            entityTypeCounts,
        };
    }
}
exports.AuditLogRepository = AuditLogRepository;
// Export singleton instance
exports.auditLogRepository = new AuditLogRepository();
//# sourceMappingURL=audit-log-repository.js.map