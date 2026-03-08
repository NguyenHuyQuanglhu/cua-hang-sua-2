# Sales API Documentation

## Overview

This document describes the Sales API endpoints for the POS system. The API has been updated to use a simplified two-status system: `pending` and `processed`.

**Base URL**: `/api/sales`

**Authentication**: All endpoints require authentication via JWT token in the `Authorization` header.

**Store Context**: All endpoints operate within the authenticated user's store context.

---

## Status System

### Current Status Values

The system uses two status values for order management:

| Status | Description | Vietnamese |
|--------|-------------|------------|
| `pending` | Order is created but not yet completed (awaiting payment or processing) | Chưa xử lý |
| `processed` | Order has been completed (paid or cancelled) | Đã xử lý |

### Status Transitions

```
[New Order] → pending
pending → processed (on payment success or cancellation)
```

### Backward Compatibility

The API maintains backward compatibility with legacy status values. If you send a request with an old status value, it will be automatically normalized to the new system:

| Legacy Status | Maps To | Description |
|---------------|---------|-------------|
| `draft` | `pending` | Order in draft state |
| `printed` | `pending` | Order with printed invoice |
| `completed` | `processed` | Completed order |
| `cancelled` | `processed` | Cancelled order |

**Note**: While the API accepts legacy status values for backward compatibility, all responses will only return `pending` or `processed`.

---

## Endpoints

### 1. Get Sales List

Retrieve a paginated list of sales transactions with optional filtering.

**Endpoint**: `GET /api/sales`

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | number | No | 1 | Page number for pagination |
| `pageSize` | number | No | 20 | Number of items per page |
| `search` | string | No | - | Search by invoice number or customer name |
| `status` | string | No | - | Filter by status: `pending`, `processed`, or `all` |
| `customerId` | string | No | - | Filter by customer ID (use `all` for all customers) |
| `dateFrom` | string | No | - | Filter by start date (ISO 8601 format) |
| `dateTo` | string | No | - | Filter by end date (ISO 8601 format) |

**Status Filter Values**:
- `pending` - Returns only pending orders
- `processed` - Returns only processed orders
- `all` - Returns all orders (no status filter)
- Legacy values (`draft`, `printed`, `completed`, `cancelled`) - Automatically normalized

**Response**: `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "storeId": "uuid",
      "invoiceNumber": "PN202401150001",
      "customerId": "uuid",
      "customerName": "Nguyễn Văn A",
      "shiftId": "uuid",
      "transactionDate": "2024-01-15T10:30:00Z",
      "status": "processed",
      "totalAmount": 100000,
      "vatAmount": 10000,
      "finalAmount": 110000,
      "discount": 5000,
      "discountType": "amount",
      "discountValue": 5000,
      "tierDiscountPercentage": 0,
      "tierDiscountAmount": 0,
      "pointsUsed": 0,
      "pointsDiscount": 0,
      "customerPayment": 110000,
      "previousDebt": 0,
      "remainingDebt": 0,
      "paymentMethod": "cash",
      "itemCount": 3,
      "createdAt": "2024-01-15T10:25:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "pageSize": 20,
  "totalPages": 8,
  "counts": {
    "pending": 25,
    "processed": 125
  }
}
```

**Response Fields**:
- `counts` - Object containing the count of orders for each status (useful for filter UI)
  - `pending` - Number of pending orders
  - `processed` - Number of processed orders

**Error Responses**:

`400 Bad Request` - Invalid status parameter
```json
{
  "error": {
    "code": "INVALID_STATUS",
    "message": "Giá trị trạng thái không hợp lệ",
    "details": {
      "received": "invalid_status",
      "validValues": ["pending", "processed", "all"],
      "legacyValues": ["draft", "printed", "completed", "cancelled"],
      "errorMessage": "Invalid status value: invalid_status"
    }
  }
}
```

`500 Internal Server Error` - Server error
```json
{
  "error": "Failed to get sales"
}
```

---

### 2. Get Sale by ID

Retrieve detailed information about a specific sale transaction.

**Endpoint**: `GET /api/sales/:id`

**Path Parameters**:
- `id` (string, required) - Sale transaction ID (UUID)

**Response**: `200 OK`

```json
{
  "sale": {
    "id": "uuid",
    "storeId": "uuid",
    "invoiceNumber": "PN202401150001",
    "customerId": "uuid",
    "customerName": "Nguyễn Văn A",
    "shiftId": "uuid",
    "transactionDate": "2024-01-15T10:30:00Z",
    "status": "processed",
    "totalAmount": 100000,
    "vatAmount": 10000,
    "finalAmount": 110000,
    "discount": 5000,
    "discountType": "amount",
    "discountValue": 5000,
    "tierDiscountPercentage": 0,
    "tierDiscountAmount": 0,
    "pointsUsed": 0,
    "pointsDiscount": 0,
    "customerPayment": 110000,
    "previousDebt": 0,
    "remainingDebt": 0,
    "items": [
      {
        "id": "uuid",
        "salesId": "uuid",
        "productId": "uuid",
        "productName": "Sữa tươi",
        "unitName": "Hộp",
        "quantity": 2,
        "price": 50000
      }
    ]
  }
}
```

**Error Responses**:

`404 Not Found` - Sale not found
```json
{
  "error": "Sale not found"
}
```

`500 Internal Server Error` - Server error
```json
{
  "error": "Failed to get sale"
}
```

---

### 3. Create Sale

Create a new sale transaction.

**Endpoint**: `POST /api/sales`

**Request Body**:

```json
{
  "customerId": "uuid",
  "shiftId": "uuid",
  "items": [
    {
      "productId": "uuid",
      "quantity": 2,
      "price": 50000,
      "unitId": "uuid"
    }
  ],
  "totalAmount": 100000,
  "vatAmount": 10000,
  "finalAmount": 110000,
  "discount": 5000,
  "discountType": "amount",
  "discountValue": 5000,
  "tierDiscountPercentage": 0,
  "tierDiscountAmount": 0,
  "pointsUsed": 0,
  "pointsDiscount": 0,
  "customerPayment": 110000,
  "previousDebt": 0,
  "remainingDebt": 0,
  "status": "pending"
}
```

**Request Fields**:
- `status` (string, optional) - Order status. Defaults to `pending` if not provided. Accepts `pending`, `processed`, or legacy values.
- `items` (array, required*) - Array of sale items. Can be empty for debt payment only transactions.
- `customerId` (string, optional) - Customer ID
- `shiftId` (string, optional) - Shift ID
- Other fields as shown in example

**Default Behavior**:
- If `status` is not provided, it defaults to `pending` (Requirement 2.2)
- If legacy status value is provided, it is automatically normalized to `pending` or `processed`

**Response**: `201 Created`

```json
{
  "id": "uuid",
  "invoiceNumber": "PN202401150001",
  "status": "pending",
  "finalAmount": 110000,
  "conversions": []
}
```

**Error Responses**:

`400 Bad Request` - Validation error
```json
{
  "error": "Đơn hàng phải có ít nhất một sản phẩm"
}
```

`400 Bad Request` - Invalid status value
```json
{
  "error": {
    "code": "INVALID_STATUS",
    "message": "Giá trị trạng thái không hợp lệ",
    "details": {
      "received": "invalid_status",
      "validValues": ["pending", "processed"],
      "legacyValues": ["draft", "printed", "completed", "cancelled"],
      "errorMessage": "Invalid status value: invalid_status"
    }
  }
}
```

`400 Bad Request` - Insufficient stock
```json
{
  "error": "Sản phẩm đã hết hàng hoặc không đủ số lượng để bán",
  "code": "INSUFFICIENT_STOCK",
  "productId": "uuid",
  "requestedQuantity": 10,
  "availableQuantity": 5,
  "unitId": "uuid"
}
```

`500 Internal Server Error` - Server error
```json
{
  "error": "Failed to create sale: <error details>"
}
```

---

### 4. Update Sale (Full Update)

Update a sale transaction using PUT method (full update).

**Endpoint**: `PUT /api/sales/:id`

**Path Parameters**:
- `id` (string, required) - Sale transaction ID (UUID)

**Request Body**:

```json
{
  "status": "processed",
  "customerPayment": 110000,
  "remainingDebt": 0
}
```

**Request Fields**:
- `status` (string, optional) - New status value: `pending`, `processed`, or legacy values
- `customerPayment` (number, optional) - Updated payment amount
- `remainingDebt` (number, optional) - Updated remaining debt

**Status Validation**:
- Accepts both new status values (`pending`, `processed`) and legacy values
- Legacy values are automatically normalized to new values
- Invalid status values return a 400 error

**Response**: `200 OK`

```json
{
  "success": true
}
```

**Error Responses**:

`400 Bad Request` - Invalid status value
```json
{
  "error": {
    "code": "INVALID_STATUS",
    "message": "Giá trị trạng thái không hợp lệ",
    "details": {
      "received": "invalid_status",
      "validValues": ["pending", "processed"],
      "legacyValues": ["draft", "printed", "completed", "cancelled"],
      "errorMessage": "Invalid status value: invalid_status"
    }
  }
}
```

`404 Not Found` - Sale not found
```json
{
  "error": "Sale not found"
}
```

`500 Internal Server Error` - Server error
```json
{
  "error": "Failed to update sale"
}
```

---

### 5. Update Sale (Partial Update)

Update a sale transaction using PATCH method (partial update).

**Endpoint**: `PATCH /api/sales/:id`

**Path Parameters**:
- `id` (string, required) - Sale transaction ID (UUID)

**Request Body**:

```json
{
  "status": "processed"
}
```

**Request Fields**:
- `status` (string, optional) - New status value: `pending`, `processed`, or legacy values
- `customerPayment` (number, optional) - Updated payment amount
- `remainingDebt` (number, optional) - Updated remaining debt

**Status Transitions** (Requirements 2.3, 2.4):
- `pending` → `processed` - When payment is completed or order is cancelled
- Only these two status values are valid in the new system

**Response**: `200 OK`

```json
{
  "success": true
}
```

**Error Responses**: Same as PUT endpoint

---

### 6. Delete Sale

Delete a sale transaction.

**Endpoint**: `DELETE /api/sales/:id`

**Path Parameters**:
- `id` (string, required) - Sale transaction ID (UUID)

**Response**: `200 OK`

```json
{
  "success": true
}
```

**Error Responses**:

`500 Internal Server Error` - Server error
```json
{
  "error": "Failed to delete sale"
}
```

---

### 7. Get Sale Items

Retrieve items for a specific sale transaction.

**Endpoint**: `GET /api/sales/:id/items`

**Path Parameters**:
- `id` (string, required) - Sale transaction ID (UUID)

**Response**: `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "saleId": "uuid",
      "productId": "uuid",
      "productName": "Sữa tươi",
      "unitName": "Hộp",
      "quantity": 2,
      "price": 50000,
      "unitPrice": 50000,
      "totalPrice": 100000
    }
  ]
}
```

**Error Responses**:

`404 Not Found` - Sale not found
```json
{
  "error": "Sale not found"
}
```

`500 Internal Server Error` - Server error
```json
{
  "error": "Failed to get sale items"
}
```

---

### 8. Get All Sale Items

Retrieve all sale items across all transactions (for dashboard/reporting).

**Endpoint**: `GET /api/sales/items/all`

**Query Parameters**:
- `dateFrom` (string, optional) - Filter by start date (ISO 8601 format)
- `dateTo` (string, optional) - Filter by end date (ISO 8601 format)

**Response**: `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "salesTransactionId": "uuid",
      "productId": "uuid",
      "productName": "Sữa tươi",
      "unitName": null,
      "quantity": 2,
      "price": 50000,
      "totalPrice": 100000,
      "transactionDate": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Error Responses**:

`500 Internal Server Error` - Server error
```json
{
  "error": "Failed to get sale items"
}
```

---

### 9. Generate Invoice PDF

Generate a PDF invoice for a sale transaction.

**Endpoint**: `GET /api/sales/:id/invoice-pdf`

**Path Parameters**:
- `id` (string, required) - Sale transaction ID (UUID)

**Response**: `200 OK`

Returns a PDF file with headers:
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename=invoice-{invoiceNumber}.pdf`

**Error Responses**:

`400 Bad Request` - Missing tenant context
```json
{
  "error": "Tenant context required"
}
```

`404 Not Found` - Sale not found
```json
{
  "error": "Sale not found"
}
```

`500 Internal Server Error` - Server error
```json
{
  "error": "Failed to generate invoice PDF"
}
```

---

## Error Response Format

All API errors follow a consistent format for easy handling:

### Standard Error Response

```json
{
  "error": "Error message in Vietnamese"
}
```

### Validation Error Response

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "User-friendly error message in Vietnamese",
    "details": {
      "field": "Additional context about the error"
    }
  }
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `INVALID_STATUS` | Invalid status value provided | 400 |
| `INSUFFICIENT_STOCK` | Product out of stock or insufficient quantity | 400 |
| `SALE_NOT_FOUND` | Sale transaction not found | 404 |
| `DATABASE_ERROR` | Database operation failed | 500 |

---

## Status Migration Notes

### For API Consumers

1. **New Integrations**: Use only `pending` and `processed` status values
2. **Existing Integrations**: Legacy status values are still accepted but will be normalized
3. **Response Handling**: Always expect `pending` or `processed` in API responses, never legacy values

### Migration Timeline

- **Phase 1** (Current): API accepts both old and new status values, returns only new values
- **Phase 2** (Future): Legacy status support may be deprecated with advance notice

### Testing Backward Compatibility

You can test backward compatibility by sending requests with legacy status values:

```bash
# This request with legacy status
POST /api/sales
{
  "status": "draft",
  ...
}

# Will be normalized and return
{
  "status": "pending",
  ...
}
```

---

## Requirements Mapping

This API documentation addresses the following requirements from the specification:

- **Requirement 2.1**: System uses only two status values (pending, processed)
- **Requirement 2.2**: New orders default to pending status
- **Requirement 2.3**: Successful payment updates status to processed
- **Requirement 2.4**: Cancelled orders update status to processed
- **Requirement 3.1**: API endpoints accept only two status values
- **Requirement 3.2**: API automatically maps legacy status values
- **Requirement 3.4**: API provides status filter endpoint

---

## Examples

### Example 1: Create a new order (defaults to pending)

```bash
POST /api/sales
Content-Type: application/json
Authorization: Bearer <token>

{
  "customerId": "customer-uuid",
  "items": [
    {
      "productId": "product-uuid",
      "quantity": 2,
      "price": 50000
    }
  ],
  "totalAmount": 100000,
  "finalAmount": 100000
}

# Response: status will be "pending" by default
```

### Example 2: Filter orders by status

```bash
# Get all pending orders
GET /api/sales?status=pending&page=1&pageSize=20

# Get all processed orders
GET /api/sales?status=processed&page=1&pageSize=20

# Get all orders
GET /api/sales?status=all&page=1&pageSize=20
```

### Example 3: Update order status to processed

```bash
PATCH /api/sales/{order-id}
Content-Type: application/json
Authorization: Bearer <token>

{
  "status": "processed"
}
```

### Example 4: Using legacy status (backward compatibility)

```bash
# Send request with legacy status
POST /api/sales
{
  "status": "completed",
  ...
}

# API automatically normalizes to "processed"
# Response will contain: "status": "processed"
```

---

## Support

For questions or issues with the API, please contact the development team or refer to:
- [Design Document](../../.kiro/specs/pos-sales-ui-improvements/design.md)
- [Requirements Document](../../.kiro/specs/pos-sales-ui-improvements/requirements.md)
- [Migration Runbook](./ORDER_STATUS_MIGRATION_RUNBOOK.md)
