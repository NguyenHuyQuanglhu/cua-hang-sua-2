/**
 * Tenant Router Service
 *
 * Manages database connections for multi-tenant architecture.
 * Each tenant has their own isolated database, and this service
 * handles connection pooling and routing to the correct database.
 *
 * Requirements: 7.2, 5.2
 */
import sql from 'mssql';
/**
 * Tenant connection information
 */
export interface TenantConnection {
    tenantId: string;
    databaseName: string;
    databaseServer: string;
    pool: sql.ConnectionPool;
    lastAccessed: Date;
}
/**
 * Tenant info from Master DB
 */
export interface TenantInfo {
    id: string;
    name: string;
    slug: string;
    email: string;
    status: string;
    subscriptionPlan: string;
    databaseName: string;
    databaseServer: string;
}
/**
 * Configuration for tenant router
 */
export interface TenantRouterConfig {
    maxPoolSize: number;
    minPoolSize: number;
    idleTimeoutMs: number;
    connectionTimeoutMs: number;
    requestTimeoutMs: number;
    cacheCleanupIntervalMs: number;
    maxCacheAge: number;
}
/**
 * TenantRouter class for managing multi-tenant database connections
 *
 * Features:
 * - Connection pool management per tenant
 * - Automatic connection caching for performance
 * - Idle connection cleanup
 * - Thread-safe connection retrieval
 */
export declare class TenantRouter {
    private connections;
    private masterPool;
    private config;
    private cleanupInterval;
    private tenantInfoCache;
    constructor(config?: Partial<TenantRouterConfig>);
    /**
     * Initialize the tenant router with master database connection
     */
    initialize(): Promise<void>;
    /**
     * Get the master database connection pool
     */
    getMasterConnection(): sql.ConnectionPool;
    /**
     * Get tenant information from Master DB
     */
    getTenantInfo(tenantId: string): Promise<TenantInfo | null>;
    /**
     * Get tenant information by slug
     */
    getTenantBySlug(slug: string): Promise<TenantInfo | null>;
    /**
     * Get a database connection for a specific tenant
     * Creates a new connection pool if one doesn't exist, otherwise returns cached pool
     */
    getConnection(tenantId: string): Promise<sql.ConnectionPool>;
    /**
     * Create a connection pool for a tenant database
     */
    private createTenantPool;
    /**
     * Check if a connection exists for a tenant
     */
    hasConnection(tenantId: string): boolean;
    /**
     * Get all active tenant connections (for monitoring)
     */
    getActiveConnections(): {
        tenantId: string;
        databaseName: string;
        lastAccessed: Date;
    }[];
    /**
     * Close a specific tenant connection
     */
    closeConnection(tenantId: string): Promise<void>;
    /**
     * Invalidate tenant info cache
     */
    invalidateTenantCache(tenantId: string): void;
    /**
     * Start the cleanup interval for idle connections
     */
    private startCleanupInterval;
    /**
     * Clean up idle connections that haven't been accessed recently
     */
    private cleanupIdleConnections;
    /**
     * Close all connections and cleanup
     */
    close(): Promise<void>;
}
export declare const tenantRouter: TenantRouter;
//# sourceMappingURL=tenant-router.d.ts.map