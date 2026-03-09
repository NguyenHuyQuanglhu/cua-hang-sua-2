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
export declare function validateAndNormalizeStatus(req: Request, res: Response, next: NextFunction): void;
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
export declare function validateStatusQuery(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=validateStatus.d.ts.map