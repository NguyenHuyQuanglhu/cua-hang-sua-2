# Backend Error Handling

## Overview

This module implements comprehensive error handling for the backend API, providing:

- Custom error classes for different error types
- Consistent error response format
- Database error handling with retry logic
- Migration error handling with admin alerts
- Validation error handling

## Error Classes

### Base Error Classes

#### `AppError`
Base class for all application errors.

```typescript
const error = new AppError('Something went wrong', 500, 'INTERNAL_ERROR', { details });
```

### Database Errors

#### `DatabaseError`
Generic database error (500 status).

```typescript
const error = new DatabaseError('Query failed', { query: 'SELECT ...' });
```

#### `DatabaseConnectionError`
Database connection failures (500 status).

```typescript
const error = new DatabaseConnectionError('Connection refused');
```

#### `DatabaseTimeoutError`
Database operation timeouts (500 status).

```typescript
const error = new DatabaseTimeoutError('Query timed out');
```

#### `DatabaseConstraintError`
Constraint violations (400 status - client error).

```typescript
const error = new DatabaseConstraintError('Foreign key violation', { constraint: 'FK_...' });
```

### Other Error Classes

#### `MigrationError`
Migration failures (500 status).

```typescript
const error = new MigrationError('Migration failed', { step: 1 });
```

#### `ValidationError`
Input validation failures (400 status).

```typescript
const error = new ValidationError('Invalid email', { field: 'email' });
```

#### `InvalidStatusError`
Invalid status values (400 status).

```typescript
const error = new InvalidStatusError('invalid', ['pending', 'processed']);
```

#### `NotFoundError`
Resource not found (404 status).

```typescript
const error = new NotFoundError('User', '123');
```

#### `UnauthorizedError`
Authentication failures (401 status).

```typescript
const error = new UnauthorizedError('Invalid token');
```

#### `ForbiddenError`
Authorization failures (403 status).

```typescript
const error = new ForbiddenError('Insufficient permissions');
```

#### `ConflictError`
Resource conflicts (409 status).

```typescript
const error = new ConflictError('Email already exists');
```

## Middleware

### Error Handler

The main error handling middleware that catches all errors and formats responses.

```typescript
import { errorHandler } from './middleware/errorHandler';

app.use(errorHandler({
  includeStackTrace: process.env.NODE_ENV === 'development',
  logErrors: true,
  sendAdminAlerts: process.env.NODE_ENV === 'production',
}));
```

### Async Handler

Wrapper for async route handlers that catches errors.

```typescript
import { asyncHandler } from './middleware/errorHandler';

router.get('/users', asyncHandler(async (req, res) => {
  const users = await getUsers();
  res.json(users);
}));
```

### Not Found Handler

Handles 404 errors for unknown routes.

```typescript
import { notFoundHandler } from './middleware/errorHandler';

app.use(notFoundHandler);
```

## Database Error Handling

### Wrap Database Operations

```typescript
import { handleDatabaseOperation } from './middleware/errorHandler';

const users = await handleDatabaseOperation(
  () => query('SELECT * FROM users'),
  'Fetching users'
);
```

### Retry Logic

```typescript
import { retryDatabaseOperation } from './db/errorHandler';

const result = await retryDatabaseOperation(
  () => query('SELECT * FROM users'),
  {
    maxRetries: 3,
    initialDelay: 100,
    maxDelay: 5000,
  }
);
```

### Transaction Handling

```typescript
import { withTransaction } from './db/errorHandler';

const result = await withTransaction(pool, async (transaction) => {
  await transaction.query('INSERT INTO users ...');
  await transaction.query('INSERT INTO profiles ...');
  return { success: true };
});
```

## Migration Error Handling

```typescript
import { handleMigrationOperation } from './middleware/errorHandler';

await handleMigrationOperation(
  async () => {
    // Migration logic
    await runMigration();
  },
  'add-user-columns'
);
```

## Error Response Format

All errors follow a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email address",
    "details": {
      "field": "email",
      "value": "invalid@"
    }
  }
}
```

In development mode, stack traces are included:

```json
{
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Query failed",
    "stack": "Error: Query failed\n    at ..."
  }
}
```

## Usage Examples

### Route Handler with Error Handling

```typescript
import { asyncHandler, ValidationError, NotFoundError } from './middleware/errorHandler';

router.post('/users', asyncHandler(async (req, res) => {
  // Validation
  if (!req.body.email) {
    throw new ValidationError('Email is required', { field: 'email' });
  }
  
  // Database operation
  const user = await createUser(req.body);
  
  if (!user) {
    throw new NotFoundError('User');
  }
  
  res.json(user);
}));
```

### Database Operation with Retry

```typescript
import { retryDatabaseOperation } from './db/errorHandler';

async function getUser(id: string) {
  return await retryDatabaseOperation(
    () => query('SELECT * FROM users WHERE id = @id', { id }),
    { maxRetries: 3 }
  );
}
```

### Custom Error Handling

```typescript
try {
  await someOperation();
} catch (error) {
  if (isDatabaseConnectionError(error)) {
    // Handle connection error
    console.error('Database connection lost');
  } else if (isDatabaseTimeoutError(error)) {
    // Handle timeout
    console.error('Operation timed out');
  } else {
    // Generic error handling
    throw toAppError(error);
  }
}
```

## Testing

Error handling is fully tested with unit tests:

```bash
npm test -- src/errors/index.test.ts
npm test -- src/middleware/errorHandler.test.ts
```

## Best Practices

1. **Always use custom error classes** instead of generic `Error`
2. **Use `asyncHandler`** for all async route handlers
3. **Wrap database operations** with error handling utilities
4. **Provide context** in error details for debugging
5. **Log errors** appropriately based on severity
6. **Don't expose sensitive information** in error messages
7. **Use consistent error codes** across the application

## Error Codes

| Code | Description | Status |
|------|-------------|--------|
| `DATABASE_ERROR` | Generic database error | 500 |
| `DATABASE_CONNECTION_ERROR` | Connection failure | 500 |
| `DATABASE_TIMEOUT_ERROR` | Operation timeout | 500 |
| `DATABASE_CONSTRAINT_ERROR` | Constraint violation | 400 |
| `MIGRATION_ERROR` | Migration failure | 500 |
| `VALIDATION_ERROR` | Input validation failure | 400 |
| `INVALID_STATUS` | Invalid status value | 400 |
| `NOT_FOUND` | Resource not found | 404 |
| `UNAUTHORIZED` | Authentication failure | 401 |
| `FORBIDDEN` | Authorization failure | 403 |
| `CONFLICT` | Resource conflict | 409 |
| `INTERNAL_ERROR` | Generic internal error | 500 |
| `UNKNOWN_ERROR` | Unknown error type | 500 |
