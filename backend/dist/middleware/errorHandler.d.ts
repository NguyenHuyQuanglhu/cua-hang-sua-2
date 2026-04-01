/**
 * Error Handling Middleware
 * Task 16.2: Implement backend error handling
 */
import { Request, Response, NextFunction } from 'express';
import { AppError, DatabaseError, DatabaseConnectionError, DatabaseTimeoutError, DatabaseConstraintError, MigrationError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError } from '../errors';
/**
 * Logger interface for error logging
 */
interface Logger {
    error: (message: string, meta?: any) => void;
    warn: (message: string, meta?: any) => void;
    info: (message: string, meta?: any) => void;
}
/**
 * Error handler middleware configuration
 */
export interface ErrorHandlerConfig {
    logger?: Logger;
    includeStackTrace?: boolean;
    logErrors?: boolean;
    sendAdminAlerts?: boolean;
}
/**
 * Main error handler middleware
 */
export declare function errorHandler(config?: ErrorHandlerConfig): (err: Error | AppError, req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Async error wrapper for route handlers
 * Catches async errors and passes them to error handler
 */
export declare function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Not found handler middleware
 */
export declare function notFoundHandler(req: Request, res: Response, next: NextFunction): void;
/**
 * Database error handler
 * Wraps database operations and converts errors to AppError
 */
export declare function handleDatabaseOperation<T>(operation: () => Promise<T>, context?: string): Promise<T>;
/**
 * Migration error handler
 * Wraps migration operations with detailed logging
 */
export declare function handleMigrationOperation<T>(operation: () => Promise<T>, migrationName: string): Promise<T>;
/**
 * Validation error handler
 * Creates consistent validation errors
 */
export declare function createValidationError(field: string, message: string, value?: any): ValidationError;
/**
 * Export all error classes for convenience
 */
export { AppError, DatabaseError, DatabaseConnectionError, DatabaseTimeoutError, DatabaseConstraintError, MigrationError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, };
//# sourceMappingURL=errorHandler.d.ts.map