/**
 * Custom Error Classes for Backend Error Handling
 * Task 16.2: Implement backend error handling
 */
/**
 * Base application error class
 */
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly details?: any;
    constructor(message: string, statusCode: number, code: string, details?: any);
}
/**
 * Database error - connection lost, timeout, constraint violation
 */
export declare class DatabaseError extends AppError {
    constructor(message: string, details?: any);
}
/**
 * Database connection error
 */
export declare class DatabaseConnectionError extends DatabaseError {
    constructor(message?: string, details?: any);
}
/**
 * Database timeout error
 */
export declare class DatabaseTimeoutError extends DatabaseError {
    constructor(message?: string, details?: any);
}
/**
 * Database constraint violation error
 */
export declare class DatabaseConstraintError extends DatabaseError {
    constructor(message: string, details?: any);
}
/**
 * Migration error
 */
export declare class MigrationError extends AppError {
    constructor(message: string, details?: any);
}
/**
 * Validation error - invalid status or other validation failures
 */
export declare class ValidationError extends AppError {
    constructor(message: string, details?: any);
}
/**
 * Invalid status error
 */
export declare class InvalidStatusError extends ValidationError {
    constructor(received: string, expected: string[]);
}
/**
 * Not found error
 */
export declare class NotFoundError extends AppError {
    constructor(resource: string, identifier?: string);
}
/**
 * Unauthorized error
 */
export declare class UnauthorizedError extends AppError {
    constructor(message?: string);
}
/**
 * Forbidden error
 */
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
/**
 * Conflict error
 */
export declare class ConflictError extends AppError {
    constructor(message: string, details?: any);
}
/**
 * Error response format interface
 */
export interface ErrorResponse {
    error: {
        code: string;
        message: string;
        details?: any;
    };
}
/**
 * Format error for API response
 */
export declare function formatErrorResponse(error: AppError): ErrorResponse;
/**
 * Check if error is a database connection error
 */
export declare function isDatabaseConnectionError(error: any): boolean;
/**
 * Check if error is a database timeout error
 */
export declare function isDatabaseTimeoutError(error: any): boolean;
/**
 * Check if error is a database constraint violation
 */
export declare function isDatabaseConstraintError(error: any): boolean;
/**
 * Convert unknown error to AppError
 */
export declare function toAppError(error: unknown): AppError;
//# sourceMappingURL=index.d.ts.map