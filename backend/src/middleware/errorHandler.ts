/**
 * Error Handling Middleware
 * Task 16.2: Implement backend error handling
 */

import { Request, Response, NextFunction } from 'express';
import {
  AppError,
  DatabaseError,
  DatabaseConnectionError,
  DatabaseTimeoutError,
  DatabaseConstraintError,
  MigrationError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  formatErrorResponse,
  toAppError,
} from '../errors';

/**
 * Logger interface for error logging
 */
interface Logger {
  error: (message: string, meta?: any) => void;
  warn: (message: string, meta?: any) => void;
  info: (message: string, meta?: any) => void;
}

/**
 * Simple console logger implementation
 */
const consoleLogger: Logger = {
  error: (message: string, meta?: any) => {
    console.error(`[ERROR] ${message}`, meta || '');
  },
  warn: (message: string, meta?: any) => {
    console.warn(`[WARN] ${message}`, meta || '');
  },
  info: (message: string, meta?: any) => {
    console.log(`[INFO] ${message}`, meta || '');
  },
};

/**
 * Error handler middleware configuration
 */
export interface ErrorHandlerConfig {
  logger?: Logger;
  includeStackTrace?: boolean;
  logErrors?: boolean;
  sendAdminAlerts?: boolean;
}

/**
 * Default configuration
 */
const defaultConfig: ErrorHandlerConfig = {
  logger: consoleLogger,
  includeStackTrace: process.env.NODE_ENV === 'development',
  logErrors: true,
  sendAdminAlerts: process.env.NODE_ENV === 'production',
};

/**
 * Send admin alert for critical errors
 */
async function sendAdminAlert(error: AppError, req: Request): Promise<void> {
  // TODO: Implement admin alert system (email, Slack, etc.)
  // For now, just log
  consoleLogger.error('ADMIN ALERT: Critical error occurred', {
    error: error.message,
    code: error.code,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log error with context
 */
function logError(error: AppError, req: Request, logger: Logger): void {
  const logContext = {
    code: error.code,
    message: error.message,
    statusCode: error.statusCode,
    path: req.path,
    method: req.method,
    userId: (req as any).user?.id,
    storeId: (req as any).storeId,
    timestamp: new Date().toISOString(),
    ...(error.details && { details: error.details }),
  };

  // Log based on severity
  if (error.statusCode >= 500) {
    logger.error('Server error occurred', logContext);
  } else if (error.statusCode >= 400) {
    logger.warn('Client error occurred', logContext);
  } else {
    logger.info('Error occurred', logContext);
  }
}

/**
 * Main error handler middleware
 */
export function errorHandler(config: ErrorHandlerConfig = {}) {
  const finalConfig = { ...defaultConfig, ...config };
  const logger = finalConfig.logger!;

  return async (
    err: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Convert to AppError if needed
    const appError = toAppError(err);

    // Log error
    if (finalConfig.logErrors) {
      logError(appError, req, logger);
    }

    // Send admin alert for critical errors
    if (
      finalConfig.sendAdminAlerts &&
      (appError instanceof DatabaseConnectionError ||
        appError instanceof MigrationError ||
        appError.statusCode >= 500)
    ) {
      try {
        await sendAdminAlert(appError, req);
      } catch (alertError) {
        logger.error('Failed to send admin alert', { error: alertError });
      }
    }

    // Format response
    const response = formatErrorResponse(appError);

    // Add stack trace in development
    if (finalConfig.includeStackTrace && appError.stack) {
      (response.error as any).stack = appError.stack;
    }

    // Add request ID if available
    const requestId = (req as any).id || req.headers['x-request-id'];
    if (requestId) {
      (response.error as any).requestId = requestId;
    }

    // Send response
    res.status(appError.statusCode).json(response);
  };
}

/**
 * Async error wrapper for route handlers
 * Catches async errors and passes them to error handler
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not found handler middleware
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const error = new NotFoundError('Route', req.path);
  next(error);
}

/**
 * Database error handler
 * Wraps database operations and converts errors to AppError
 */
export async function handleDatabaseOperation<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // Convert to appropriate database error
    const appError = toAppError(error);
    
    // Add context if provided
    if (context) {
      if (!appError.details) {
        (appError as any).details = {};
      }
      appError.details.context = context;
    }
    
    throw appError;
  }
}

/**
 * Migration error handler
 * Wraps migration operations with detailed logging
 */
export async function handleMigrationOperation<T>(
  operation: () => Promise<T>,
  migrationName: string
): Promise<T> {
  try {
    consoleLogger.info(`Starting migration: ${migrationName}`);
    const result = await operation();
    consoleLogger.info(`Migration completed successfully: ${migrationName}`);
    return result;
  } catch (error) {
    const migrationError = new MigrationError(
      `Migration failed: ${migrationName}`,
      {
        migrationName,
        originalError: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }
    );
    
    consoleLogger.error(`Migration failed: ${migrationName}`, {
      error: migrationError,
    });
    
    // Send admin alert
    try {
      await sendAdminAlert(migrationError, {} as Request);
    } catch (alertError) {
      consoleLogger.error('Failed to send migration alert', { error: alertError });
    }
    
    throw migrationError;
  }
}

/**
 * Validation error handler
 * Creates consistent validation errors
 */
export function createValidationError(
  field: string,
  message: string,
  value?: any
): ValidationError {
  return new ValidationError(`Validation failed for ${field}: ${message}`, {
    field,
    value,
  });
}

/**
 * Export all error classes for convenience
 */
export {
  AppError,
  DatabaseError,
  DatabaseConnectionError,
  DatabaseTimeoutError,
  DatabaseConstraintError,
  MigrationError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
};
