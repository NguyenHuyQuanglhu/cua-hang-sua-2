import { sql } from './connection';
export type SqlValue = string | number | boolean | Date | Buffer | null | undefined;
export type QueryParams = Record<string, SqlValue | unknown>;
/**
 * Execute a parameterized query and return results
 */
export declare function query<T = Record<string, unknown>>(queryString: string, params?: QueryParams): Promise<T[]>;
/**
 * Execute a parameterized query and return a single result
 */
export declare function queryOne<T = Record<string, unknown>>(queryString: string, params?: QueryParams): Promise<T | null>;
/**
 * Execute an INSERT query and return the inserted record
 */
export declare function insert<T = Record<string, unknown>>(tableName: string, data: Record<string, SqlValue>, returnColumns?: string[]): Promise<T | null>;
/**
 * Execute an UPDATE query and return the updated record
 */
export declare function update<T = Record<string, unknown>>(tableName: string, id: string, data: Record<string, SqlValue>, idColumn?: string, returnColumns?: string[]): Promise<T | null>;
/**
 * Execute a DELETE query
 */
export declare function remove(tableName: string, id: string, idColumn?: string): Promise<boolean>;
/**
 * Execute a query with pagination support
 */
export declare function queryPaginated<T = Record<string, unknown>>(queryString: string, params?: QueryParams, page?: number, pageSize?: number): Promise<{
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}>;
export { sql };
//# sourceMappingURL=query.d.ts.map