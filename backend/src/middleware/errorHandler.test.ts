/**
 * Unit Tests for Error Handler Middleware
 * Task 16.2: Implement backend error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  handleDatabaseOperation,
  handleMigrationOperation,
  createValidationError,
  ValidationError,
  DatabaseError,
  NotFoundError,
} from './errorHandler';

// Mock response object
function createMockResponse(): Partial<Response> {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res;
}

// Mock request object
function createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    path: '/test',
    method: 'GET',
    headers: {},
    ...overrides,
  };
}

describe('Error Handler Middleware', () => {
  describe('errorHandler', () => {
    it('should handle AppError correctly', async () => {
      const error = new ValidationError('Invalid input', { field: 'email' });
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      const handler = errorHandler({ logErrors: false });
      await handler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: { field: 'email' },
        },
      });
    });

    it('should convert generic Error to AppError', async () => {
      const error = new Error('Something went wrong');
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      const handler = errorHandler({ logErrors: false });
      await handler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
    });

    it('should include stack trace in development', async () => {
      const error = new ValidationError('Test error');
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      const handler = errorHandler({ 
        logErrors: false,
        includeStackTrace: true,
      });
      await handler(error, req as Request, res as Response, next);

      const jsonCall = (res.json as any).mock.calls[0][0];
      expect(jsonCall.error.stack).toBeDefined();
    });

    it('should not include stack trace in production', async () => {
      const error = new ValidationError('Test error');
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      const handler = errorHandler({ 
        logErrors: false,
        includeStackTrace: false,
      });
      await handler(error, req as Request, res as Response, next);

      const jsonCall = (res.json as any).mock.calls[0][0];
      expect(jsonCall.error.stack).toBeUndefined();
    });

    it('should add request ID if available', async () => {
      const error = new ValidationError('Test error');
      const req = createMockRequest({ headers: { 'x-request-id': 'req-123' } });
      const res = createMockResponse();
      const next = vi.fn();

      const handler = errorHandler({ logErrors: false });
      await handler(error, req as Request, res as Response, next);

      const jsonCall = (res.json as any).mock.calls[0][0];
      expect(jsonCall.error.requestId).toBe('req-123');
    });
  });

  describe('asyncHandler', () => {
    it('should handle successful async operation', async () => {
      const handler = asyncHandler(async (req, res) => {
        res.json({ success: true });
      });

      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      await handler(req as Request, res as Response, next);

      expect(res.json).toHaveBeenCalledWith({ success: true });
      expect(next).not.toHaveBeenCalled();
    });

    it('should catch async errors and pass to next', async () => {
      const error = new Error('Async error');
      const handler = asyncHandler(async () => {
        throw error;
      });

      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      await handler(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('notFoundHandler', () => {
    it('should create NotFoundError', () => {
      const req = createMockRequest({ path: '/api/unknown' });
      const res = createMockResponse();
      const next = vi.fn();

      notFoundHandler(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toContain('/api/unknown');
    });
  });

  describe('handleDatabaseOperation', () => {
    it('should return result on success', async () => {
      const operation = vi.fn().mockResolvedValue({ data: 'test' });
      
      const result = await handleDatabaseOperation(operation);
      
      expect(result).toEqual({ data: 'test' });
    });

    it('should convert error to AppError', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('DB error'));
      
      await expect(handleDatabaseOperation(operation)).rejects.toThrow();
    });

    it('should add context to error', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('DB error'));
      
      try {
        await handleDatabaseOperation(operation, 'test context');
      } catch (error: any) {
        expect(error.details?.context).toBe('test context');
      }
    });
  });

  describe('handleMigrationOperation', () => {
    it('should return result on success', async () => {
      const operation = vi.fn().mockResolvedValue({ migrated: true });
      
      const result = await handleMigrationOperation(operation, 'test-migration');
      
      expect(result).toEqual({ migrated: true });
    });

    it('should throw MigrationError on failure', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Migration failed'));
      
      await expect(
        handleMigrationOperation(operation, 'test-migration')
      ).rejects.toThrow('Migration failed: test-migration');
    });
  });

  describe('createValidationError', () => {
    it('should create validation error with field details', () => {
      const error = createValidationError('email', 'must be valid', 'invalid@');
      
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toContain('email');
      expect(error.details).toEqual({
        field: 'email',
        value: 'invalid@',
      });
    });
  });
});
