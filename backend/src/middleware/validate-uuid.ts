import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to validate UUID format in route parameters
 */
export function validateUUID(paramName: string = 'id') {
  return (req: Request, res: Response, next: NextFunction) => {
    const uuid = req.params[paramName];
    
    if (!uuid) {
      return res.status(400).json({ 
        error: `Missing ${paramName} parameter` 
      });
    }

    // Accept SQL Server GUID shape (8-4-4-4-12 hex) regardless of UUID version bits.
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(uuid)) {
      console.error(`❌ Invalid UUID format for ${paramName}:`, uuid);
      return res.status(400).json({ 
        error: `Invalid ${paramName} format. Expected GUID format.`,
        received: uuid,
        expected: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
      });
    }

    next();
  };
}

/**
 * Middleware to validate and log request data for debugging
 */
export function debugRequest(req: Request, res: Response, next: NextFunction) {
  console.log(`🔍 ${req.method} ${req.path}`);
  console.log('📊 Params:', req.params);
  console.log('📊 Query:', req.query);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('📊 Body:', JSON.stringify(req.body, null, 2));
  }
  next();
}