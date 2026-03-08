/**
 * Custom Error Classes for Backend Error Handling
 * Task 16.2: Implement backend error handling
 */

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, statusCode: number, code: string, details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Database error - connection lost, timeout, constraint violation
 */
export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, 'DATABASE_ERROR', details);
  }
}

/**
 * Database connection error
 */
export class DatabaseConnectionError extends DatabaseError {
  constructor(message: string = 'Database connection failed', details?: any) {
    super(message, details);
    Object.defineProperty(this, 'code', {
      value: 'DATABASE_CONNECTION_ERROR',
      writable: false,
      enumerable: true,
      configurable: true,
    });
  }
}

/**
 * Database timeout error
 */
export class DatabaseTimeoutError extends DatabaseError {
  constructor(message: string = 'Database operation timed out', details?: any) {
    super(message, details);
    Object.defineProperty(this, 'code', {
      value: 'DATABASE_TIMEOUT_ERROR',
      writable: false,
      enumerable: true,
      configurable: true,
    });
  }
}

/**
 * Database constraint violation error
 */
export class DatabaseConstraintError extends DatabaseError {
  constructor(message: string, details?: any) {
    super(message, details);
    Object.defineProperty(this, 'code', {
      value: 'DATABASE_CONSTRAINT_ERROR',
      writable: false,
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(this, 'statusCode', {
      value: 400, // Client error for constraint violations
      writable: false,
      enumerable: true,
      configurable: true,
    });
  }
}

/**
 * Migration error
 */
export class MigrationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, 'MIGRATION_ERROR', details);
  }
}

/**
 * Validation error - invalid status or other validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/**
 * Invalid status error
 */
export class InvalidStatusError extends ValidationError {
  constructor(received: string, expected: string[]) {
    super('Invalid status value', {
      received,
      expected,
    });
    Object.defineProperty(this, 'code', {
      value: 'INVALID_STATUS',
      writable: false,
      enumerable: true,
      configurable: true,
    });
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    super(
      `${resource} not found${identifier ? `: ${identifier}` : ''}`,
      404,
      'NOT_FOUND',
      { resource, identifier }
    );
  }
}

/**
 * Unauthorized error
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * Forbidden error
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * Conflict error
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT', details);
  }
}

/**
 * Error response format interface
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Format error for API response
 */
export function formatErrorResponse(error: AppError): ErrorResponse {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details && { details: error.details }),
    },
  };
}

/**
 * Check if error is a database connection error
 */
export function isDatabaseConnectionError(error: any): boolean {
  if (error instanceof DatabaseConnectionError) {
    return true;
  }
  
  // Check for common database connection error patterns
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorCode = error?.code?.toLowerCase() || '';
  
  return (
    errorMessage.includes('connection') ||
    errorMessage.includes('econnrefused') ||
    errorMessage.includes('etimedout') ||
    errorCode === 'econnrefused' ||
    errorCode === 'etimedout' ||
    errorCode === 'esocket'
  );
}

/**
 * Check if error is a database timeout error
 */
export function isDatabaseTimeoutError(error: any): boolean {
  if (error instanceof DatabaseTimeoutError) {
    return true;
  }
  
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorCode = error?.code?.toLowerCase() || '';
  
  return (
    errorMessage.includes('timeout') ||
    errorMessage.includes('timed out') ||
    errorCode === 'etimeout' ||
    errorCode === 'request_timeout'
  );
}

/**
 * Check if error is a database constraint violation
 */
export function isDatabaseConstraintError(error: any): boolean {
  if (error instanceof DatabaseConstraintError) {
    return true;
  }
  
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorNumber = error?.number;
  
  // SQL Server constraint violation error numbers
  const constraintErrorNumbers = [
    547,  // Foreign key constraint
    2601, // Unique index violation
    2627, // Primary key violation
  ];
  
  const isConstraintError = (
    errorMessage.includes('constraint') ||
    errorMessage.includes('foreign key') ||
    errorMessage.includes('unique') ||
    errorMessage.includes('duplicate') ||
    (errorNumber !== undefined && constraintErrorNumbers.includes(errorNumber))
  );
  
  return isConstraintError;
}

/**
 * Convert unknown error to AppError
 */
export function toAppError(error: unknown): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }
  
  // Standard Error
  if (error instanceof Error) {
    // Check for specific database errors
    if (isDatabaseConnectionError(error)) {
      return new DatabaseConnectionError(error.message, { originalError: error });
    }
    
    if (isDatabaseTimeoutError(error)) {
      return new DatabaseTimeoutError(error.message, { originalError: error });
    }
    
    if (isDatabaseConstraintError(error)) {
      return new DatabaseConstraintError(error.message, { originalError: error });
    }
    
    // Generic database error
    if (error.message.toLowerCase().includes('database') || 
        error.message.toLowerCase().includes('sql')) {
      return new DatabaseError(error.message, { originalError: error });
    }
    
    // Generic error
    return new AppError(error.message, 500, 'INTERNAL_ERROR');
  }
  
  // Unknown error type
  return new AppError('An unexpected error occurred', 500, 'UNKNOWN_ERROR', { error });
}
