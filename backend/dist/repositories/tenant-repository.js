"use strict";
/**
 * Tenant Repository
 *
 * Repository for managing Tenant records in the Master Database.
 * Handles CRUD operations for tenants.
 *
 * Requirements: 1.1, 5.1
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantRepository = exports.TenantRepository = void 0;
const mssql_1 = __importDefault(require("mssql"));
const tenant_router_1 = require("../db/tenant-router");
/**
 * Tenant Repository class for Master Database operations
 */
class TenantRepository {
    /**
     * Get the master database connection
     */
    getPool() {
        return tenant_router_1.tenantRouter.getMasterConnection();
    }
    /**
     * Map database record to Tenant entity
     */
    mapToEntity(record) {
        return {
            id: record.id,
            name: record.name,
            slug: record.slug,
            email: record.email,
            phone: record.phone,
            status: record.status,
            subscriptionPlan: record.subscription_plan,
            databaseName: record.database_name,
            databaseServer: record.database_server,
            createdAt: record.created_at,
            updatedAt: record.updated_at,
        };
    }
    /**
     * Find all tenants
     */
    async findAll(includeInactive = false) {
        const pool = this.getPool();
        let query = `SELECT * FROM Tenants`;
        if (!includeInactive) {
            query += ` WHERE status = 'active'`;
        }
        query += ` ORDER BY name`;
        const result = await pool.request().query(query);
        return result.recordset.map(row => this.mapToEntity(row));
    }
    /**
     * Find tenant by ID
     */
    async findById(id) {
        const pool = this.getPool();
        const result = await pool.request()
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .query(`SELECT * FROM Tenants WHERE id = @id`);
        if (result.recordset.length === 0) {
            return null;
        }
        return this.mapToEntity(result.recordset[0]);
    }
    /**
     * Find tenant by slug
     */
    async findBySlug(slug) {
        const pool = this.getPool();
        const result = await pool.request()
            .input('slug', mssql_1.default.NVarChar, slug)
            .query(`SELECT * FROM Tenants WHERE slug = @slug`);
        if (result.recordset.length === 0) {
            return null;
        }
        return this.mapToEntity(result.recordset[0]);
    }
    /**
     * Find tenant by email
     */
    async findByEmail(email) {
        const pool = this.getPool();
        const result = await pool.request()
            .input('email', mssql_1.default.NVarChar, email)
            .query(`SELECT * FROM Tenants WHERE email = @email`);
        if (result.recordset.length === 0) {
            return null;
        }
        return this.mapToEntity(result.recordset[0]);
    }
    /**
     * Check if slug exists
     */
    async slugExists(slug, excludeId) {
        const pool = this.getPool();
        const request = pool.request().input('slug', mssql_1.default.NVarChar, slug);
        let query = `SELECT 1 FROM Tenants WHERE slug = @slug`;
        if (excludeId) {
            query += ` AND id != @excludeId`;
            request.input('excludeId', mssql_1.default.UniqueIdentifier, excludeId);
        }
        const result = await request.query(query);
        return result.recordset.length > 0;
    }
    /**
     * Check if email exists
     */
    async emailExists(email, excludeId) {
        const pool = this.getPool();
        const request = pool.request().input('email', mssql_1.default.NVarChar, email);
        let query = `SELECT 1 FROM Tenants WHERE email = @email`;
        if (excludeId) {
            query += ` AND id != @excludeId`;
            request.input('excludeId', mssql_1.default.UniqueIdentifier, excludeId);
        }
        const result = await request.query(query);
        return result.recordset.length > 0;
    }
    /**
     * Check if database name exists
     */
    async databaseNameExists(databaseName, excludeId) {
        const pool = this.getPool();
        const request = pool.request().input('databaseName', mssql_1.default.NVarChar, databaseName);
        let query = `SELECT 1 FROM Tenants WHERE database_name = @databaseName`;
        if (excludeId) {
            query += ` AND id != @excludeId`;
            request.input('excludeId', mssql_1.default.UniqueIdentifier, excludeId);
        }
        const result = await request.query(query);
        return result.recordset.length > 0;
    }
    /**
     * Create a new tenant
     */
    async create(input) {
        const pool = this.getPool();
        // Validate uniqueness
        if (await this.slugExists(input.slug)) {
            throw new Error('Slug đã được sử dụng');
        }
        if (await this.emailExists(input.email)) {
            throw new Error('Email đã được sử dụng');
        }
        if (await this.databaseNameExists(input.databaseName)) {
            throw new Error('Tên database đã được sử dụng');
        }
        const id = crypto.randomUUID();
        await pool.request()
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .input('name', mssql_1.default.NVarChar, input.name)
            .input('slug', mssql_1.default.NVarChar, input.slug)
            .input('email', mssql_1.default.NVarChar, input.email)
            .input('phone', mssql_1.default.NVarChar, input.phone || null)
            .input('subscriptionPlan', mssql_1.default.NVarChar, input.subscriptionPlan || 'basic')
            .input('databaseName', mssql_1.default.NVarChar, input.databaseName)
            .input('databaseServer', mssql_1.default.NVarChar, input.databaseServer)
            .query(`
        INSERT INTO Tenants (id, name, slug, email, phone, subscription_plan, database_name, database_server, status, created_at, updated_at)
        VALUES (@id, @name, @slug, @email, @phone, @subscriptionPlan, @databaseName, @databaseServer, 'active', GETDATE(), GETDATE())
      `);
        const created = await this.findById(id);
        if (!created) {
            throw new Error('Không thể tạo tenant');
        }
        return created;
    }
    /**
     * Update a tenant
     */
    async update(id, input) {
        const pool = this.getPool();
        const existing = await this.findById(id);
        if (!existing) {
            throw new Error('Không tìm thấy tenant');
        }
        // Validate uniqueness if changing slug or email
        if (input.slug && input.slug !== existing.slug) {
            if (await this.slugExists(input.slug, id)) {
                throw new Error('Slug đã được sử dụng');
            }
        }
        if (input.email && input.email !== existing.email) {
            if (await this.emailExists(input.email, id)) {
                throw new Error('Email đã được sử dụng');
            }
        }
        await pool.request()
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .input('name', mssql_1.default.NVarChar, input.name ?? existing.name)
            .input('slug', mssql_1.default.NVarChar, input.slug ?? existing.slug)
            .input('email', mssql_1.default.NVarChar, input.email ?? existing.email)
            .input('phone', mssql_1.default.NVarChar, input.phone ?? existing.phone ?? null)
            .input('status', mssql_1.default.NVarChar, input.status ?? existing.status)
            .input('subscriptionPlan', mssql_1.default.NVarChar, input.subscriptionPlan ?? existing.subscriptionPlan)
            .query(`
        UPDATE Tenants SET
          name = @name,
          slug = @slug,
          email = @email,
          phone = @phone,
          status = @status,
          subscription_plan = @subscriptionPlan,
          updated_at = GETDATE()
        WHERE id = @id
      `);
        // Invalidate cache in tenant router
        tenant_router_1.tenantRouter.invalidateTenantCache(id);
        const updated = await this.findById(id);
        if (!updated) {
            throw new Error('Không thể cập nhật tenant');
        }
        return updated;
    }
    /**
     * Suspend a tenant
     */
    async suspend(id) {
        return this.update(id, { status: 'suspended' });
    }
    /**
     * Activate a tenant
     */
    async activate(id) {
        return this.update(id, { status: 'active' });
    }
    /**
     * Soft delete a tenant (mark as deleted)
     */
    async softDelete(id) {
        return this.update(id, { status: 'deleted' });
    }
    /**
     * Count total tenants
     */
    async count(includeInactive = false) {
        const pool = this.getPool();
        let query = `SELECT COUNT(*) as total FROM Tenants`;
        if (!includeInactive) {
            query += ` WHERE status = 'active'`;
        }
        const result = await pool.request().query(query);
        return result.recordset[0].total;
    }
    /**
     * Count tenants by status
     */
    async countByStatus() {
        const pool = this.getPool();
        const result = await pool.request().query(`
      SELECT status, COUNT(*) as count
      FROM Tenants
      GROUP BY status
    `);
        const counts = { active: 0, suspended: 0, deleted: 0 };
        for (const row of result.recordset) {
            counts[row.status] = row.count;
        }
        return counts;
    }
}
exports.TenantRepository = TenantRepository;
// Export singleton instance
exports.tenantRepository = new TenantRepository();
//# sourceMappingURL=tenant-repository.js.map