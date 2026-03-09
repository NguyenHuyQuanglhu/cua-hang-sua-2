"use strict";
/**
 * Tenant Router Service
 *
 * Manages database connections for multi-tenant architecture.
 * Each tenant has their own isolated database, and this service
 * handles connection pooling and routing to the correct database.
 *
 * Requirements: 7.2, 5.2
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantRouter = exports.TenantRouter = void 0;
const mssql_1 = __importDefault(require("mssql"));
const DEFAULT_CONFIG = {
    maxPoolSize: 10,
    minPoolSize: 0,
    idleTimeoutMs: 30000,
    connectionTimeoutMs: 30000,
    requestTimeoutMs: 30000,
    cacheCleanupIntervalMs: 60000, // Clean up every minute
    maxCacheAge: 300000, // 5 minutes max cache age
};
/**
 * TenantRouter class for managing multi-tenant database connections
 *
 * Features:
 * - Connection pool management per tenant
 * - Automatic connection caching for performance
 * - Idle connection cleanup
 * - Thread-safe connection retrieval
 */
class TenantRouter {
    connections = new Map();
    masterPool = null;
    config;
    cleanupInterval = null;
    tenantInfoCache = new Map();
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /**
     * Initialize the tenant router with master database connection
     */
    async initialize() {
        if (this.masterPool && this.masterPool.connected) {
            return;
        }
        const masterDbName = process.env.MASTER_DB_NAME || 'SmartInventory_Master';
        this.masterPool = await mssql_1.default.connect({
            server: process.env.DB_SERVER || 'localhost',
            database: masterDbName,
            user: process.env.DB_USER || 'sa',
            password: process.env.DB_PASSWORD || '',
            port: parseInt(process.env.DB_PORT || '1433'),
            options: {
                encrypt: false,
                trustServerCertificate: true,
            },
            pool: {
                max: this.config.maxPoolSize,
                min: this.config.minPoolSize,
                idleTimeoutMillis: this.config.idleTimeoutMs,
            },
            connectionTimeout: this.config.connectionTimeoutMs,
            requestTimeout: this.config.requestTimeoutMs,
        });
        console.log(`✅ TenantRouter: Connected to Master DB (${masterDbName})`);
        // Start cleanup interval
        this.startCleanupInterval();
    }
    /**
     * Get the master database connection pool
     */
    getMasterConnection() {
        if (!this.masterPool || !this.masterPool.connected) {
            throw new Error('TenantRouter not initialized. Call initialize() first.');
        }
        return this.masterPool;
    }
    /**
     * Get tenant information from Master DB
     */
    async getTenantInfo(tenantId) {
        // Check cache first
        const cached = this.tenantInfoCache.get(tenantId);
        if (cached && (Date.now() - cached.cachedAt.getTime()) < this.config.maxCacheAge) {
            return cached.info;
        }
        const masterPool = this.getMasterConnection();
        const result = await masterPool.request()
            .input('tenantId', mssql_1.default.UniqueIdentifier, tenantId)
            .query(`
        SELECT id, name, slug, email, status, subscription_plan, database_name, database_server
        FROM Tenants
        WHERE id = @tenantId AND status = 'active'
      `);
        if (result.recordset.length === 0) {
            return null;
        }
        const row = result.recordset[0];
        const tenantInfo = {
            id: row.id,
            name: row.name,
            slug: row.slug,
            email: row.email,
            status: row.status,
            subscriptionPlan: row.subscription_plan,
            databaseName: row.database_name,
            databaseServer: row.database_server,
        };
        // Cache the tenant info
        this.tenantInfoCache.set(tenantId, { info: tenantInfo, cachedAt: new Date() });
        return tenantInfo;
    }
    /**
     * Get tenant information by slug
     */
    async getTenantBySlug(slug) {
        const masterPool = this.getMasterConnection();
        const result = await masterPool.request()
            .input('slug', mssql_1.default.NVarChar, slug)
            .query(`
        SELECT id, name, slug, email, status, subscription_plan, database_name, database_server
        FROM Tenants
        WHERE slug = @slug AND status = 'active'
      `);
        if (result.recordset.length === 0) {
            return null;
        }
        const row = result.recordset[0];
        return {
            id: row.id,
            name: row.name,
            slug: row.slug,
            email: row.email,
            status: row.status,
            subscriptionPlan: row.subscription_plan,
            databaseName: row.database_name,
            databaseServer: row.database_server,
        };
    }
    /**
     * Get a database connection for a specific tenant
     * Creates a new connection pool if one doesn't exist, otherwise returns cached pool
     */
    async getConnection(tenantId) {
        // Check if we have a cached connection
        const existing = this.connections.get(tenantId);
        if (existing && existing.pool.connected) {
            existing.lastAccessed = new Date();
            return existing.pool;
        }
        // Get tenant info from Master DB
        const tenantInfo = await this.getTenantInfo(tenantId);
        if (!tenantInfo) {
            throw new Error(`Tenant not found or inactive: ${tenantId}`);
        }
        // Create new connection pool for tenant
        const pool = await this.createTenantPool(tenantInfo);
        // Cache the connection
        this.connections.set(tenantId, {
            tenantId,
            databaseName: tenantInfo.databaseName,
            databaseServer: tenantInfo.databaseServer,
            pool,
            lastAccessed: new Date(),
        });
        console.log(`✅ TenantRouter: Connected to tenant DB (${tenantInfo.databaseName})`);
        return pool;
    }
    /**
     * Create a connection pool for a tenant database
     */
    async createTenantPool(tenantInfo) {
        const pool = new mssql_1.default.ConnectionPool({
            server: tenantInfo.databaseServer,
            database: tenantInfo.databaseName,
            user: process.env.DB_USER || 'sa',
            password: process.env.DB_PASSWORD || '',
            port: parseInt(process.env.DB_PORT || '1433'),
            options: {
                encrypt: false,
                trustServerCertificate: true,
            },
            pool: {
                max: this.config.maxPoolSize,
                min: this.config.minPoolSize,
                idleTimeoutMillis: this.config.idleTimeoutMs,
            },
            connectionTimeout: this.config.connectionTimeoutMs,
            requestTimeout: this.config.requestTimeoutMs,
        });
        await pool.connect();
        return pool;
    }
    /**
     * Check if a connection exists for a tenant
     */
    hasConnection(tenantId) {
        const connection = this.connections.get(tenantId);
        return connection !== undefined && connection.pool.connected;
    }
    /**
     * Get all active tenant connections (for monitoring)
     */
    getActiveConnections() {
        return Array.from(this.connections.values())
            .filter(conn => conn.pool.connected)
            .map(conn => ({
            tenantId: conn.tenantId,
            databaseName: conn.databaseName,
            lastAccessed: conn.lastAccessed,
        }));
    }
    /**
     * Close a specific tenant connection
     */
    async closeConnection(tenantId) {
        const connection = this.connections.get(tenantId);
        if (connection) {
            await connection.pool.close();
            this.connections.delete(tenantId);
            this.tenantInfoCache.delete(tenantId);
            console.log(`✅ TenantRouter: Closed connection for tenant ${tenantId}`);
        }
    }
    /**
     * Invalidate tenant info cache
     */
    invalidateTenantCache(tenantId) {
        this.tenantInfoCache.delete(tenantId);
    }
    /**
     * Start the cleanup interval for idle connections
     */
    startCleanupInterval() {
        if (this.cleanupInterval) {
            return;
        }
        this.cleanupInterval = setInterval(() => {
            this.cleanupIdleConnections();
        }, this.config.cacheCleanupIntervalMs);
    }
    /**
     * Clean up idle connections that haven't been accessed recently
     */
    async cleanupIdleConnections() {
        const now = Date.now();
        const maxAge = this.config.maxCacheAge;
        for (const [tenantId, connection] of this.connections.entries()) {
            const age = now - connection.lastAccessed.getTime();
            if (age > maxAge) {
                try {
                    await connection.pool.close();
                    this.connections.delete(tenantId);
                    console.log(`🧹 TenantRouter: Cleaned up idle connection for tenant ${tenantId}`);
                }
                catch (error) {
                    console.error(`Error closing idle connection for tenant ${tenantId}:`, error);
                }
            }
        }
        // Also clean up tenant info cache
        for (const [tenantId, cached] of this.tenantInfoCache.entries()) {
            const age = now - cached.cachedAt.getTime();
            if (age > maxAge) {
                this.tenantInfoCache.delete(tenantId);
            }
        }
    }
    /**
     * Close all connections and cleanup
     */
    async close() {
        // Stop cleanup interval
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        // Close all tenant connections
        for (const [tenantId, connection] of this.connections.entries()) {
            try {
                await connection.pool.close();
                console.log(`✅ TenantRouter: Closed connection for tenant ${tenantId}`);
            }
            catch (error) {
                console.error(`Error closing connection for tenant ${tenantId}:`, error);
            }
        }
        this.connections.clear();
        this.tenantInfoCache.clear();
        // Close master connection
        if (this.masterPool) {
            await this.masterPool.close();
            this.masterPool = null;
            console.log('✅ TenantRouter: Closed Master DB connection');
        }
    }
}
exports.TenantRouter = TenantRouter;
// Export singleton instance
exports.tenantRouter = new TenantRouter();
//# sourceMappingURL=tenant-router.js.map