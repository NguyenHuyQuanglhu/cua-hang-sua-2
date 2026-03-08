/**
 * Unit tests for Status Validation Middleware
 * Feature: pos-sales-ui-improvements
 * 
 * Tests the validateAndNormalizeStatus and validateStatusQuery middleware functions
 * to ensure they correctly validate and normalize status values.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { validateAndNormalizeStatus, validateStatusQuery } from './validateStatus';

describe('validateAndNormalizeStatus middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    
    mockRequest = {
      body: {}
    };
    
    mockResponse = {
      status: statusMock,
      json: jsonMock
    };
    
    mockNext = vi.fn();
  });

  describe('with valid new status values', () => {
    it('should accept "pending" status', () => {
      mockRequest.body = { status: 'pending' };
      
      validateAndNormalizeStatus(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      expect(mockRequest.body.status).toBe('pending');
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should accept "processed" status', () => {
      mockRequest.body = { status: 'processed' };
      
      validateAndNormalizeStatus(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      expect(mockRequest.body.status).toBe('processed');
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('with valid old status values', () => {
    it('should normalize "draft" to "pending"', () => {
      mockRequest.body = { status: 'draft' };
      
      validateAndNormalizeStatus(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      expect(mockRequest.body.status).toBe('pending');
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should normalize "printed" to "pending"', () => {
      mockRequest.body = { status: 'printed' };
      
      validateAndNormalizeStatus(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      expect(mockRequest.body.status).toBe('pending');
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should normalize "completed" to "processed"', () => {
      mockRequest.body = { status: 'completed' };
      
      validateAndNormalizeStatus(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      expect(mockRequest.body.status).toBe('processed');
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should normalize "cancelled" to "processed"', () => {
      mockRequest.body = { status: 'cancelled' };
      
      validateAndNormalizeStatus(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      expect(mockRequest.body.status).toBe('processed');
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('with invalid status values', () => {
    it('should return 400 error for invalid status', () => {
      mockRequest.body = { status: 'invalid_status' };
      
      validateAndNormalizeStatus(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_STATUS',
          message: 'Giá trị trạng thái không hợp lệ',
          details: expect.objectContaining({
            received: 'invalid_status',
            validValues: ['pending', 'processed'],
            legacyValues: ['draft', 'printed', 'completed', 'cancelled']
          })
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 error for empty string status', () => {
      mockRequest.body = { status: '' };
      
      validateAndNormalizeStatus(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 error for null status', () => {
      mockRequest.body = { status: null };
      
      validateAndNormalizeStatus(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('without status field', () => {
    it('should pass through when status is not in body', () => {
      mockRequest.body = { other_field: 'value' };
      
      validateAndNormalizeStatus(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should pass through when body is empty', () => {
      mockRequest.body = {};
      
      validateAndNormalizeStatus(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should pass through when body is undefined', () => {
      mockRequest.body = undefined;
      
      validateAndNormalizeStatus(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });
});

describe('validateStatusQuery middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    
    mockRequest = {
      query: {}
    };
    
    mockResponse = {
      status: statusMock,
      json: jsonMock
    };
    
    mockNext = vi.fn();
  });

  describe('with valid status query parameters', () => {
    it('should accept "pending" status', () => {
      mockRequest.query = { status: 'pending' };
      
      validateStatusQuery(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      expect(mockRequest.query.status).toBe('pending');
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should accept "processed" status', () => {
      mockRequest.query = { status: 'processed' };
      
      validateStatusQuery(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      expect(mockRequest.query.status).toBe('processed');
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should accept "all" status without normalization', () => {
      mockRequest.query = { status: 'all' };
      
      validateStatusQuery(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      expect(mockRequest.query.status).toBe('all');
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('with old status values', () => {
    it('should normalize "draft" to "pending"', () => {
      mockRequest.query = { status: 'draft' };
      
      validateStatusQuery(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      expect(mockRequest.query.status).toBe('pending');
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should normalize "completed" to "processed"', () => {
      mockRequest.query = { status: 'completed' };
      
      validateStatusQuery(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      expect(mockRequest.query.status).toBe('processed');
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('with invalid status query parameters', () => {
    it('should return 400 error for invalid status', () => {
      mockRequest.query = { status: 'invalid_status' };
      
      validateStatusQuery(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_STATUS',
          message: 'Giá trị trạng thái không hợp lệ',
          details: expect.objectContaining({
            received: 'invalid_status',
            validValues: ['pending', 'processed', 'all'],
            legacyValues: ['draft', 'printed', 'completed', 'cancelled']
          })
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('without status query parameter', () => {
    it('should pass through when status is not in query', () => {
      mockRequest.query = { other_param: 'value' };
      
      validateStatusQuery(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should pass through when query is empty', () => {
      mockRequest.query = {};
      
      validateStatusQuery(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });
});
