# Hệ Thống Lưu Lịch Sử Giao Dịch Gói Dịch Vụ

## Tổng Quan

Hệ thống này cho phép lưu trữ và theo dõi tất cả các giao dịch liên quan đến gói dịch vụ, bao gồm:
- Tự động gia hạn gói dịch vụ
- Nâng cấp gói thủ công
- Mua gói mới

Admin và Quản lý có thể xem lịch sử giao dịch để theo dõi tài khoản nào đã mua/gia hạn gói.

## Cấu Trúc Database

### Bảng SubscriptionTransactions

```sql
CREATE TABLE SubscriptionTransactions (
    id NVARCHAR(36) PRIMARY KEY,
    user_id NVARCHAR(36) NOT NULL,
    tenant_id NVARCHAR(36) NULL,
    transaction_type NVARCHAR(50) NOT NULL, -- 'auto_renewal', 'manual_upgrade', 'manual_purchase'
    plan_id NVARCHAR(50) NOT NULL,
    previous_plan_id NVARCHAR(50) NULL,
    max_stores INT NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    currency NVARCHAR(3) DEFAULT 'VND',
    payment_method NVARCHAR(50) NOT NULL,
    payment_status NVARCHAR(20) NOT NULL DEFAULT 'pending',
    transaction_reference NVARCHAR(100) NULL,
    start_date DATETIME2 NOT NULL,
    end_date DATETIME2 NOT NULL,
    auto_renewal BIT NOT NULL DEFAULT 1,
    processed_by NVARCHAR(36) NULL,
    processed_by_role NVARCHAR(50) NULL,
    notes NVARCHAR(500) NULL,
    metadata NVARCHAR(MAX) NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
```

## API Endpoints

### Admin APIs (Chỉ Owner/Company Manager)

#### 1. Lấy Danh Sách Giao Dịch
```
GET /api/admin/subscription-transactions
```

**Query Parameters:**
- `userId`: Lọc theo user ID
- `transactionType`: auto_renewal | manual_upgrade | manual_purchase
- `planId`: basic | pro | enterprise
- `paymentStatus`: pending | completed | failed | refunded
- `paymentMethod`: auto_payment | bank_transfer | credit_card | cash
- `fromDate`: Từ ngày (ISO string)
- `toDate`: Đến ngày (ISO string)
- `limit`: Số bản ghi (max 200, default 50)
- `offset`: Bỏ qua số bản ghi (default 0)

**Response:**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "userId": "user-id",
      "transactionType": "auto_renewal",
      "planId": "pro",
      "previousPlanId": "basic",
      "maxStores": 5,
      "amount": 499000,
      "currency": "VND",
      "paymentMethod": "auto_payment",
      "paymentStatus": "completed",
      "startDate": "2026-04-01T00:00:00Z",
      "endDate": "2026-05-01T00:00:00Z",
      "autoRenewal": true,
      "processedByRole": "system",
      "notes": "Tự động gia hạn gói Pro",
      "createdAt": "2026-04-01T10:30:00Z",
      "userInfo": {
        "fullName": "Nguyễn Văn A",
        "email": "user@example.com",
        "phone": "0123456789"
      }
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

#### 2. Lấy Thống Kê Giao Dịch
```
GET /api/admin/subscription-transactions/stats
```

**Response:**
```json
{
  "totalTransactions": 150,
  "totalAmount": 75000000,
  "completedTransactions": 140,
  "completedAmount": 70000000,
  "failedTransactions": 5,
  "pendingTransactions": 5,
  "autoRenewalCount": 100,
  "manualUpgradeCount": 50,
  "byPlan": {
    "basic": { "count": 50, "amount": 9950000 },
    "pro": { "count": 80, "amount": 39920000 },
    "enterprise": { "count": 20, "amount": 39980000 }
  },
  "byPaymentMethod": {
    "auto_payment": { "count": 100, "amount": 50000000 },
    "bank_transfer": { "count": 40, "amount": 20000000 },
    "cash": { "count": 10, "amount": 5000000 }
  }
}
```

#### 3. Lấy Chi Tiết Giao Dịch
```
GET /api/admin/subscription-transactions/:id
```

#### 4. Cập Nhật Trạng Thái Thanh Toán
```
PUT /api/admin/subscription-transactions/:id/status
```

**Body:**
```json
{
  "paymentStatus": "completed",
  "transactionReference": "TXN123456",
  "notes": "Đã xác nhận thanh toán"
}
```

#### 5. Lấy Danh Sách Gói Sắp Hết Hạn
```
GET /api/admin/subscription-transactions/expiring/list
```

#### 6. Lấy Danh Sách Gói Đã Hết Hạn
```
GET /api/admin/subscription-transactions/expired/list
```

#### 7. Chạy Tự Động Gia Hạn (Manual Trigger)
```
POST /api/admin/subscription-transactions/auto-renewal/run
```

#### 8. Đánh Dấu Gói Hết Hạn
```
POST /api/admin/subscription-transactions/expired/mark
```

## Services

### 1. SubscriptionTransactionService

Quản lý CRUD operations cho giao dịch gói dịch vụ:
- `createTransaction()`: Tạo giao dịch mới
- `getTransactions()`: Lấy danh sách với filter
- `getTransactionStats()`: Lấy thống kê
- `updatePaymentStatus()`: Cập nhật trạng thái thanh toán

### 2. AutoRenewalService

Xử lý tự động gia hạn gói dịch vụ:
- `getExpiringSubscriptions()`: Lấy gói sắp hết hạn (24h)
- `processAutoRenewal()`: Xử lý gia hạn cho 1 user
- `runAutoRenewalProcess()`: Chạy toàn bộ quy trình
- `markSubscriptionsAsExpired()`: Đánh dấu gói hết hạn

### 3. ScheduledAutoRenewalService

Service chạy định kỳ (mỗi 24h) để tự động gia hạn:
- Tự động khởi động khi server start
- Chạy background process
- Graceful shutdown khi server stop

## Tích Hợp Với Hệ Thống Hiện Tại

### 1. Subscription Routes

Đã tích hợp vào `/api/subscription/upgrade` để tự động lưu lịch sử khi:
- User nâng cấp gói thủ công
- Bật/tắt auto-renewal

### 2. Auto-Renewal Process

Hệ thống tự động chạy mỗi 24h để:
1. Kiểm tra gói sắp hết hạn (trong 24h tới)
2. Xử lý tự động gia hạn cho gói có `auto_renewal = true`
3. Lưu lịch sử giao dịch với `transaction_type = 'auto_renewal'`
4. Đánh dấu gói đã hết hạn

### 3. Phân Quyền

Chỉ có các role sau mới truy cập được Admin APIs:
- `owner`: Toàn quyền
- `company_manager`: Xem và chỉnh sửa
- `store_manager`: Không có quyền
- `salesperson`: Không có quyền

## Migration

Chạy migration để tạo bảng:

```bash
# Chạy migration SQL
npm run migration -- scripts/migrations/create-subscription-transactions-table.sql
```

## Cron Job Setup

### Option 1: Sử dụng Built-in Service (Recommended)

Service đã tự động khởi động khi server start. Không cần setup thêm.

### Option 2: External Cron Job

```bash
# Thêm vào crontab để chạy mỗi ngày lúc 2:00 AM
0 2 * * * cd /path/to/backend && npm run auto-renewal

# Hoặc chạy script trực tiếp
0 2 * * * cd /path/to/backend && npx ts-node scripts/create-auto-renewal-cron.ts
```

## Monitoring & Logging

### 1. Console Logs

Tất cả hoạt động được log với prefix:
- `[SubscriptionTransaction]`: CRUD operations
- `[AutoRenewal]`: Auto-renewal process
- `[ScheduledAutoRenewal]`: Scheduled service

### 2. Audit Logs

Tất cả giao dịch được ghi vào bảng `AuditLogs` với:
- `action`: subscription_auto_renewal, subscription_upgrade
- `entity_type`: subscription
- `details`: JSON với thông tin chi tiết

### 3. Error Handling

- Lỗi auto-renewal được log và không làm crash server
- Failed transactions được lưu với `payment_status = 'failed'`
- Retry mechanism cho network errors

## Ví Dụ Sử Dụng

### 1. Xem Lịch Sử Giao Dịch Của User

```javascript
// GET /api/admin/subscription-transactions?userId=user-123&limit=10
const response = await fetch('/api/admin/subscription-transactions?userId=user-123');
const data = await response.json();
console.log(data.transactions);
```

### 2. Xem Thống Kê Tháng Này

```javascript
const fromDate = new Date();
fromDate.setDate(1); // Đầu tháng
const toDate = new Date(); // Hôm nay

const response = await fetch(`/api/admin/subscription-transactions/stats?fromDate=${fromDate.toISOString()}&toDate=${toDate.toISOString()}`);
const stats = await response.json();
console.log('Doanh thu tháng này:', stats.completedAmount);
```

### 3. Chạy Auto-Renewal Thủ Công

```javascript
const response = await fetch('/api/admin/subscription-transactions/auto-renewal/run', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + token }
});
const result = await response.json();
console.log('Processed:', result.result.processed);
```

## Troubleshooting

### 1. Auto-Renewal Không Chạy

Kiểm tra:
- Service có đang chạy: Check console logs khi server start
- Database connection
- User có `auto_renewal = 1` và `subscription_status = 'active'`

### 2. Giao Dịch Không Được Lưu

Kiểm tra:
- Bảng `SubscriptionTransactions` đã được tạo
- Foreign key constraints
- Database permissions

### 3. API Trả Về 403 Forbidden

Kiểm tra:
- User có role `owner` hoặc `company_manager`
- Permission middleware hoạt động đúng
- JWT token hợp lệ

## Tính Năng Tương Lai

1. **Email Notifications**: Gửi email khi auto-renewal thành công/thất bại
2. **Payment Gateway Integration**: Tích hợp với VNPay, MoMo
3. **Subscription Analytics**: Dashboard thống kê chi tiết
4. **Webhook Support**: Callback URLs cho external systems
5. **Multi-currency Support**: Hỗ trợ nhiều loại tiền tệ