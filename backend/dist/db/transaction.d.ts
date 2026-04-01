/**
 * Transaction Support for SQL Server
 *
 * Provides transaction management utilities for atomic database operations.
 */
import sql from 'mssql';
export { sql };
/**
 * Execute a function within a database transaction
 * Automatically commits on success or rolls back on error
 */
export declare function withTransaction<T>(fn: (transaction: sql.Transaction) => Promise<T>): Promise<T>;
/**
 * Execute a query within a transaction
 */
export declare function transactionQuery<T = Record<string, unknown>>(transaction: sql.Transaction, queryString: string, params?: Record<string, unknown>): Promise<T[]>;
/**
 * Execute a query and return single result within a transaction
 */
export declare function transactionQueryOne<T = Record<string, unknown>>(transaction: sql.Transaction, queryString: string, params?: Record<string, unknown>): Promise<T | null>;
/**
 * Execute an insert within a transaction
 * Can accept either a query string or table name with data
 */
export declare function transactionInsert<T = Record<string, unknown>>(transaction: sql.Transaction, tableNameOrQuery: string, dataOrParams?: Record<string, unknown>): Promise<T | null>;
/**
 * Execute an update within a transaction
 * Can accept either a query string or table name with data
 */
export declare function transactionUpdate<T = Record<string, unknown>>(transaction: sql.Transaction, tableNameOrQuery: string, idOrParams: string | Record<string, unknown>, dataOrIdColumn?: Record<string, unknown> | string, idColumn?: string): Promise<T | null>;
//# sourceMappingURL=transaction.d.ts.map