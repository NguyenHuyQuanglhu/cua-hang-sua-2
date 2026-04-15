/**
 * Database Error Handling Utilities
 * Task 16.2: Implement backend error handling
 */
import { DatabaseError } from '../errors';
/**
 * Wrap database query with error handling
 */
export declare function withDatabaseErrorHandling<T>(operation: () => Promise<T>, context?: string): Promise<T>;
/**
 * Handle SQL Server specific errors
 */
export declare function handleSqlServerError(error: any): DatabaseError;
/**
 * Check if error is retryable
 */
export declare function isRetryableError(error: any): boolean;
/**
 * Retry database operation with exponential backoff
 */
export declare function retryDatabaseOperation<T>(operation: () => Promise<T>, options?: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
}): Promise<T>;
/**
 * Execute database transaction with error handling
 */
export declare function withTransaction<T>(pool: any, operation: (transaction: any) => Promise<T>): Promise<T>;
/**
 * Log database query for debugging
 */
export declare function logDatabaseQuery(query: string, params?: any): void;
//# sourceMappingURL=errorHandler.d.ts.map