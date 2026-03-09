"use strict";
/**
 * Error Handling Middleware
 * Task 16.2: Implement backend error handling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictError = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.ValidationError = exports.MigrationError = exports.DatabaseConstraintError = exports.DatabaseTimeoutError = exports.DatabaseConnectionError = exports.DatabaseError = exports.AppError = void 0;
exports.errorHandler = errorHandler;
exports.asyncHandler = asyncHandler;
exports.notFoundHandler = notFoundHandler;
exports.handleDatabaseOperation = handleDatabaseOperation;
exports.handleMigrationOperation = handleMigrationOperation;
exports.createValidationError = createValidationError;
const errors_1 = require("../errors");
Object.defineProperty(exports, "AppError", { enumerable: true, get: function () { return errors_1.AppError; } });
Object.defineProperty(exports, "DatabaseError", { enumerable: true, get: function () { return errors_1.DatabaseError; } });
Object.defineProperty(exports, "DatabaseConnectionError", { enumerable: true, get: function () { return errors_1.DatabaseConnectionError; } });
Object.defineProperty(exports, "DatabaseTimeoutError", { enumerable: true, get: function () { return errors_1.DatabaseTimeoutError; } });
Object.defineProperty(exports, "DatabaseConstraintError", { enumerable: true, get: function () { return errors_1.DatabaseConstraintError; } });
Object.defineProperty(exports, "MigrationError", { enumerable: true, get: function () { return errors_1.MigrationError; } });
Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function () { return errors_1.ValidationError; } });
Object.defineProperty(exports, "NotFoundError", { enumerable: true, get: function () { return errors_1.NotFoundError; } });
Object.defineProperty(exports, "UnauthorizedError", { enumerable: true, get: function () { return errors_1.UnauthorizedError; } });
Object.defineProperty(exports, "ForbiddenError", { enumerable: true, get: function () { return errors_1.ForbiddenError; } });
Object.defineProperty(exports, "ConflictError", { enumerable: true, get: function () { return errors_1.ConflictError; } });
/**
 * Simple console logger implementation
 */
const consoleLogger = {
    error: (message, meta) => {
        console.error(`[ERROR] ${message}`, meta || '');
    },
    warn: (message, meta) => {
        console.warn(`[WARN] ${message}`, meta || '');
    },
    info: (message, meta) => {
        console.log(`[INFO] ${message}`, meta || '');
    },
};
/**
 * Default configuration
 */
const defaultConfig = {
    logger: consoleLogger,
    includeStackTrace: process.env.NODE_ENV === 'development',
    logErrors: true,
    sendAdminAlerts: process.env.NODE_ENV === 'production',
};
/**
 * Send admin alert for critical errors
 */
async function sendAdminAlert(error, req) {
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
function logError(error, req, logger) {
    const logContext = {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        path: req.path,
        method: req.method,
        userId: req.user?.id,
        storeId: req.storeId,
        timestamp: new Date().toISOString(),
        ...(error.details && { details: error.details }),
    };
    // Log based on severity
    if (error.statusCode >= 500) {
        logger.error('Server error occurred', logContext);
    }
    else if (error.statusCode >= 400) {
        logger.warn('Client error occurred', logContext);
    }
    else {
        logger.info('Error occurred', logContext);
    }
}
/**
 * Main error handler middleware
 */
function errorHandler(config = {}) {
    const finalConfig = { ...defaultConfig, ...config };
    const logger = finalConfig.logger;
    return async (err, req, res, next) => {
        // Convert to AppError if needed
        const appError = (0, errors_1.toAppError)(err);
        // Log error
        if (finalConfig.logErrors) {
            logError(appError, req, logger);
        }
        // Send admin alert for critical errors
        if (finalConfig.sendAdminAlerts &&
            (appError instanceof errors_1.DatabaseConnectionError ||
                appError instanceof errors_1.MigrationError ||
                appError.statusCode >= 500)) {
            try {
                await sendAdminAlert(appError, req);
            }
            catch (alertError) {
                logger.error('Failed to send admin alert', { error: alertError });
            }
        }
        // Format response
        const response = (0, errors_1.formatErrorResponse)(appError);
        // Add stack trace in development
        if (finalConfig.includeStackTrace && appError.stack) {
            response.error.stack = appError.stack;
        }
        // Add request ID if available
        const requestId = req.id || req.headers['x-request-id'];
        if (requestId) {
            response.error.requestId = requestId;
        }
        // Send response
        res.status(appError.statusCode).json(response);
    };
}
/**
 * Async error wrapper for route handlers
 * Catches async errors and passes them to error handler
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
/**
 * Not found handler middleware
 */
function notFoundHandler(req, res, next) {
    const error = new errors_1.NotFoundError('Route', req.path);
    next(error);
}
/**
 * Database error handler
 * Wraps database operations and converts errors to AppError
 */
async function handleDatabaseOperation(operation, context) {
    try {
        return await operation();
    }
    catch (error) {
        // Convert to appropriate database error
        const appError = (0, errors_1.toAppError)(error);
        // Add context if provided
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
 * Migration error handler
 * Wraps migration operations with detailed logging
 */
async function handleMigrationOperation(operation, migrationName) {
    try {
        consoleLogger.info(`Starting migration: ${migrationName}`);
        const result = await operation();
        consoleLogger.info(`Migration completed successfully: ${migrationName}`);
        return result;
    }
    catch (error) {
        const migrationError = new errors_1.MigrationError(`Migration failed: ${migrationName}`, {
            migrationName,
            originalError: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
        });
        consoleLogger.error(`Migration failed: ${migrationName}`, {
            error: migrationError,
        });
        // Send admin alert
        try {
            await sendAdminAlert(migrationError, {});
        }
        catch (alertError) {
            consoleLogger.error('Failed to send migration alert', { error: alertError });
        }
        throw migrationError;
    }
}
/**
 * Validation error handler
 * Creates consistent validation errors
 */
function createValidationError(field, message, value) {
    return new errors_1.ValidationError(`Validation failed for ${field}: ${message}`, {
        field,
        value,
    });
}
//# sourceMappingURL=errorHandler.js.map