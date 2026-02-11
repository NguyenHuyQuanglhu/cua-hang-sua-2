# Tính Năng Tự Động Đóng Ca

## Tổng Quan

Hệ thống tự động đóng ca làm việc cho nhân viên khi đã hết thời gian làm việc được cấu hình. Tính năng này giúp:

- Đảm bảo nhân viên không làm việc quá giờ quy định
- Tự động tính toán và đóng ca khi hết thời gian
- Ghi nhận rõ ràng các ca được đóng tự động

## Cách Hoạt Động

### 1. Cấu Hình Thời Gian Làm Việc

Quản lý có thể cấu hình thời gian làm việc tối đa cho từng nhân viên:

**API Endpoint:**
```
PUT /api/users/:userId/shift-hours
```

**Request Body:**
```json
{
  "maxShiftHours": 8.0
}
```

**Response:**
```json
{
  "success": true,
  "message": "Đã cập nhật thời gian làm việc tối đa cho user@example.com: 8 giờ",
  "maxShiftHours": 8.0
}
```

**Quyền Truy Cập:**
- Owner: Có thể cấu hình cho tất cả nhân viên
- Company Manager: Có thể cấu hình cho Store Manager và Salesperson
- Store Manager: Có thể cấu hình cho Salesperson trong cửa hàng của mình

### 2. Kiểm Tra Tự Động

Service `AutoCloseShiftService` chạy mỗi phút để:

1. Lấy tất cả ca đang active
2. Tính toán số giờ đã làm việc
3. So sánh với `max_shift_hours` của nhân viên
4. Tự động đóng ca nếu đã vượt quá thời gian

### 3. Đóng Ca Tự Động

Khi ca được đóng tự động:

- **ending_cash**: Được tính bằng starting_cash + cash_sales + cash_payments
- **cash_difference**: Được set = 0 (không có chênh lệch)
- **notes**: Thêm ghi chú "[Tự động đóng ca khi hết thời gian]"
- **end_time**: Thời điểm hệ thống đóng ca

## Cấu Trúc Database

### Bảng Users

```sql
ALTER TABLE Users ADD max_shift_hours DECIMAL(5,2) NULL;
```

- **max_shift_hours**: Số giờ làm việc tối đa mỗi ca (mặc định: 8.0)
- Giá trị hợp lệ: 0.1 - 24.0 giờ

### Bảng Shifts

```sql
ALTER TABLE Shifts ADD notes NVARCHAR(500) NULL;
```

- **notes**: Ghi chú về ca làm việc (ví dụ: lý do đóng ca tự động)

## Ví Dụ Sử Dụng

### 1. Cấu Hình Thời Gian Cho Nhân Viên

```bash
# Cấu hình nhân viên làm tối đa 8 giờ/ca
curl -X PUT http://localhost:3001/api/users/user-id-123/shift-hours \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"maxShiftHours": 8.0}'
```

### 2. Kiểm Tra Ca Hiện Tại

```bash
# Lấy thông tin ca đang active
curl http://localhost:3001/api/shifts/active \
  -H "Authorization: Bearer <token>" \
  -H "X-Store-Id: store-id-123"
```

Response sẽ bao gồm:
```json
{
  "id": "shift-id",
  "hoursWorked": 7.5,
  "maxShiftHours": 8.0,
  "isOvertime": false
}
```

### 3. Xem Lịch Sử Ca Đã Đóng

```bash
# Lấy danh sách ca
curl http://localhost:3001/api/shifts \
  -H "Authorization: Bearer <token>" \
  -H "X-Store-Id: store-id-123"
```

Ca được đóng tự động sẽ có `notes` chứa "[Tự động đóng ca khi hết thời gian]"

## Logs

Service ghi log khi:

- Khởi động: `✅ Auto-close shift service đã khởi động`
- Đóng ca: `✅ Đã tự động đóng ca cho [tên nhân viên] (X/Y giờ)`
- Tổng kết: `📊 Đã tự động đóng N ca làm việc`
- Lỗi: `❌ Lỗi khi kiểm tra ca làm việc: [error]`

## Cấu Hình Nâng Cao

### Thay Đổi Tần Suất Kiểm Tra

Mặc định service chạy mỗi phút. Để thay đổi, sửa trong `auto-close-shift.service.ts`:

```typescript
// Chạy mỗi 5 phút
this.cronJob = cron.schedule('*/5 * * * *', async () => {
  // ...
});

// Chạy mỗi 30 giây
this.cronJob = cron.schedule('*/30 * * * * *', async () => {
  // ...
});
```

### Tắt Service

Để tạm tắt service, comment dòng trong `index.ts`:

```typescript
// autoCloseShiftService.start();
```

## Lưu Ý

1. **Thời gian mặc định**: Nếu nhân viên không có `max_shift_hours`, mặc định là 8.0 giờ
2. **Tính toán chính xác**: Hệ thống tính giờ làm việc dựa trên `start_time` của ca
3. **Không mất dữ liệu**: Khi đóng tự động, tất cả doanh thu và tiền mặt đều được tính toán đầy đủ
4. **Audit trail**: Mọi thay đổi về `max_shift_hours` đều được ghi log trong audit logs

## Troubleshooting

### Service không chạy

Kiểm tra logs khi khởi động server:
```
✅ Auto-close shift service đã khởi động
```

Nếu không thấy, kiểm tra:
- File `index.ts` đã import và gọi `autoCloseShiftService.start()`
- Không có lỗi khi khởi động server

### Ca không tự động đóng

Kiểm tra:
1. Nhân viên có `max_shift_hours` được cấu hình chưa
2. Ca đang ở trạng thái `active`
3. Thời gian làm việc đã vượt quá `max_shift_hours` chưa
4. Xem logs để biết lỗi cụ thể

### Cần đóng ca ngay lập tức

Sử dụng API đóng ca thủ công:
```bash
POST /api/shifts/:shiftId/close
```
