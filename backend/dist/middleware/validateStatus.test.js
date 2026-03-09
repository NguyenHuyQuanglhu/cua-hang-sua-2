"use strict";
/**
 * Unit tests for Status Validation Middleware
 * Feature: pos-sales-ui-improvements
 *
 * Tests the validateAndNormalizeStatus and validateStatusQuery middleware functions
 * to ensure they correctly validate and normalize status values.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const validateStatus_1 = require("./validateStatus");
(0, vitest_1.describe)('validateAndNormalizeStatus middleware', () => {
    let mockRequest;
    let mockResponse;
    let mockNext;
    let jsonMock;
    let statusMock;
    (0, vitest_1.beforeEach)(() => {
        jsonMock = vitest_1.vi.fn();
        statusMock = vitest_1.vi.fn().mockReturnValue({ json: jsonMock });
        mockRequest = {
            body: {}
        };
        mockResponse = {
            status: statusMock,
            json: jsonMock
        };
        mockNext = vitest_1.vi.fn();
    });
    (0, vitest_1.describe)('with valid new status values', () => {
        (0, vitest_1.it)('should accept "pending" status', () => {
            mockRequest.body = { status: 'pending' };
            (0, validateStatus_1.validateAndNormalizeStatus)(mockRequest, mockResponse, mockNext);
            (0, vitest_1.expect)(mockRequest.body.status).toBe('pending');
            (0, vitest_1.expect)(mockNext).toHaveBeenCalled();
            (0, vitest_1.expect)(statusMock).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('should accept "processed" status', () => {
            mockRequest.body = { status: 'processed' };
            (0, validateStatus_1.validateAndNormalizeStatus)(mockRequest, mockResponse, mockNext);
            (0, vitest_1.expect)(mockRequest.body.status).toBe('processed');
            (0, vitest_1.expect)(mockNext).toHaveBeenCalled();
            (0, vitest_1.expect)(statusMock).not.toHaveBeenCalled();
        });
    });
    (0, vitest_1.describe)('with valid old status values', () => {
        (0, vitest_1.it)('should normalize "draft" to "pending"', () => {
            mockRequest.body = { status: 'draft' };
            (0, validateStatus_1.validateAndNormalizeStatus)(mockRequest, mockResponse, mockNext);
            (0, vitest_1.expect)(mockRequest.body.status).toBe('pending');
            (0, vitest_1.expect)(mockNext).toHaveBeenCalled();
            (0, vitest_1.expect)(statusMock).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('should normalize "printed" to "pending"', () => {
            mockRequest.body = { status: 'printed' };
            (0, validateStatus_1.validateAndNormalizeStatus)(mockRequest, mockResponse, mockNext);
            (0, vitest_1.expect)(mockRequest.body.status).toBe('pending');
            (0, vitest_1.expect)(mockNext).toHaveBeenCalled();
            (0, vitest_1.expect)(statusMock).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('should normalize "completed" to "processed"', () => {
            mockRequest.body = { status: 'completed' };
            (0, validateStatus_1.validateAndNormalizeStatus)(mockRequest, mockResponse, mockNext);
            (0, vitest_1.expect)(mockRequest.body.status).toBe('processed');
            (0, vitest_1.expect)(mockNext).toHaveBeenCalled();
            (0, vitest_1.expect)(statusMock).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('should normalize "cancelled" to "processed"', () => {
            mockRequest.body = { status: 'cancelled' };
            (0, validateStatus_1.validateAndNormalizeStatus)(mockRequest, mockResponse, mockNext);
            (0, vitest_1.expect)(mockRequest.body.status).toBe('processed');
            (0, vitest_1.expect)(mockNext).toHaveBeenCalled();
            (0, vitest_1.expect)(statusMock).not.toHaveBeenCalled();
        });
    });
    (0, vitest_1.describe)('with invalid status values', () => {
        (0, vitest_1.it)('should return 400 error for invalid status', () => {
            mockRequest.body = { status: 'invalid_status' };
            (0, validateStatus_1.validateAndNormalizeStatus)(mockRequest, mockResponse, mockNext);
            (0, vitest_1.expect)(statusMock).toHaveBeenCalledWith(400);
            (0, vitest_1.expect)(jsonMock).toHaveBeenCalledWith({
                error: {
                    code: 'INVALID_STATUS',
                    message: 'Giá trị trạng thái không hợp lệ',
                    details: vitest_1.expect.objectContaining({
                        received: 'invalid_status',
                        validValues: ['pending', 'processed'],
                        legacyValues: ['draft', 'printed', 'completed', 'cancelled']
                    })
                }
            });
            (0, vitest_1.expect)(mockNext).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('should return 400 error for empty string status', () => {
            mockRequest.body = { status: '' };
            (0, validateStatus_1.validateAndNormalizeStatus)(mockRequest, mockResponse, mockNext);
            (0, vitest_1.expect)(statusMock).toHaveBeenCalledWith(400);
            (0, vitest_1.expect)(mockNext).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('should return 400 error for null status', () => {
            mockRequest.body = { status: null };
            (0, validateStatus_1.validateAndNormalizeStatus)(mockRequest, mockResponse, mockNext);
            (0, vitest_1.expect)(statusMock).toHaveBeenCalledWith(400);
            (0, vitest_1.expect)(mockNext).not.toHaveBeenCalled();
        });
    });
    (0, vitest_1.describe)('without status field', () => {
        (0, vitest_1.it)('should pass through when status is not in body', () => {
            mockRequest.body = { other_field: 'value' };
            (0, validateStatus_1.validateAndNormalizeStatus)(mockRequest, mockResponse, mockNext);
            (0, vitest_1.expect)(mockNext).toHaveBeenCalled();
            (0, vitest_1.expect)(statusMock).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('should pass through when body is empty', () => {
            mockRequest.body = {};
            (0, validateStatus_1.validateAndNormalizeStatus)(mockRequest, mockResponse, mockNext);
            (0, vitest_1.expect)(mockNext).toHaveBeenCalled();
            (0, vitest_1.expect)(statusMock).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('should pass through when body is undefined', () => {
            mockRequest.body = undefined;
            (0, validateStatus_1.validateAndNormalizeStatus)(mockRequest, mockResponse, mockNext);
            (0, vitest_1.expect)(mockNext).toHaveBeenCalled();
            (0, vitest_1.expect)(statusMock).not.toHaveBeenCalled();
        });
    });
});
(0, vitest_1.describe)('validateStatusQuery middleware', () => {
    let mockRequest;
    let mockResponse;
    let mockNext;
    let jsonMock;
    let statusMock;
    (0, vitest_1.beforeEach)(() => {
        jsonMock = vitest_1.vi.fn();
        statusMock = vitest_1.vi.fn().mockReturnValue({ json: jsonMock });
        mockRequest = {
            query: {}
        };
        mockResponse = {
            status: statusMock,
            json: jsonMock
        };
        mockNext = vitest_1.vi.fn();
    });
    (0, vitest_1.describe)('with valid status query parameters', () => {
        (0, vitest_1.it)('should accept "pending" status', () => {
            mockRequest.query = { status: 'pending' };
            (0, validateStatus_1.validateStatusQuery)(mockRequest, mockResponse, mockNext);
            (0, vitest_1.expect)(mockRequest.query.status).toBe('pending');
            (0, vitest_1.expect)(mockNext).toHaveBeenCalled();
            (0, vitest_1.expect)(statusMock).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('should accept "processed" status', () => {
            mockRequest.query = { status: 'processed' };
            (0, validateStatus_1.validateStatusQuery)(mockRequest, mockResponse, mockNext);
            (0, vitest_1.expect)(mockRequest.query.status).toBe('processed');
            (0, vitest_1.expect)(mockNext).toHaveBeenCalled();
            (0, vitest_1.expect)(statusMock).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('should accept "all" status without normalization', () => {
            mockRequest.query = { status: 'all' };
            (0, validateStatus_1.validateStatusQuery)(mockRequest, mockResponse, mockNext);
            (0, vitest_1.expect)(mockRequest.query.status).toBe('all');
            (0, vitest_1.expect)(mockNext).toHaveBeenCalled();
            (0, vitest_1.expect)(statusMock).not.toHaveBeenCalled();
        });
    });
    (0, vitest_1.describe)('with old status values', () => {
        (0, vitest_1.it)('should normalize "draft" to "pending"', () => {
            mockRequest.query = { status: 'draft' };
            (0, validateStatus_1.validateStatusQuery)(mockRequest, mockResponse, mockNext);
            (0, vitest_1.expect)(mockRequest.query.status).toBe('pending');
            (0, vitest_1.expect)(mockNext).toHaveBeenCalled();
            (0, vitest_1.expect)(statusMock).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('should normalize "completed" to "processed"', () => {
            mockRequest.query = { status: 'completed' };
            (0, validateStatus_1.validateStatusQuery)(mockRequest, mockResponse, mockNext);
            (0, vitest_1.expect)(mockRequest.query.status).toBe('processed');
            (0, vitest_1.expect)(mockNext).toHaveBeenCalled();
            (0, vitest_1.expect)(statusMock).not.toHaveBeenCalled();
        });
    });
    (0, vitest_1.describe)('with invalid status query parameters', () => {
        (0, vitest_1.it)('should return 400 error for invalid status', () => {
            mockRequest.query = { status: 'invalid_status' };
            (0, validateStatus_1.validateStatusQuery)(mockRequest, mockResponse, mockNext);
            (0, vitest_1.expect)(statusMock).toHaveBeenCalledWith(400);
            (0, vitest_1.expect)(jsonMock).toHaveBeenCalledWith({
                error: {
                    code: 'INVALID_STATUS',
                    message: 'Giá trị trạng thái không hợp lệ',
                    details: vitest_1.expect.objectContaining({
                        received: 'invalid_status',
                        validValues: ['pending', 'processed', 'all'],
                        legacyValues: ['draft', 'printed', 'completed', 'cancelled']
                    })
                }
            });
            (0, vitest_1.expect)(mockNext).not.toHaveBeenCalled();
        });
    });
    (0, vitest_1.describe)('without status query parameter', () => {
        (0, vitest_1.it)('should pass through when status is not in query', () => {
            mockRequest.query = { other_param: 'value' };
            (0, validateStatus_1.validateStatusQuery)(mockRequest, mockResponse, mockNext);
            (0, vitest_1.expect)(mockNext).toHaveBeenCalled();
            (0, vitest_1.expect)(statusMock).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('should pass through when query is empty', () => {
            mockRequest.query = {};
            (0, validateStatus_1.validateStatusQuery)(mockRequest, mockResponse, mockNext);
            (0, vitest_1.expect)(mockNext).toHaveBeenCalled();
            (0, vitest_1.expect)(statusMock).not.toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=validateStatus.test.js.map