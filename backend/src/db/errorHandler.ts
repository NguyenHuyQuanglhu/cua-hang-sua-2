/**
 * Database Error Handling Utilities
 * Task 16.2: Implement backend error handling
 */

import {
  DatabaseError,
  DatabaseConnectionError,
  DatabaseTimeoutError,
  DatabaseConstraintError,
  toAppError,
} from '../errors';

/**
 * Wrap database query with error handling
 */
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    // Convert to appropriate error type
    const appError = toAppError(error);
    
    // Add context
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
 * Handle SQL Server specific errors
 */
export function handleSqlServerError(error: any): DatabaseError {
  const errorNumber = error?.number;
  const errorMessage = error?.message || '';
  
  // Connection errors
  if (
    errorNumber === -1 || // Connection failed
    errorNumber === -2 || // Timeout
    errorMessage.includes('ECONNREFUSED') ||
    errorMessage.includes('ETIMEDOUT')
  ) {
    return new DatabaseConnectionError(errorMessage, {
      errorNumber,
      originalError: error,
    });
  }
  
  // Timeout errors
  if (
    errorNumber === -3 || // Request timeout
    errorMessage.includes('timeout') ||
    errorMessage.includes('timed out')
  ) {
    return new DatabaseTimeoutError(errorMessage, {
      errorNumber,
      originalError: error,
    });
  }
  
  // Constraint violations
  if (
    errorNumber === 547 || // Foreign key constraint
    errorNumber === 2601 || // Unique index violation
    errorNumber === 2627 // Primary key violation
  ) {
    return new DatabaseConstraintError(errorMessage, {
      errorNumber,
      constraint: extractConstraintName(errorMessage),
      originalError: error,
    });
  }
  
  // Generic database error
  return new DatabaseError(errorMessage, {
    errorNumber,
    originalError: error,
  });
}

/**
 * Extract constraint name from error message
 */
function extractConstraintName(message: string): string | undefined {
  // Try to extract constraint name from SQL Server error message
  const match = message.match(/constraint ["']([^"']+)["']/i);
  return match ? match[1] : undefined;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  if (error instanceof DatabaseConnectionError || error instanceof DatabaseTimeoutError) {
    return true;
  }
  
  const errorNumber = error?.number;
  const errorMessage = error?.message?.toLowerCase() || '';
  
  // Retryable error numbers
  const retryableErrors = [
    -1,   // Connection failed
    -2,   // Timeout
    -3,   // Request timeout
    1205, // Deadlock victim
  ];
  
  return (
    retryableErrors.includes(errorNumber) ||
    errorMessage.includes('deadlock') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('connection')
  );
}

/**
 * Retry database operation with exponential backoff
 */
export async function retryDatabaseOperation<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 100,
    maxDelay = 5000,
    backoffMultiplier = 2,
  } = options;
  
  let lastError: any;
  let delay = initialDelay;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry if not retryable or last attempt
      if (!isRetryableError(error) || attempt === maxRetries) {
        throw handleSqlServerError(error);
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Increase delay for next attempt
      delay = Math.min(delay * backoffMultiplier, maxDelay);
      
      console.log(`Retrying database operation (attempt ${attempt + 1}/${maxRetries})...`);
    }
  }
  
  // Should not reach here, but throw last error just in case
  throw handleSqlServerError(lastError);
}

/**
 * Execute database transaction with error handling
 */
export async function withTransaction<T>(
  pool: any,
  operation: (transaction: any) => Promise<T>
): Promise<T> {
  const transaction = pool.transaction();
  
  try {
    await transaction.begin();
    const result = await operation(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      console.error('Failed to rollback transaction:', rollbackError);
    }
    throw handleSqlServerError(error);
  }
}

/**
 * Log database query for debugging
 */
export function logDatabaseQuery(query: string, params?: any): void {
  if (process.env.NODE_ENV === 'development' || process.env.LOG_SQL === 'true') {
    console.log('[SQL Query]', {
      query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
      params: params ? JSON.stringify(params).substring(0, 100) : undefined,
      timestamp: new Date().toISOString(),
    });
  }
}
