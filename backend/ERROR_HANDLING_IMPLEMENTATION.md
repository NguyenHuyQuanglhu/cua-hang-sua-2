# Backend Error Handling Implementation

## Task 16.2: Implement Backend Error Handling

### Overview

This document summarizes the implementation of comprehensive error handling for the backend API as specified in task 16.2 of the pos-sales-ui-improvements spec.

### Implementation Summary

#### 1. Custom Error Classes (`src/errors/index.ts`)

Created a comprehensive set of custom error classes to handle different error scenarios:

**Base Error Class:**
- `AppError` - Base class for all application errors with statusCode, code, and details

**Database Errors:**
- `DatabaseError` - Generic database error (500)
- `DatabaseConnectionError` - Connection failures (500)
- `DatabaseTimeoutError` - Operation timeouts (500)
- `DatabaseConstraintError` - Constraint violations (400)

**Other Error Types:**
- `MigrationError` - Migration failures (500)
- `ValidationError` - Input validation failures (400)
- `InvalidStatusError` - Invalid status values (400)
- `NotFoundError` - Resource not found (404)
- `UnauthorizedError` - Authentication failures (401)
- `ForbiddenError` - Authorization failures (403)
- `ConflictError` - Resource conflicts (409)

**Utility Functions:**
- `formatErrorResponse()` - Formats errors for API responses
- `isDatabaseConnectionError()` - Detects connection errors
- `isDatabaseTimeoutError()` - Detects timeout errors
- `isDatabaseConstraintError()` - Detects constraint violations
- `toAppError()` - Converts unknown errors to AppError

#### 2. Error Handling Middleware (`src/middleware/errorHandler.ts`)

Implemented comprehensive middleware for error handling:

**Main Middleware:**
- `errorHandler()` - Main error handler with configurable logging and alerts
- `asyncHandler()` - Wrapper for async route handlers
- `notFoundHandler()` - Handles 404 errors

**Database Helpers:**
- `handleDatabaseOperation()` - Wraps database operations with error handling
- `handleMigrationOperation()` - Wraps migrations with detailed logging and alerts
- `createValidationError()` - Creates consistent validation errors

**Features:**
- Automatic error logging with context
- Admin alerts for critical errors (500+ status codes)
- Stack trace inclusion in development mode
- Request ID tracking
- Consistent error response format

#### 3. Database Error Handling (`src/db/errorHandler.ts`)

Created utilities for database-specific error handling:

**Functions:**
- `withDatabaseErrorHandling()` - Wraps database queries with error handling
- `handleSqlServerError()` - Handles SQL Server specific errors
- `isRetryableError()` - Checks if error is retryable
- `retryDatabaseOperation()` - Retries operations with exponential backoff
- `withTransaction()` - Executes transactions with error handling
- `logDatabaseQuery()` - Logs queries for debugging

**Features:**
- SQL Server error number detection
- Automatic retry with exponential backoff
- Transaction rollback on errors
- Constraint name extraction from error messages

#### 4. Integration with Main Application (`src/index.ts`)

Updated the main application file to use the new error handling:

```typescript
// Import error handling middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// ... routes ...

// 404 handler - must be before error handler
app.use(notFoundHandler);

// Error handling middleware - must be last
app.use(errorHandler({
  includeStackTrace: process.env.NODE_ENV === 'development',
  logErrors: true,
  sendAdminAlerts: process.env.NODE_ENV === 'production',
}));
```

#### 5. Consistent Error Response Format

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "additional context"
    }
  }
}
```

### Error Handling Scenarios

#### 1. Database Connection Errors

**Detection:**
- Connection refused (ECONNREFUSED)
- Timeout (ETIMEDOUT)
- SQL Server error number -1, -2

**Handling:**
- Automatic retry with exponential backoff
- Admin alert in production
- Detailed logging

#### 2. Database Timeout Errors

**Detection:**
- Timeout messages
- SQL Server error number -3

**Handling:**
- Automatic retry (configurable)
- Detailed logging with query context

#### 3. Database Constraint Violations

**Detection:**
- Foreign key violations (SQL Server error 547)
- Unique index violations (SQL Server error 2601)
- Primary key violations (SQL Server error 2627)

**Handling:**
- Returns 400 status (client error)
- Extracts constraint name from error message
- Provides detailed error information

#### 4. Migration Errors

**Handling:**
- Detailed logging of migration steps
- Admin alerts on failure
- Automatic transaction rollback
- Audit trail in migration_audit_log table

#### 5. Validation Errors

**Handling:**
- Returns 400 status
- Includes field name and value in details
- Consistent error format

### Testing

Comprehensive unit tests implemented:

**Test Files:**
- `src/errors/index.test.ts` - Tests for error classes and utilities (31 tests)
- `src/middleware/errorHandler.test.ts` - Tests for middleware (14 tests)

**Test Coverage:**
- All error classes
- Error detection functions
- Error conversion functions
- Middleware functionality
- Async error handling
- Database operation wrapping
- Migration error handling

**Test Results:**
```
Test Files  2 passed (2)
Tests  45 passed (45)
```

### Documentation

Created comprehensive documentation:

- `src/errors/README.md` - Complete guide to error handling
- `ERROR_HANDLING_IMPLEMENTATION.md` - This implementation summary

### Benefits

1. **Consistent Error Handling:** All errors follow the same format and flow
2. **Better Debugging:** Detailed error information with context
3. **Automatic Retry:** Retryable errors are handled automatically
4. **Admin Alerts:** Critical errors trigger alerts in production
5. **Type Safety:** TypeScript types for all error classes
6. **Testability:** Fully tested with unit tests
7. **Maintainability:** Clear separation of concerns
8. **Production Ready:** Environment-specific behavior (stack traces, alerts)

### Usage Examples

#### Route Handler with Error Handling

```typescript
import { asyncHandler, ValidationError } from './middleware/errorHandler';

router.post('/users', asyncHandler(async (req, res) => {
  if (!req.body.email) {
    throw new ValidationError('Email is required', { field: 'email' });
  }
  
  const user = await createUser(req.body);
  res.json(user);
}));
```

#### Database Operation with Retry

```typescript
import { retryDatabaseOperation } from './db/errorHandler';

const users = await retryDatabaseOperation(
  () => query('SELECT * FROM users'),
  { maxRetries: 3, initialDelay: 100 }
);
```

#### Migration with Error Handling

```typescript
import { handleMigrationOperation } from './middleware/errorHandler';

await handleMigrationOperation(
  async () => {
    await runMigration();
  },
  'add-user-columns'
);
```

### Next Steps

The error handling implementation is complete and ready for use. To fully utilize it:

1. Update existing route handlers to use `asyncHandler`
2. Wrap database operations with error handling utilities
3. Use custom error classes instead of generic `Error`
4. Configure admin alert system (email, Slack, etc.)
5. Monitor error logs in production

### Compliance with Requirements

This implementation satisfies all requirements from task 16.2:

✅ Handle database errors (connection lost, timeout, constraint violation)
✅ Handle migration errors (detailed logging, admin alerts)
✅ Handle invalid status in requests (validation errors)
✅ Implement consistent error response format

All error scenarios are properly handled with appropriate status codes, error messages, and logging.
