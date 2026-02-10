# Requirements: Thông báo đóng ca sớm

## 1. Tổng quan
Khi quản lý xếp ca cho nhân viên với thời gian cụ thể (ví dụ: 4 tiếng), nếu nhân viên đóng ca sớm hơn thời gian quy định, hệ thống sẽ tự động gửi thông báo đến quản lý của cửa hàng đó.

## 2. User Stories

### US-1: Quản lý xếp ca với thời gian cụ thể
**Là** quản lý cửa hàng  
**Tôi muốn** xếp ca cho nhân viên với thời gian làm việc cụ thể (ví dụ: 4 tiếng, 6 tiếng, 8 tiếng)  
**Để** quản lý lịch làm việc và nhân sự hiệu quả

**Acceptance Criteria:**
- Khi tạo ca, quản lý có thể chọn thời gian làm việc dự kiến (expected_hours)
- Mặc định: 8 tiếng (nếu không chỉ định)
- Có thể chọn: 2, 4, 6, 8, 10, 12 tiếng
- Thời gian dự kiến được lưu vào database

### US-2: Nhân viên đóng ca sớm
**Là** nhân viên  
**Tôi muốn** đóng ca khi hoàn thành công việc  
**Để** kết thúc ca làm việc của mình

**Acceptance Criteria:**
- Nhân viên có thể đóng ca bất cứ lúc nào
- Hệ thống tính toán thời gian làm việc thực tế
- So sánh với thời gian dự kiến

### US-3: Thông báo đóng ca sớm cho quản lý
**Là** quản lý cửa hàng  
**Tôi muốn** nhận thông báo khi nhân viên đóng ca sớm hơn dự kiến  
**Để** theo dõi và quản lý tình hình nhân sự

**Acceptance Criteria:**
- Khi nhân viên đóng ca sớm hơn 30 phút so với dự kiến → Gửi thông báo
- Thông báo gửi đến:
  - Quản lý cửa hàng (store_manager) của cửa hàng đó
  - Company Manager (nếu có)
  - Owner
- Thông báo bao gồm:
  - Tên nhân viên
  - Thời gian dự kiến: X giờ
  - Thời gian thực tế: Y giờ
  - Chênh lệch: Z giờ
  - Lý do (nếu có)
- Lưu log vào AuditLogs

### US-4: Nhân viên nhập lý do đóng ca sớm (tùy chọn)
**Là** nhân viên  
**Tôi muốn** nhập lý do khi đóng ca sớm  
**Để** giải thích với quản lý

**Acceptance Criteria:**
- Khi đóng ca sớm hơn 30 phút, hiển thị dialog hỏi lý do
- Lý do là tùy chọn (có thể bỏ qua)
- Lý do được lưu và gửi kèm trong thông báo

## 3. Business Rules

### BR-1: Ngưỡng đóng ca sớm
- **Đóng ca sớm** = Thời gian thực tế < (Thời gian dự kiến - 30 phút)
- Ví dụ:
  - Dự kiến: 4 tiếng → Đóng ca trước 3.5 tiếng = Đóng ca sớm
  - Dự kiến: 8 tiếng → Đóng ca trước 7.5 tiếng = Đóng ca sớm

### BR-2: Người nhận thông báo
- **Store Manager** của cửa hàng đó (ưu tiên cao nhất)
- **Company Manager** (nếu có)
- **Owner** (luôn nhận)

### BR-3: Không thông báo nếu
- Nhân viên làm đủ hoặc quá thời gian dự kiến
- Chênh lệch < 30 phút
- Ca đã được quản lý phê duyệt đóng sớm trước đó

### BR-4: Thời gian dự kiến mặc định
- Nếu không chỉ định: 8 tiếng
- Có thể thay đổi khi tạo ca hoặc sau khi mở ca

## 4. Technical Requirements

### TR-1: Database Changes
```sql
-- Thêm cột expected_hours vào bảng Shifts
ALTER TABLE Shifts ADD ExpectedHours DECIMAL(5,2) DEFAULT 8.0;

-- Thêm cột early_close_reason
ALTER TABLE Shifts ADD EarlyCloseReason NVARCHAR(500) NULL;
```

### TR-2: API Endpoints

#### POST /api/shifts/start
**Request:**
```json
{
  "startingCash": 500000,
  "expectedHours": 4.0  // Mới thêm
}
```

#### POST /api/shifts/:id/close
**Request:**
```json
{
  "endingCash": 1200000,
  "earlyCloseReason": "Hoàn thành công việc sớm"  // Tùy chọn
}
```

**Logic:**
1. Tính thời gian làm việc thực tế
2. So sánh với expected_hours
3. Nếu đóng sớm > 30 phút:
   - Tạo notification cho quản lý
   - Lưu audit log
   - Lưu lý do (nếu có)

#### GET /api/shifts/early-close-reports
**Response:**
```json
{
  "reports": [
    {
      "shiftId": "shift-id",
      "employeeName": "Nguyễn Văn A",
      "expectedHours": 4.0,
      "actualHours": 3.2,
      "difference": -0.8,
      "reason": "Hoàn thành công việc sớm",
      "closedAt": "2024-01-15T14:30:00Z"
    }
  ]
}
```

### TR-3: Notification Format
```json
{
  "type": "early_shift_close",
  "title": "Nhân viên đóng ca sớm",
  "message": "Nguyễn Văn A đã đóng ca sớm. Dự kiến: 4.0 giờ, Thực tế: 3.2 giờ, Chênh lệch: -0.8 giờ. Lý do: Hoàn thành công việc sớm.",
  "relatedId": "shift-id",
  "priority": "medium"
}
```

## 5. UI/UX Requirements

### UX-1: Khi mở ca
- Thêm dropdown chọn thời gian dự kiến:
  - 2 tiếng
  - 4 tiếng
  - 6 tiếng
  - 8 tiếng (mặc định)
  - 10 tiếng
  - 12 tiếng
- Hiển thị: "Thời gian làm việc dự kiến: X tiếng"

### UX-2: Trong ca làm việc
- Hiển thị progress bar: "Đã làm X/Y tiếng"
- Màu sắc:
  - Xanh: Đang trong thời gian dự kiến
  - Vàng: Gần đủ thời gian (> 90%)
  - Xanh lá: Đã đủ thời gian

### UX-3: Khi đóng ca sớm
```
⚠️ Đóng ca sớm hơn dự kiến

Bạn đang đóng ca sớm hơn 48 phút so với dự kiến.
- Thời gian dự kiến: 4.0 giờ
- Thời gian thực tế: 3.2 giờ

Lý do đóng ca sớm (tùy chọn):
┌─────────────────────────────────────┐
│ Ví dụ: Hoàn thành công việc sớm... │
│                                     │
└─────────────────────────────────────┘

ℹ️ Quản lý sẽ nhận được thông báo về việc đóng ca sớm này.

[Hủy] [Xác nhận đóng ca]
```

### UX-4: Thông báo cho quản lý
```
🔔 Nhân viên đóng ca sớm

Nguyễn Văn A đã đóng ca sớm tại Cửa hàng A

📊 Chi tiết:
• Thời gian dự kiến: 4.0 giờ
• Thời gian thực tế: 3.2 giờ
• Chênh lệch: -0.8 giờ (48 phút)
• Lý do: Hoàn thành công việc sớm

⏰ Đóng ca lúc: 14:30, 15/01/2024

[Xem chi tiết ca] [Đánh dấu đã đọc]
```

## 6. Edge Cases

### EC-1: Không có thời gian dự kiến
- Sử dụng mặc định: 8 tiếng
- Không gửi thông báo nếu ca cũ (trước khi có tính năng này)

### EC-2: Đóng ca quá sớm (< 1 tiếng)
- Hiển thị cảnh báo đặc biệt
- Yêu cầu lý do bắt buộc
- Gửi thông báo ưu tiên cao

### EC-3: Không có quản lý cửa hàng
- Gửi cho Company Manager
- Nếu không có → Gửi cho Owner

### EC-4: Nhân viên đóng ca đúng giờ hoặc muộn
- Không hiển thị dialog lý do
- Không gửi thông báo
- Vẫn lưu thời gian thực tế

## 7. Success Metrics

- **Tỷ lệ đóng ca sớm**: < 10% tổng số ca
- **Thời gian phản hồi của quản lý**: < 30 phút
- **Tỷ lệ nhân viên nhập lý do**: > 70%

## 8. Out of Scope (Không làm trong phase này)

- Tự động phê duyệt/từ chối đóng ca sớm
- Tính lương theo thời gian thực tế (vẫn tính theo thời gian làm việc)
- Thống kê chi tiết về đóng ca sớm
- Cảnh báo trước khi đóng ca sớm (chỉ thông báo sau khi đóng)

## 9. Dependencies

- Bảng Notifications đã tồn tại (từ Task 6)
- Bảng AuditLogs đã tồn tại
- Bảng Shifts đã tồn tại

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Quá nhiều thông báo spam | High | Chỉ gửi khi chênh lệch > 30 phút |
| Nhân viên không nhập lý do | Medium | Lý do là tùy chọn, không bắt buộc |
| Quản lý không xem thông báo | Medium | Lưu log để xem lại sau |
| Tính toán sai thời gian | High | Test kỹ logic tính toán |
