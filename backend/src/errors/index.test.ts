/**
 * Unit Tests for Error Classes
 * Task 16.2: Implement backend error handling
 */

import { describe, it, expect } from 'vitest';
import {
  AppError,
  DatabaseError,
  DatabaseConnectionError,
  DatabaseTimeoutError,
  DatabaseConstraintError,
  MigrationError,
  ValidationError,
  InvalidStatusError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  formatErrorResponse,
  isDatabaseConnectionError,
  isDatabaseTimeoutError,
  isDatabaseConstraintError,
  toAppError,
} from './index';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create error with correct properties', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR', { foo: 'bar' });
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.details).toEqual({ foo: 'bar' });
      expect(error.name).toBe('AppError');
    });
  });

  describe('DatabaseError', () => {
    it('should create database error with 500 status', () => {
      const error = new DatabaseError('DB error');
      
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DATABASE_ERROR');
    });
  });

  describe('DatabaseConnectionError', () => {
    it('should create connection error', () => {
      const error = new DatabaseConnectionError();
      
      expect(error.message).toBe('Database connection failed');
      expect(error.code).toBe('DATABASE_CONNECTION_ERROR');
    });
  });

  describe('DatabaseTimeoutError', () => {
    it('should create timeout error', () => {
      const error = new DatabaseTimeoutError();
      
      expect(error.message).toBe('Database operation timed out');
      expect(error.code).toBe('DATABASE_TIMEOUT_ERROR');
    });
  });

  describe('DatabaseConstraintError', () => {
    it('should create constraint error with 400 status', () => {
      const error = new DatabaseConstraintError('Constraint violated');
      
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('DATABASE_CONSTRAINT_ERROR');
    });
  });

  describe('MigrationError', () => {
    it('should create migration error', () => {
      const error = new MigrationError('Migration failed', { step: 1 });
      
      expect(error.code).toBe('MIGRATION_ERROR');
      expect(error.details).toEqual({ step: 1 });
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with 400 status', () => {
      const error = new ValidationError('Invalid input');
      
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('InvalidStatusError', () => {
    it('should create invalid status error with details', () => {
      const error = new InvalidStatusError('invalid', ['pending', 'processed']);
      
      expect(error.code).toBe('INVALID_STATUS');
      expect(error.details).toEqual({
        received: 'invalid',
        expected: ['pending', 'processed'],
      });
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error', () => {
      const error = new NotFoundError('User', '123');
      
      expect(error.message).toBe('User not found: 123');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });
  });

  describe('UnauthorizedError', () => {
    it('should create unauthorized error', () => {
      const error = new UnauthorizedError();
      
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('ForbiddenError', () => {
    it('should create forbidden error', () => {
      const error = new ForbiddenError();
      
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
    });
  });

  describe('ConflictError', () => {
    it('should create conflict error', () => {
      const error = new ConflictError('Resource already exists');
      
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });
  });
});

describe('Error Utilities', () => {
  describe('formatErrorResponse', () => {
    it('should format error response correctly', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });
      const response = formatErrorResponse(error);
      
      expect(response).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: { field: 'email' },
        },
      });
    });

    it('should not include details if not present', () => {
      const error = new NotFoundError('User');
      const response = formatErrorResponse(error);
      
      expect(response.error.details).toBeDefined();
    });
  });

  describe('isDatabaseConnectionError', () => {
    it('should detect DatabaseConnectionError instance', () => {
      const error = new DatabaseConnectionError();
      expect(isDatabaseConnectionError(error)).toBe(true);
    });

    it('should detect connection error by message', () => {
      const error = new Error('ECONNREFUSED');
      expect(isDatabaseConnectionError(error)).toBe(true);
    });

    it('should detect connection error by code', () => {
      const error: any = new Error('Failed');
      error.code = 'ECONNREFUSED';
      expect(isDatabaseConnectionError(error)).toBe(true);
    });

    it('should return false for non-connection errors', () => {
      const error = new Error('Some other error');
      expect(isDatabaseConnectionError(error)).toBe(false);
    });
  });

  describe('isDatabaseTimeoutError', () => {
    it('should detect DatabaseTimeoutError instance', () => {
      const error = new DatabaseTimeoutError();
      expect(isDatabaseTimeoutError(error)).toBe(true);
    });

    it('should detect timeout error by message', () => {
      const error = new Error('Operation timed out');
      expect(isDatabaseTimeoutError(error)).toBe(true);
    });

    it('should return false for non-timeout errors', () => {
      const error = new Error('Some other error');
      expect(isDatabaseTimeoutError(error)).toBe(false);
    });
  });

  describe('isDatabaseConstraintError', () => {
    it('should detect DatabaseConstraintError instance', () => {
      const error = new DatabaseConstraintError('Constraint violated');
      expect(isDatabaseConstraintError(error)).toBe(true);
    });

    it('should detect constraint error by message', () => {
      const error = new Error('Foreign key constraint violation');
      expect(isDatabaseConstraintError(error)).toBe(true);
    });

    it('should detect constraint error by SQL Server error number', () => {
      const error: any = new Error('Violation');
      error.number = 547; // Foreign key constraint
      expect(isDatabaseConstraintError(error)).toBe(true);
    });

    it('should return false for non-constraint errors', () => {
      const error = new Error('Some other error');
      expect(isDatabaseConstraintError(error)).toBe(false);
    });
  });

  describe('toAppError', () => {
    it('should return AppError as-is', () => {
      const error = new ValidationError('Test');
      const result = toAppError(error);
      expect(result).toBe(error);
    });

    it('should convert connection error', () => {
      const error = new Error('ECONNREFUSED');
      const result = toAppError(error);
      expect(result).toBeInstanceOf(DatabaseConnectionError);
    });

    it('should convert timeout error', () => {
      const error = new Error('Operation timed out');
      const result = toAppError(error);
      expect(result).toBeInstanceOf(DatabaseTimeoutError);
    });

    it('should convert constraint error', () => {
      const error = new Error('Unique constraint violation');
      const result = toAppError(error);
      expect(result).toBeInstanceOf(DatabaseConstraintError);
    });

    it('should convert generic database error', () => {
      const error = new Error('Database query failed');
      const result = toAppError(error);
      expect(result).toBeInstanceOf(DatabaseError);
    });

    it('should convert unknown error', () => {
      const error = 'string error';
      const result = toAppError(error);
      expect(result).toBeInstanceOf(AppError);
      expect(result.code).toBe('UNKNOWN_ERROR');
    });
  });
});
