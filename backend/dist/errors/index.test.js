"use strict";
/**
 * Unit Tests for Error Classes
 * Task 16.2: Implement backend error handling
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_1 = require("./index");
(0, vitest_1.describe)('Error Classes', () => {
    (0, vitest_1.describe)('AppError', () => {
        (0, vitest_1.it)('should create error with correct properties', () => {
            const error = new index_1.AppError('Test error', 400, 'TEST_ERROR', { foo: 'bar' });
            (0, vitest_1.expect)(error.message).toBe('Test error');
            (0, vitest_1.expect)(error.statusCode).toBe(400);
            (0, vitest_1.expect)(error.code).toBe('TEST_ERROR');
            (0, vitest_1.expect)(error.details).toEqual({ foo: 'bar' });
            (0, vitest_1.expect)(error.name).toBe('AppError');
        });
    });
    (0, vitest_1.describe)('DatabaseError', () => {
        (0, vitest_1.it)('should create database error with 500 status', () => {
            const error = new index_1.DatabaseError('DB error');
            (0, vitest_1.expect)(error.statusCode).toBe(500);
            (0, vitest_1.expect)(error.code).toBe('DATABASE_ERROR');
        });
    });
    (0, vitest_1.describe)('DatabaseConnectionError', () => {
        (0, vitest_1.it)('should create connection error', () => {
            const error = new index_1.DatabaseConnectionError();
            (0, vitest_1.expect)(error.message).toBe('Database connection failed');
            (0, vitest_1.expect)(error.code).toBe('DATABASE_CONNECTION_ERROR');
        });
    });
    (0, vitest_1.describe)('DatabaseTimeoutError', () => {
        (0, vitest_1.it)('should create timeout error', () => {
            const error = new index_1.DatabaseTimeoutError();
            (0, vitest_1.expect)(error.message).toBe('Database operation timed out');
            (0, vitest_1.expect)(error.code).toBe('DATABASE_TIMEOUT_ERROR');
        });
    });
    (0, vitest_1.describe)('DatabaseConstraintError', () => {
        (0, vitest_1.it)('should create constraint error with 400 status', () => {
            const error = new index_1.DatabaseConstraintError('Constraint violated');
            (0, vitest_1.expect)(error.statusCode).toBe(400);
            (0, vitest_1.expect)(error.code).toBe('DATABASE_CONSTRAINT_ERROR');
        });
    });
    (0, vitest_1.describe)('MigrationError', () => {
        (0, vitest_1.it)('should create migration error', () => {
            const error = new index_1.MigrationError('Migration failed', { step: 1 });
            (0, vitest_1.expect)(error.code).toBe('MIGRATION_ERROR');
            (0, vitest_1.expect)(error.details).toEqual({ step: 1 });
        });
    });
    (0, vitest_1.describe)('ValidationError', () => {
        (0, vitest_1.it)('should create validation error with 400 status', () => {
            const error = new index_1.ValidationError('Invalid input');
            (0, vitest_1.expect)(error.statusCode).toBe(400);
            (0, vitest_1.expect)(error.code).toBe('VALIDATION_ERROR');
        });
    });
    (0, vitest_1.describe)('InvalidStatusError', () => {
        (0, vitest_1.it)('should create invalid status error with details', () => {
            const error = new index_1.InvalidStatusError('invalid', ['pending', 'processed']);
            (0, vitest_1.expect)(error.code).toBe('INVALID_STATUS');
            (0, vitest_1.expect)(error.details).toEqual({
                received: 'invalid',
                expected: ['pending', 'processed'],
            });
        });
    });
    (0, vitest_1.describe)('NotFoundError', () => {
        (0, vitest_1.it)('should create not found error', () => {
            const error = new index_1.NotFoundError('User', '123');
            (0, vitest_1.expect)(error.message).toBe('User not found: 123');
            (0, vitest_1.expect)(error.statusCode).toBe(404);
            (0, vitest_1.expect)(error.code).toBe('NOT_FOUND');
        });
    });
    (0, vitest_1.describe)('UnauthorizedError', () => {
        (0, vitest_1.it)('should create unauthorized error', () => {
            const error = new index_1.UnauthorizedError();
            (0, vitest_1.expect)(error.statusCode).toBe(401);
            (0, vitest_1.expect)(error.code).toBe('UNAUTHORIZED');
        });
    });
    (0, vitest_1.describe)('ForbiddenError', () => {
        (0, vitest_1.it)('should create forbidden error', () => {
            const error = new index_1.ForbiddenError();
            (0, vitest_1.expect)(error.statusCode).toBe(403);
            (0, vitest_1.expect)(error.code).toBe('FORBIDDEN');
        });
    });
    (0, vitest_1.describe)('ConflictError', () => {
        (0, vitest_1.it)('should create conflict error', () => {
            const error = new index_1.ConflictError('Resource already exists');
            (0, vitest_1.expect)(error.statusCode).toBe(409);
            (0, vitest_1.expect)(error.code).toBe('CONFLICT');
        });
    });
});
(0, vitest_1.describe)('Error Utilities', () => {
    (0, vitest_1.describe)('formatErrorResponse', () => {
        (0, vitest_1.it)('should format error response correctly', () => {
            const error = new index_1.ValidationError('Invalid input', { field: 'email' });
            const response = (0, index_1.formatErrorResponse)(error);
            (0, vitest_1.expect)(response).toEqual({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid input',
                    details: { field: 'email' },
                },
            });
        });
        (0, vitest_1.it)('should not include details if not present', () => {
            const error = new index_1.NotFoundError('User');
            const response = (0, index_1.formatErrorResponse)(error);
            (0, vitest_1.expect)(response.error.details).toBeDefined();
        });
    });
    (0, vitest_1.describe)('isDatabaseConnectionError', () => {
        (0, vitest_1.it)('should detect DatabaseConnectionError instance', () => {
            const error = new index_1.DatabaseConnectionError();
            (0, vitest_1.expect)((0, index_1.isDatabaseConnectionError)(error)).toBe(true);
        });
        (0, vitest_1.it)('should detect connection error by message', () => {
            const error = new Error('ECONNREFUSED');
            (0, vitest_1.expect)((0, index_1.isDatabaseConnectionError)(error)).toBe(true);
        });
        (0, vitest_1.it)('should detect connection error by code', () => {
            const error = new Error('Failed');
            error.code = 'ECONNREFUSED';
            (0, vitest_1.expect)((0, index_1.isDatabaseConnectionError)(error)).toBe(true);
        });
        (0, vitest_1.it)('should return false for non-connection errors', () => {
            const error = new Error('Some other error');
            (0, vitest_1.expect)((0, index_1.isDatabaseConnectionError)(error)).toBe(false);
        });
    });
    (0, vitest_1.describe)('isDatabaseTimeoutError', () => {
        (0, vitest_1.it)('should detect DatabaseTimeoutError instance', () => {
            const error = new index_1.DatabaseTimeoutError();
            (0, vitest_1.expect)((0, index_1.isDatabaseTimeoutError)(error)).toBe(true);
        });
        (0, vitest_1.it)('should detect timeout error by message', () => {
            const error = new Error('Operation timed out');
            (0, vitest_1.expect)((0, index_1.isDatabaseTimeoutError)(error)).toBe(true);
        });
        (0, vitest_1.it)('should return false for non-timeout errors', () => {
            const error = new Error('Some other error');
            (0, vitest_1.expect)((0, index_1.isDatabaseTimeoutError)(error)).toBe(false);
        });
    });
    (0, vitest_1.describe)('isDatabaseConstraintError', () => {
        (0, vitest_1.it)('should detect DatabaseConstraintError instance', () => {
            const error = new index_1.DatabaseConstraintError('Constraint violated');
            (0, vitest_1.expect)((0, index_1.isDatabaseConstraintError)(error)).toBe(true);
        });
        (0, vitest_1.it)('should detect constraint error by message', () => {
            const error = new Error('Foreign key constraint violation');
            (0, vitest_1.expect)((0, index_1.isDatabaseConstraintError)(error)).toBe(true);
        });
        (0, vitest_1.it)('should detect constraint error by SQL Server error number', () => {
            const error = new Error('Violation');
            error.number = 547; // Foreign key constraint
            (0, vitest_1.expect)((0, index_1.isDatabaseConstraintError)(error)).toBe(true);
        });
        (0, vitest_1.it)('should return false for non-constraint errors', () => {
            const error = new Error('Some other error');
            (0, vitest_1.expect)((0, index_1.isDatabaseConstraintError)(error)).toBe(false);
        });
    });
    (0, vitest_1.describe)('toAppError', () => {
        (0, vitest_1.it)('should return AppError as-is', () => {
            const error = new index_1.ValidationError('Test');
            const result = (0, index_1.toAppError)(error);
            (0, vitest_1.expect)(result).toBe(error);
        });
        (0, vitest_1.it)('should convert connection error', () => {
            const error = new Error('ECONNREFUSED');
            const result = (0, index_1.toAppError)(error);
            (0, vitest_1.expect)(result).toBeInstanceOf(index_1.DatabaseConnectionError);
        });
        (0, vitest_1.it)('should convert timeout error', () => {
            const error = new Error('Operation timed out');
            const result = (0, index_1.toAppError)(error);
            (0, vitest_1.expect)(result).toBeInstanceOf(index_1.DatabaseTimeoutError);
        });
        (0, vitest_1.it)('should convert constraint error', () => {
            const error = new Error('Unique constraint violation');
            const result = (0, index_1.toAppError)(error);
            (0, vitest_1.expect)(result).toBeInstanceOf(index_1.DatabaseConstraintError);
        });
        (0, vitest_1.it)('should convert generic database error', () => {
            const error = new Error('Database query failed');
            const result = (0, index_1.toAppError)(error);
            (0, vitest_1.expect)(result).toBeInstanceOf(index_1.DatabaseError);
        });
        (0, vitest_1.it)('should convert unknown error', () => {
            const error = 'string error';
            const result = (0, index_1.toAppError)(error);
            (0, vitest_1.expect)(result).toBeInstanceOf(index_1.AppError);
            (0, vitest_1.expect)(result.code).toBe('UNKNOWN_ERROR');
        });
    });
});
//# sourceMappingURL=index.test.js.map