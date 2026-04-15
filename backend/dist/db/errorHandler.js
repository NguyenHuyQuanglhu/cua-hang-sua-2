"use strict";
/**
 * Database Error Handling Utilities
 * Task 16.2: Implement backend error handling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.withDatabaseErrorHandling = withDatabaseErrorHandling;
exports.handleSqlServerError = handleSqlServerError;
exports.isRetryableError = isRetryableError;
exports.retryDatabaseOperation = retryDatabaseOperation;
exports.withTransaction = withTransaction;
exports.logDatabaseQuery = logDatabaseQuery;
const errors_1 = require("../errors");
/**
 * Wrap database query with error handling
 */
async function withDatabaseErrorHandling(operation, context) {
    try {
        return await operation();
    }
    catch (error) {
        // Convert to appropriate error type
        const appError = (0, errors_1.toAppError)(error);
        // Add context
        if (context) {
            if (!appError.details) {
                appError.details = {};
            }
            appError.details.context = context;
        }
        throw appError;
    }
}
/**
 * Handle SQL Server specific errors
 */
function handleSqlServerError(error) {
    const errorNumber = error?.number;
    const errorMessage = error?.message || '';
    // Connection errors
    if (errorNumber === -1 || // Connection failed
        errorNumber === -2 || // Timeout
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ETIMEDOUT')) {
        return new errors_1.DatabaseConnectionError(errorMessage, {
            errorNumber,
            originalError: error,
        });
    }
    // Timeout errors
    if (errorNumber === -3 || // Request timeout
        errorMessage.includes('timeout') ||
        errorMessage.includes('timed out')) {
        return new errors_1.DatabaseTimeoutError(errorMessage, {
            errorNumber,
            originalError: error,
        });
    }
    // Constraint violations
    if (errorNumber === 547 || // Foreign key constraint
        errorNumber === 2601 || // Unique index violation
        errorNumber === 2627 // Primary key violation
    ) {
        return new errors_1.DatabaseConstraintError(errorMessage, {
            errorNumber,
            constraint: extractConstraintName(errorMessage),
            originalError: error,
        });
    }
    // Generic database error
    return new errors_1.DatabaseError(errorMessage, {
        errorNumber,
        originalError: error,
    });
}
/**
 * Extract constraint name from error message
 */
function extractConstraintName(message) {
    // Try to extract constraint name from SQL Server error message
    const match = message.match(/constraint ["']([^"']+)["']/i);
    return match ? match[1] : undefined;
}
/**
 * Check if error is retryable
 */
function isRetryableError(error) {
    if (error instanceof errors_1.DatabaseConnectionError || error instanceof errors_1.DatabaseTimeoutError) {
        return true;
    }
    const errorNumber = error?.number;
    const errorMessage = error?.message?.toLowerCase() || '';
    // Retryable error numbers
    const retryableErrors = [
        -1, // Connection failed
        -2, // Timeout
        -3, // Request timeout
        1205, // Deadlock victim
    ];
    return (retryableErrors.includes(errorNumber) ||
        errorMessage.includes('deadlock') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('connection'));
}
/**
 * Retry database operation with exponential backoff
 */
async function retryDatabaseOperation(operation, options = {}) {
    const { maxRetries = 3, initialDelay = 100, maxDelay = 5000, backoffMultiplier = 2, } = options;
    let lastError;
    let delay = initialDelay;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
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
async function withTransaction(pool, operation) {
    const transaction = pool.transaction();
    try {
        await transaction.begin();
        const result = await operation(transaction);
        await transaction.commit();
        return result;
    }
    catch (error) {
        try {
            await transaction.rollback();
        }
        catch (rollbackError) {
            console.error('Failed to rollback transaction:', rollbackError);
        }
        throw handleSqlServerError(error);
    }
}
/**
 * Log database query for debugging
 */
function logDatabaseQuery(query, params) {
    if (process.env.NODE_ENV === 'development' || process.env.LOG_SQL === 'true') {
        console.log('[SQL Query]', {
            query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
            params: params ? JSON.stringify(params).substring(0, 100) : undefined,
            timestamp: new Date().toISOString(),
        });
    }
}
//# sourceMappingURL=errorHandler.js.map