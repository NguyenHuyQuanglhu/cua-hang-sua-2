import { Request, Response, NextFunction } from 'express';
/**
 * Middleware to validate UUID format in route parameters
 */
export declare function validateUUID(paramName?: string): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Middleware to validate and log request data for debugging
 */
export declare function debugRequest(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=validate-uuid.d.ts.map