"use strict";
/**
 * Custom Error Classes for Backend Error Handling
 * Task 16.2: Implement backend error handling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictError = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.InvalidStatusError = exports.ValidationError = exports.MigrationError = exports.DatabaseConstraintError = exports.DatabaseTimeoutError = exports.DatabaseConnectionError = exports.DatabaseError = exports.AppError = void 0;
exports.formatErrorResponse = formatErrorResponse;
exports.isDatabaseConnectionError = isDatabaseConnectionError;
exports.isDatabaseTimeoutError = isDatabaseTimeoutError;
exports.isDatabaseConstraintError = isDatabaseConstraintError;
exports.toAppError = toAppError;
/**
 * Base application error class
 */
class AppError extends Error {
    statusCode;
    code;
    details;
    constructor(message, statusCode, code, details) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
/**
 * Database error - connection lost, timeout, constraint violation
 */
class DatabaseError extends AppError {
    constructor(message, details) {
        super(message, 500, 'DATABASE_ERROR', details);
    }
}
exports.DatabaseError = DatabaseError;
/**
 * Database connection error
 */
class DatabaseConnectionError extends DatabaseError {
    constructor(message = 'Database connection failed', details) {
        super(message, details);
        Object.defineProperty(this, 'code', {
            value: 'DATABASE_CONNECTION_ERROR',
            writable: false,
            enumerable: true,
            configurable: true,
        });
    }
}
exports.DatabaseConnectionError = DatabaseConnectionError;
/**
 * Database timeout error
 */
class DatabaseTimeoutError extends DatabaseError {
    constructor(message = 'Database operation timed out', details) {
        super(message, details);
        Object.defineProperty(this, 'code', {
            value: 'DATABASE_TIMEOUT_ERROR',
            writable: false,
            enumerable: true,
            configurable: true,
        });
    }
}
exports.DatabaseTimeoutError = DatabaseTimeoutError;
/**
 * Database constraint violation error
 */
class DatabaseConstraintError extends DatabaseError {
    constructor(message, details) {
        super(message, details);
        Object.defineProperty(this, 'code', {
            value: 'DATABASE_CONSTRAINT_ERROR',
            writable: false,
            enumerable: true,
            configurable: true,
        });
        Object.defineProperty(this, 'statusCode', {
            value: 400, // Client error for constraint violations
            writable: false,
            enumerable: true,
            configurable: true,
        });
    }
}
exports.DatabaseConstraintError = DatabaseConstraintError;
/**
 * Migration error
 */
class MigrationError extends AppError {
    constructor(message, details) {
        super(message, 500, 'MIGRATION_ERROR', details);
    }
}
exports.MigrationError = MigrationError;
/**
 * Validation error - invalid status or other validation failures
 */
class ValidationError extends AppError {
    constructor(message, details) {
        super(message, 400, 'VALIDATION_ERROR', details);
    }
}
exports.ValidationError = ValidationError;
/**
 * Invalid status error
 */
class InvalidStatusError extends ValidationError {
    constructor(received, expected) {
        super('Invalid status value', {
            received,
            expected,
        });
        Object.defineProperty(this, 'code', {
            value: 'INVALID_STATUS',
            writable: false,
            enumerable: true,
            configurable: true,
        });
    }
}
exports.InvalidStatusError = InvalidStatusError;
/**
 * Not found error
 */
class NotFoundError extends AppError {
    constructor(resource, identifier) {
        super(`${resource} not found${identifier ? `: ${identifier}` : ''}`, 404, 'NOT_FOUND', { resource, identifier });
    }
}
exports.NotFoundError = NotFoundError;
/**
 * Unauthorized error
 */
class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized access') {
        super(message, 401, 'UNAUTHORIZED');
    }
}
exports.UnauthorizedError = UnauthorizedError;
/**
 * Forbidden error
 */
class ForbiddenError extends AppError {
    constructor(message = 'Access forbidden') {
        super(message, 403, 'FORBIDDEN');
    }
}
exports.ForbiddenError = ForbiddenError;
/**
 * Conflict error
 */
class ConflictError extends AppError {
    constructor(message, details) {
        super(message, 409, 'CONFLICT', details);
    }
}
exports.ConflictError = ConflictError;
/**
 * Format error for API response
 */
function formatErrorResponse(error) {
    return {
        error: {
            code: error.code,
            message: error.message,
            ...(error.details && { details: error.details }),
        },
    };
}
/**
 * Check if error is a database connection error
 */
function isDatabaseConnectionError(error) {
    if (error instanceof DatabaseConnectionError) {
        return true;
    }
    // Check for common database connection error patterns
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.code?.toLowerCase() || '';
    return (errorMessage.includes('connection') ||
        errorMessage.includes('econnrefused') ||
        errorMessage.includes('etimedout') ||
        errorCode === 'econnrefused' ||
        errorCode === 'etimedout' ||
        errorCode === 'esocket');
}
/**
 * Check if error is a database timeout error
 */
function isDatabaseTimeoutError(error) {
    if (error instanceof DatabaseTimeoutError) {
        return true;
    }
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.code?.toLowerCase() || '';
    return (errorMessage.includes('timeout') ||
        errorMessage.includes('timed out') ||
        errorCode === 'etimeout' ||
        errorCode === 'request_timeout');
}
/**
 * Check if error is a database constraint violation
 */
function isDatabaseConstraintError(error) {
    if (error instanceof DatabaseConstraintError) {
        return true;
    }
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorNumber = error?.number;
    // SQL Server constraint violation error numbers
    const constraintErrorNumbers = [
        547, // Foreign key constraint
        2601, // Unique index violation
        2627, // Primary key violation
    ];
    const isConstraintError = (errorMessage.includes('constraint') ||
        errorMessage.includes('foreign key') ||
        errorMessage.includes('unique') ||
        errorMessage.includes('duplicate') ||
        (errorNumber !== undefined && constraintErrorNumbers.includes(errorNumber)));
    return isConstraintError;
}
/**
 * Convert unknown error to AppError
 */
function toAppError(error) {
    // Already an AppError
    if (error instanceof AppError) {
        return error;
    }
    // Standard Error
    if (error instanceof Error) {
        // Check for specific database errors
        if (isDatabaseConnectionError(error)) {
            return new DatabaseConnectionError(error.message, { originalError: error });
        }
        if (isDatabaseTimeoutError(error)) {
            return new DatabaseTimeoutError(error.message, { originalError: error });
        }
        if (isDatabaseConstraintError(error)) {
            return new DatabaseConstraintError(error.message, { originalError: error });
        }
        // Generic database error
        if (error.message.toLowerCase().includes('database') ||
            error.message.toLowerCase().includes('sql')) {
            return new DatabaseError(error.message, { originalError: error });
        }
        // Generic error
        return new AppError(error.message, 500, 'INTERNAL_ERROR');
    }
    // Unknown error type
    return new AppError('An unexpected error occurred', 500, 'UNKNOWN_ERROR', { error });
}
//# sourceMappingURL=index.js.map