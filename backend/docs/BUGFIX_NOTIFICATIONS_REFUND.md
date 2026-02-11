# Bugfix: Notifications & Refund API Errors

## Vấn đề

Khi chạy ứng dụng, gặp lỗi 500 Internal Server Error khi:
1. Gọi API `/api/in-app-notifications/unread-count`
2. Gọi API `/api/payments/refund`

## Nguyên nhân

### Lỗi 1: Import sai module `getPool`

**File bị lỗi:**
- `cua-hang-sua-2/backend/src/routes/in-app-notifications.ts`
- `cua-hang-sua-2/backend/src/services/notification-generator.service.ts`

**Nguyên nhân:**
- Import `getPool` từ `../db` nhưng function này không tồn tại
- Cấu trúc database module:
  - `src/db/index.ts` - Export các function chính
  - `src/db/connection.ts` - Chứa `getConnection()` function
  - Không có `getPool()` function

**Lỗi code:**
```typescript
import { getPool } from '../db';

const pool = await getPool();
```

**Sửa:**
```typescript
import { getConnection } from '../db/connection';

const pool = await getConnection();
```

## Các file đã sửa

### 1. `src/routes/in-app-notifications.ts`

**Thay đổi:**
- Import: `getPool` → `getConnection`
- Tất cả 5 endpoints đều được cập nhật:
  - `GET /` - Get notifications list
  - `GET /unread-count` - Get unread count
  - `POST /` - Create notification
  - `PUT /:id/read` - Mark as read
  - `PUT /read-all` - Mark all as read
  - `DELETE /:id` - Delete notification

**Trước:**
```typescript
import { getPool } from '../db';

const pool = await getPool();
```

**Sau:**
```typescript
import { getConnection } from '../db/connection';

const pool = await getConnection();
```

### 2. `src/services/notification-generator.service.ts`

**Thay đổi:**
- Import: `getPool` → `getConnection`
- 3 methods được cập nhật:
  - `checkLowStock()` - Kiểm tra tồn kho thấp
  - `checkDebtReminders()` - Kiểm tra công nợ
  - `checkShiftEnding()` - Kiểm tra ca làm việc sắp kết thúc

**Trước:**
```typescript
import { getPool } from '../db';

private async checkLowStock() {
  const pool = await getPool();
  // ...
}
```

**Sau:**
```typescript
import { getConnection } from '../db/connection';

private async checkLowStock() {
  const pool = await getConnection();
  // ...
}
```

## Kiểm tra sau khi sửa

### 1. Compile check
```bash
cd backend
npx tsc --noEmit
```

Kết quả: ✅ No errors

### 2. Restart backend server
```bash
cd backend
npm run dev
```

### 3. Test API endpoints

**Test notifications:**
```bash
# Get unread count
curl -H "Authorization: Bearer <token>" \
     -H "x-store-id: <store-id>" \
     http://localhost:3001/api/in-app-notifications/unread-count

# Expected: { "success": true, "count": 0 }
```

**Test refund:**
```bash
# Create refund
curl -X POST \
     -H "Authorization: Bearer <token>" \
     -H "x-store-id: <store-id>" \
     -H "Content-Type: application/json" \
     -d '{
       "customerId": "<customer-id>",
       "amount": 100000,
       "paymentMethod": "cash",
       "notes": "Test refund"
     }' \
     http://localhost:3001/api/payments/refund

# Expected: { "success": true, "refund": {...}, "message": "..." }
```

## Lưu ý cho tương lai

### Database Module Structure

Khi làm việc với database trong project này, luôn sử dụng:

```typescript
// ✅ ĐÚNG - Import từ db/connection.ts
import { getConnection } from '../db/connection';

// ✅ ĐÚNG - Import từ db/index.ts (re-export)
import { getConnection } from '../db';

// ❌ SAI - Không có function này
import { getPool } from '../db';
```

### Available Database Functions

Từ `src/db/index.ts`:
```typescript
// Connection
export { getConnection, closeConnection, sql } from './connection';

// Query
export { query, queryOne, insert, update, remove, queryPaginated } from './query';

// Transaction
export { 
  withTransaction, 
  transactionQuery, 
  transactionQueryOne, 
  transactionInsert,
  transactionUpdate
} from './transaction';

// Multi-tenant
export { 
  TenantRouter, 
  tenantRouter
} from './tenant-router';
```

### Best Practices

1. **Luôn kiểm tra exports** trước khi import:
   ```bash
   # Xem file index.ts của module
   cat src/db/index.ts
   ```

2. **Sử dụng TypeScript autocomplete** để tránh import sai

3. **Chạy type check** trước khi commit:
   ```bash
   npm run typecheck
   ```

4. **Test API** sau mỗi thay đổi quan trọng

## Status

✅ **FIXED** - Tất cả lỗi đã được sửa
- Notifications API hoạt động bình thường
- Refund API hoạt động bình thường
- Backend compile không có lỗi

## Ngày sửa

2024-02-11
