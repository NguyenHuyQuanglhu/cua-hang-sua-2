# Hệ thống Thông báo & Nhắc nhở

## Tổng quan

Hệ thống thông báo tự động giúp người dùng theo dõi các sự kiện quan trọng trong cửa hàng:
- Cảnh báo tồn kho thấp
- Nhắc nhở công nợ khách hàng
- Thông báo ca làm việc sắp kết thúc
- Lịch sử hoạt động

## Cấu trúc Database

### Bảng Notifications

```sql
CREATE TABLE Notifications (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    store_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NULL,  -- NULL = thông báo cho tất cả users trong store
    type NVARCHAR(50) NOT NULL,     -- 'low_stock', 'debt_reminder', 'shift_ending', 'activity'
    title NVARCHAR(255) NOT NULL,
    message NVARCHAR(MAX) NOT NULL,
    data NVARCHAR(MAX) NULL,        -- JSON data
    is_read BIT DEFAULT 0,
    priority NVARCHAR(20) DEFAULT 'normal',  -- 'low', 'normal', 'high', 'urgent'
    action_url NVARCHAR(500) NULL,
    created_at DATETIME DEFAULT GETDATE(),
    read_at DATETIME NULL,
    expires_at DATETIME NULL,
    FOREIGN KEY (store_id) REFERENCES Stores(id) ON DELETE CASCADE
);
```

## Backend API

### Endpoints

#### GET /api/in-app-notifications
Lấy danh sách thông báo

Query params:
- `page`: Trang hiện tại (default: 1)
- `pageSize`: Số lượng mỗi trang (default: 20)
- `unreadOnly`: Chỉ lấy thông báo chưa đọc (true/false)
- `type`: Lọc theo loại thông báo

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "storeId": "uuid",
      "userId": "uuid",
      "type": "low_stock",
      "title": "Cảnh báo tồn kho thấp",
      "message": "Sản phẩm X chỉ còn 5 sản phẩm",
      "data": { "productId": "uuid", "currentStock": 5 },
      "isRead": false,
      "priority": "high",
      "actionUrl": "/products",
      "createdAt": "2024-01-01T00:00:00Z",
      "readAt": null,
      "expiresAt": null
    }
  ],
  "total": 10,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1
}
```

#### GET /api/in-app-notifications/unread-count
Lấy số lượng thông báo chưa đọc

Response:
```json
{
  "success": true,
  "count": 5
}
```

#### POST /api/in-app-notifications
Tạo thông báo mới

Body:
```json
{
  "userId": "uuid",  // optional, null = all users
  "type": "low_stock",
  "title": "Tiêu đề",
  "message": "Nội dung",
  "data": { "key": "value" },  // optional
  "priority": "high",  // optional
  "actionUrl": "/products",  // optional
  "expiresAt": "2024-12-31T23:59:59Z"  // optional
}
```

#### PUT /api/in-app-notifications/:id/read
Đánh dấu thông báo đã đọc

#### PUT /api/in-app-notifications/read-all
Đánh dấu tất cả thông báo đã đọc

#### DELETE /api/in-app-notifications/:id
Xóa thông báo

## Service tự động

### NotificationGeneratorService

Service chạy mỗi giờ để kiểm tra và tạo thông báo tự động:

#### 1. Kiểm tra tồn kho thấp
- Tìm sản phẩm có tồn kho <= 10
- Tạo thông báo nếu chưa có trong 24h gần nhất
- Priority: HIGH
- Action URL: /products

#### 2. Nhắc nhở công nợ
- Tìm khách hàng có công nợ > 0
- Tạo thông báo nếu chưa có trong 7 ngày gần nhất
- Priority: NORMAL
- Action URL: /reports/debt

#### 3. Cảnh báo ca làm việc sắp kết thúc
- Tìm ca làm việc sẽ kết thúc trong 30 phút
- Tạo thông báo cho user cụ thể
- Priority: HIGH
- Action URL: /shifts

## Frontend Components

### NotificationBell
Component hiển thị icon chuông với badge số lượng thông báo chưa đọc

Features:
- Hiển thị số lượng thông báo chưa đọc
- Polling mỗi 30 giây để cập nhật
- Click để mở dropdown danh sách thông báo

### NotificationList
Component hiển thị danh sách thông báo

Features:
- Hiển thị 20 thông báo gần nhất
- Phân biệt đã đọc/chưa đọc bằng màu nền
- Icon khác nhau theo loại thông báo
- Màu sắc theo mức độ ưu tiên
- Click vào thông báo để:
  - Đánh dấu đã đọc
  - Chuyển đến trang liên quan (nếu có actionUrl)
- Nút "Đánh dấu tất cả đã đọc"
- Nút xóa từng thông báo
- Hiển thị thời gian tương đối (vd: "5 phút trước")

## Cách sử dụng

### 1. Tích hợp vào Header
```tsx
import { NotificationBell } from '@/components/notification-bell'

export function Header() {
  return (
    <header>
      <NotificationBell />
    </header>
  )
}
```

### 2. Tạo thông báo từ code
```typescript
import { apiClient } from '@/lib/api-client'

// Tạo thông báo cho tất cả users trong store
await apiClient.createNotification({
  type: 'activity',
  title: 'Đơn hàng mới',
  message: 'Có đơn hàng mới từ khách hàng X',
  priority: 'normal',
  actionUrl: '/sales'
})

// Tạo thông báo cho user cụ thể
await apiClient.createNotification({
  userId: 'user-uuid',
  type: 'shift_ending',
  title: 'Ca làm việc sắp kết thúc',
  message: 'Ca của bạn sẽ kết thúc trong 30 phút',
  priority: 'high',
  actionUrl: '/shifts'
})
```

## Loại thông báo

### low_stock
- Icon: Package
- Màu: Orange (high priority)
- Tự động tạo mỗi giờ
- Không tạo lại trong 24h

### debt_reminder
- Icon: AlertCircle
- Màu: Blue (normal priority)
- Tự động tạo mỗi giờ
- Không tạo lại trong 7 ngày

### shift_ending
- Icon: Clock
- Màu: Orange (high priority)
- Tự động tạo mỗi giờ
- Chỉ gửi cho user cụ thể
- Không tạo lại trong 1h

### activity
- Icon: Bell
- Màu: Tùy priority
- Tạo thủ công từ code

## Cấu hình

### Thay đổi tần suất kiểm tra
Sửa trong `notification-generator.service.ts`:
```typescript
// Chạy mỗi giờ
this.cronJob = cron.schedule('0 * * * *', async () => {
  // ...
})

// Chạy mỗi 30 phút
this.cronJob = cron.schedule('*/30 * * * *', async () => {
  // ...
})
```

### Thay đổi ngưỡng tồn kho thấp
Sửa trong `checkLowStock()`:
```typescript
HAVING ISNULL(SUM(i.quantity), 0) <= 10  // Thay 10 thành giá trị khác
```

### Thay đổi tần suất polling frontend
Sửa trong `notification-bell.tsx`:
```typescript
const interval = setInterval(fetchUnreadCount, 30000)  // 30 giây
```

## Migration

Chạy migration để tạo bảng Notifications:
```bash
cd backend
npm run migrate create-notifications-table.sql
```

## Khởi động Service

Service tự động khởi động khi start backend server:
```typescript
// src/index.ts
notificationGeneratorService.start()
```

## Testing

### Test API endpoints
```bash
# Lấy danh sách thông báo
curl -H "Authorization: Bearer <token>" \
     -H "x-store-id: <store-id>" \
     http://localhost:3001/api/in-app-notifications

# Lấy số lượng chưa đọc
curl -H "Authorization: Bearer <token>" \
     -H "x-store-id: <store-id>" \
     http://localhost:3001/api/in-app-notifications/unread-count

# Đánh dấu đã đọc
curl -X PUT \
     -H "Authorization: Bearer <token>" \
     -H "x-store-id: <store-id>" \
     http://localhost:3001/api/in-app-notifications/<id>/read
```

## Troubleshooting

### Không nhận được thông báo tự động
1. Kiểm tra service đã start: Xem log `[NotificationGenerator] Service started`
2. Kiểm tra cron job đang chạy: Xem log mỗi giờ
3. Kiểm tra điều kiện tạo thông báo (tồn kho, công nợ, ca làm việc)

### Thông báo không hiển thị
1. Kiểm tra API response trong Network tab
2. Kiểm tra token và store-id trong headers
3. Kiểm tra console log có lỗi không

### Badge không cập nhật
1. Kiểm tra polling có chạy không (mỗi 30s)
2. Kiểm tra API `/unread-count` có trả về đúng không
3. Clear cache và reload trang
