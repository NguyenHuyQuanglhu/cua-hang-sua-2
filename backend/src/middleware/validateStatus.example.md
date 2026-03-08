# Status Validation Middleware - Usage Examples

This document provides examples of how to use the `validateAndNormalizeStatus` and `validateStatusQuery` middleware in your API routes.

## Overview

The status validation middleware provides two functions:

1. **`validateAndNormalizeStatus`** - For validating and normalizing status values in request bodies (POST, PATCH, PUT requests)
2. **`validateStatusQuery`** - For validating and normalizing status values in query parameters (GET requests)

Both middleware functions:
- Accept both old status values (`draft`, `printed`, `completed`, `cancelled`) and new status values (`pending`, `processed`)
- Automatically normalize old values to new values
- Return a 400 error with detailed information if the status is invalid
- Pass through requests that don't contain a status field

## Usage in Routes

### Example 1: POST /api/sales (Create Order)

```typescript
import { Router } from 'express';
import { validateAndNormalizeStatus } from '../middleware';

const router = Router();

// Apply middleware to POST route
router.post('/api/sales', 
  validateAndNormalizeStatus,  // Validates and normalizes status in request body
  async (req, res) => {
    // req.body.status is now guaranteed to be 'pending' or 'processed'
    const { status, items, total } = req.body;
    
    // Create order logic...
    res.status(201).json({ id: '...', status, items, total });
  }
);
```

**Request Examples:**

```bash
# New status value - passes through
POST /api/sales
{ "status": "pending", "items": [...], "total": 100 }
# Result: status remains "pending"

# Old status value - normalized
POST /api/sales
{ "status": "draft", "items": [...], "total": 100 }
# Result: status normalized to "pending"

# Invalid status - returns 400 error
POST /api/sales
{ "status": "invalid", "items": [...], "total": 100 }
# Result: 400 error with details
```

### Example 2: PATCH /api/sales/:id (Update Order Status)

```typescript
import { Router } from 'express';
import { validateAndNormalizeStatus } from '../middleware';

const router = Router();

// Apply middleware to PATCH route
router.patch('/api/sales/:id',
  validateAndNormalizeStatus,  // Validates and normalizes status in request body
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    // Update order status logic...
    res.json({ id, status });
  }
);
```

**Request Examples:**

```bash
# Update with new status
PATCH /api/sales/123
{ "status": "processed" }
# Result: status remains "processed"

# Update with old status - normalized
PATCH /api/sales/123
{ "status": "completed" }
# Result: status normalized to "processed"
```

### Example 3: GET /api/sales (Filter by Status)

```typescript
import { Router } from 'express';
import { validateStatusQuery } from '../middleware';

const router = Router();

// Apply middleware to GET route
router.get('/api/sales',
  validateStatusQuery,  // Validates and normalizes status in query parameter
  async (req, res) => {
    const { status } = req.query;
    
    // status is now guaranteed to be 'pending', 'processed', 'all', or undefined
    
    // Query orders logic...
    const orders = await getOrders({ status });
    
    res.json({
      data: orders,
      counts: {
        pending: 10,
        processed: 50
      }
    });
  }
);
```

**Request Examples:**

```bash
# Filter with new status
GET /api/sales?status=pending
# Result: status remains "pending"

# Filter with old status - normalized
GET /api/sales?status=draft
# Result: status normalized to "pending"

# Filter with "all" - passes through
GET /api/sales?status=all
# Result: status remains "all"

# No status filter - passes through
GET /api/sales
# Result: no validation, continues to handler
```

## Error Response Format

When validation fails, the middleware returns a 400 error with the following format:

```json
{
  "error": {
    "code": "INVALID_STATUS",
    "message": "Giá trị trạng thái không hợp lệ",
    "details": {
      "received": "invalid_value",
      "validValues": ["pending", "processed"],
      "legacyValues": ["draft", "printed", "completed", "cancelled"],
      "errorMessage": "Invalid status value: \"invalid_value\". Must be one of: pending, processed, draft, printed, completed, cancelled"
    }
  }
}
```

## Applying to Multiple Routes

You can apply the middleware to multiple routes at once:

```typescript
import { Router } from 'express';
import { validateAndNormalizeStatus, validateStatusQuery } from '../middleware';

const router = Router();

// Apply to all POST and PATCH routes
router.post('/api/sales', validateAndNormalizeStatus, createSale);
router.patch('/api/sales/:id', validateAndNormalizeStatus, updateSale);

// Apply to GET routes
router.get('/api/sales', validateStatusQuery, getSales);
router.get('/api/sales/search', validateStatusQuery, searchSales);
```

## Integration with Other Middleware

The status validation middleware works seamlessly with other middleware:

```typescript
import { Router } from 'express';
import { 
  authenticate, 
  storeContext, 
  validateAndNormalizeStatus 
} from '../middleware';

const router = Router();

// Chain multiple middleware
router.post('/api/sales',
  authenticate,                  // 1. Authenticate user
  storeContext,                  // 2. Validate store context
  validateAndNormalizeStatus,    // 3. Validate and normalize status
  async (req, res) => {
    // All validations passed, handle request
    const { user, storeId } = req;
    const { status, items, total } = req.body;
    
    // Create order logic...
  }
);
```

## Testing

The middleware includes comprehensive unit tests. See `validateStatus.test.ts` for examples of:
- Valid new status values
- Valid old status values (with normalization)
- Invalid status values (error handling)
- Requests without status field (pass-through)

Run tests with:
```bash
npm test validateStatus.test.ts
```
