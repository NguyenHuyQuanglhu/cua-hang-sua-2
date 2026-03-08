/**
 * Status Validation Middleware
 * Feature: pos-sales-ui-improvements
 * 
 * This middleware validates and normalizes order status values in API requests.
 * It accepts both old status values (draft, printed, completed, cancelled) and
 * new status values (pending, processed), automatically normalizing old values
 * to new values for backward compatibility.
 * 
 * Requirements: 3.1, 3.2
 */

import { Request, Response, NextFunction } from 'express';
import { StatusMapper } from '../services/statusMapper';

/**
 * Middleware to validate and normalize status values in request body
 * 
 * This middleware:
 * 1. Checks if the request body contains a 'status' field
 * 2. If present, normalizes it using StatusMapper (accepts both old and new status values)
 * 3. Returns 400 error if the status value is invalid
 * 4. Passes control to next middleware if validation succeeds
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 * 
 * @example
 * // In route definition:
 * router.post('/api/sales', validateAndNormalizeStatus, createSale);
 * router.patch('/api/sales/:id', validateAndNormalizeStatus, updateSale);
 */
export function validateAndNormalizeStatus(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Only validate if status field is present in request body
  if (req.body && req.body.status !== undefined) {
    try {
      // Normalize the status value (accepts both old and new status values)
      req.body.status = StatusMapper.normalize(req.body.status);
      
      // Continue to next middleware
      next();
    } catch (error) {
      // Invalid status value - return 400 Bad Request
      const errorMessage = error instanceof Error ? error.message : 'Invalid status value';
      
      res.status(400).json({
        error: {
          code: 'INVALID_STATUS',
          message: 'Giá trị trạng thái không hợp lệ',
          details: {
            received: req.body.status,
            validValues: ['pending', 'processed'],
            legacyValues: ['draft', 'printed', 'completed', 'cancelled'],
            errorMessage
          }
        }
      });
      return;
    }
  } else {
    // No status field in request body, continue to next middleware
    next();
  }
}

/**
 * Middleware to validate status query parameter in GET requests
 * 
 * This middleware:
 * 1. Checks if the query string contains a 'status' parameter
 * 2. If present, normalizes it using StatusMapper
 * 3. Returns 400 error if the status value is invalid
 * 4. Passes control to next middleware if validation succeeds
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 * 
 * @example
 * // In route definition:
 * router.get('/api/sales', validateStatusQuery, getSales);
 */
export function validateStatusQuery(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Only validate if status query parameter is present
  if (req.query && req.query.status !== undefined) {
    const statusValue = req.query.status as string;
    
    // Skip validation for 'all' filter
    if (statusValue === 'all') {
      next();
      return;
    }
    
    try {
      // Normalize the status value
      req.query.status = StatusMapper.normalize(statusValue);
      
      // Continue to next middleware
      next();
    } catch (error) {
      // Invalid status value - return 400 Bad Request
      const errorMessage = error instanceof Error ? error.message : 'Invalid status value';
      
      res.status(400).json({
        error: {
          code: 'INVALID_STATUS',
          message: 'Giá trị trạng thái không hợp lệ',
          details: {
            received: statusValue,
            validValues: ['pending', 'processed', 'all'],
            legacyValues: ['draft', 'printed', 'completed', 'cancelled'],
            errorMessage
          }
        }
      });
      return;
    }
  } else {
    // No status query parameter, continue to next middleware
    next();
  }
}
