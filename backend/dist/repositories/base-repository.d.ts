import { SqlValue, QueryParams } from '../db';
import { sql } from '../db/connection';
/**
 * Query options for repository methods
 */
export interface QueryOptions {
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
    where?: Record<string, SqlValue>;
}
/**
 * Pagination options
 */
export interface PaginationOptions extends QueryOptions {
    page?: number;
    pageSize?: number;
}
/**
 * Paginated result
 */
export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
/**
 * Base repository class with CRUD operations
 * Implements automatic storeId filtering and pagination support
 * Uses snake_case column names to match database schema
 */
export declare abstract class BaseRepository<T extends {
    id?: string;
    storeId?: string;
}> {
    protected tableName: string;
    protected idColumn: string;
    constructor(tableName: string, idColumn?: string);
    /**
     * Map database record to entity (override in subclass for custom mapping)
     */
    protected mapToEntity(record: Record<string, unknown>): T;
    /**
     * Map entity to database record (override in subclass for custom mapping)
     */
    protected mapToRecord(entity: Partial<T>): Record<string, SqlValue | unknown>;
    /**
     * Build WHERE clause with storeId filtering (using snake_case)
     */
    protected buildWhereClause(storeId: string, additionalConditions?: Record<string, SqlValue>): {
        clause: string;
        params: QueryParams;
    };
    /**
     * Find all records for a store with optional filtering and ordering
     */
    findAll(storeId: string, options?: QueryOptions): Promise<T[]>;
    /**
     * Find all records with pagination support
     */
    findAllPaginated(storeId: string, options?: PaginationOptions): Promise<PaginatedResult<T>>;
    /**
     * Find a single record by ID with storeId filtering
     */
    findById(id: string, storeId: string): Promise<T | null>;
    /**
     * Find records by a specific field value
     */
    findBy(field: string, value: SqlValue, storeId: string, options?: QueryOptions): Promise<T[]>;
    /**
     * Find a single record by a specific field value
     */
    findOneBy(field: string, value: SqlValue, storeId: string): Promise<T | null>;
    /**
     * Create a new record with automatic storeId assignment
     */
    create(data: Partial<T>, storeId: string): Promise<T>;
    /**
     * Update an existing record with storeId verification
     */
    update(id: string, data: Partial<T>, storeId: string): Promise<T | null>;
    /**
     * Delete a record with storeId verification
     */
    delete(id: string, storeId: string): Promise<boolean>;
    /**
     * Check if a record exists
     */
    exists(id: string, storeId: string): Promise<boolean>;
    /**
     * Count records for a store
     */
    count(storeId: string, where?: Record<string, SqlValue>): Promise<number>;
    /**
     * Search records with LIKE query
     */
    search(storeId: string, searchField: string, searchTerm: string, options?: PaginationOptions): Promise<PaginatedResult<T>>;
    /**
     * Execute operations within a transaction
     */
    withTransaction<R>(callback: (repo: TransactionRepository<T>) => Promise<R>): Promise<R>;
}
/**
 * Transaction-aware repository for use within withTransaction callback
 */
export declare class TransactionRepository<T extends {
    id?: string;
    storeId?: string;
}> {
    private tableName;
    private idColumn;
    private transaction;
    private mapToEntity;
    private mapToRecord;
    constructor(tableName: string, idColumn: string, transaction: sql.Transaction, mapToEntity: (record: Record<string, unknown>) => T, mapToRecord: (entity: Partial<T>) => Record<string, SqlValue | unknown>);
    findById(id: string, storeId: string): Promise<T | null>;
    create(data: Partial<T>, storeId: string): Promise<T>;
    update(id: string, data: Partial<T>, storeId: string): Promise<T>;
    query<R = Record<string, unknown>>(queryString: string, params?: Record<string, unknown>): Promise<R[]>;
    queryOne<R = Record<string, unknown>>(queryString: string, params?: Record<string, unknown>): Promise<R | null>;
}
//# sourceMappingURL=base-repository.d.ts.map