"use strict";
/**
 * Unit Tests for Error Handler Middleware
 * Task 16.2: Implement backend error handling
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const errorHandler_1 = require("./errorHandler");
// Mock response object
function createMockResponse() {
    const res = {
        status: vitest_1.vi.fn().mockReturnThis(),
        json: vitest_1.vi.fn().mockReturnThis(),
    };
    return res;
}
// Mock request object
function createMockRequest(overrides = {}) {
    return {
        path: '/test',
        method: 'GET',
        headers: {},
        ...overrides,
    };
}
(0, vitest_1.describe)('Error Handler Middleware', () => {
    (0, vitest_1.describe)('errorHandler', () => {
        (0, vitest_1.it)('should handle AppError correctly', async () => {
            const error = new errorHandler_1.ValidationError('Invalid input', { field: 'email' });
            const req = createMockRequest();
            const res = createMockResponse();
            const next = vitest_1.vi.fn();
            const handler = (0, errorHandler_1.errorHandler)({ logErrors: false });
            await handler(error, req, res, next);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid input',
                    details: { field: 'email' },
                },
            });
        });
        (0, vitest_1.it)('should convert generic Error to AppError', async () => {
            const error = new Error('Something went wrong');
            const req = createMockRequest();
            const res = createMockResponse();
            const next = vitest_1.vi.fn();
            const handler = (0, errorHandler_1.errorHandler)({ logErrors: false });
            await handler(error, req, res, next);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(500);
            (0, vitest_1.expect)(res.json).toHaveBeenCalled();
        });
        (0, vitest_1.it)('should include stack trace in development', async () => {
            const error = new errorHandler_1.ValidationError('Test error');
            const req = createMockRequest();
            const res = createMockResponse();
            const next = vitest_1.vi.fn();
            const handler = (0, errorHandler_1.errorHandler)({
                logErrors: false,
                includeStackTrace: true,
            });
            await handler(error, req, res, next);
            const jsonCall = res.json.mock.calls[0][0];
            (0, vitest_1.expect)(jsonCall.error.stack).toBeDefined();
        });
        (0, vitest_1.it)('should not include stack trace in production', async () => {
            const error = new errorHandler_1.ValidationError('Test error');
            const req = createMockRequest();
            const res = createMockResponse();
            const next = vitest_1.vi.fn();
            const handler = (0, errorHandler_1.errorHandler)({
                logErrors: false,
                includeStackTrace: false,
            });
            await handler(error, req, res, next);
            const jsonCall = res.json.mock.calls[0][0];
            (0, vitest_1.expect)(jsonCall.error.stack).toBeUndefined();
        });
        (0, vitest_1.it)('should add request ID if available', async () => {
            const error = new errorHandler_1.ValidationError('Test error');
            const req = createMockRequest({ headers: { 'x-request-id': 'req-123' } });
            const res = createMockResponse();
            const next = vitest_1.vi.fn();
            const handler = (0, errorHandler_1.errorHandler)({ logErrors: false });
            await handler(error, req, res, next);
            const jsonCall = res.json.mock.calls[0][0];
            (0, vitest_1.expect)(jsonCall.error.requestId).toBe('req-123');
        });
    });
    (0, vitest_1.describe)('asyncHandler', () => {
        (0, vitest_1.it)('should handle successful async operation', async () => {
            const handler = (0, errorHandler_1.asyncHandler)(async (req, res) => {
                res.json({ success: true });
            });
            const req = createMockRequest();
            const res = createMockResponse();
            const next = vitest_1.vi.fn();
            await handler(req, res, next);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({ success: true });
            (0, vitest_1.expect)(next).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('should catch async errors and pass to next', async () => {
            const error = new Error('Async error');
            const handler = (0, errorHandler_1.asyncHandler)(async () => {
                throw error;
            });
            const req = createMockRequest();
            const res = createMockResponse();
            const next = vitest_1.vi.fn();
            await handler(req, res, next);
            (0, vitest_1.expect)(next).toHaveBeenCalledWith(error);
        });
    });
    (0, vitest_1.describe)('notFoundHandler', () => {
        (0, vitest_1.it)('should create NotFoundError', () => {
            const req = createMockRequest({ path: '/api/unknown' });
            const res = createMockResponse();
            const next = vitest_1.vi.fn();
            (0, errorHandler_1.notFoundHandler)(req, res, next);
            (0, vitest_1.expect)(next).toHaveBeenCalled();
            const error = next.mock.calls[0][0];
            (0, vitest_1.expect)(error).toBeInstanceOf(errorHandler_1.NotFoundError);
            (0, vitest_1.expect)(error.message).toContain('/api/unknown');
        });
    });
    (0, vitest_1.describe)('handleDatabaseOperation', () => {
        (0, vitest_1.it)('should return result on success', async () => {
            const operation = vitest_1.vi.fn().mockResolvedValue({ data: 'test' });
            const result = await (0, errorHandler_1.handleDatabaseOperation)(operation);
            (0, vitest_1.expect)(result).toEqual({ data: 'test' });
        });
        (0, vitest_1.it)('should convert error to AppError', async () => {
            const operation = vitest_1.vi.fn().mockRejectedValue(new Error('DB error'));
            await (0, vitest_1.expect)((0, errorHandler_1.handleDatabaseOperation)(operation)).rejects.toThrow();
        });
        (0, vitest_1.it)('should add context to error', async () => {
            const operation = vitest_1.vi.fn().mockRejectedValue(new Error('DB error'));
            try {
                await (0, errorHandler_1.handleDatabaseOperation)(operation, 'test context');
            }
            catch (error) {
                (0, vitest_1.expect)(error.details?.context).toBe('test context');
            }
        });
    });
    (0, vitest_1.describe)('handleMigrationOperation', () => {
        (0, vitest_1.it)('should return result on success', async () => {
            const operation = vitest_1.vi.fn().mockResolvedValue({ migrated: true });
            const result = await (0, errorHandler_1.handleMigrationOperation)(operation, 'test-migration');
            (0, vitest_1.expect)(result).toEqual({ migrated: true });
        });
        (0, vitest_1.it)('should throw MigrationError on failure', async () => {
            const operation = vitest_1.vi.fn().mockRejectedValue(new Error('Migration failed'));
            await (0, vitest_1.expect)((0, errorHandler_1.handleMigrationOperation)(operation, 'test-migration')).rejects.toThrow('Migration failed: test-migration');
        });
    });
    (0, vitest_1.describe)('createValidationError', () => {
        (0, vitest_1.it)('should create validation error with field details', () => {
            const error = (0, errorHandler_1.createValidationError)('email', 'must be valid', 'invalid@');
            (0, vitest_1.expect)(error).toBeInstanceOf(errorHandler_1.ValidationError);
            (0, vitest_1.expect)(error.message).toContain('email');
            (0, vitest_1.expect)(error.details).toEqual({
                field: 'email',
                value: 'invalid@',
            });
        });
    });
});
//# sourceMappingURL=errorHandler.test.js.map