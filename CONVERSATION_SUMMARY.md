# Tóm tắt các tác vụ đã hoàn thành

## TASK 1: Sửa lỗi đóng ca và thêm quản lý tăng ca ✅
- Sửa lỗi "Failed to fetch" khi đóng ca (đổi status từ 'open' thành 'active')
- Thêm tính năng tăng ca tự động:
  - **7h55p (còn 5 phút nữa đủ 8 tiếng)**: Hỏi nhân viên có muốn tăng ca không
  - **Countdown 3 phút**: Nhân viên có 3 phút để trả lời
  - **Tự động đóng ca**: Nếu không trả lời trong 3 phút, tự động mở dialog đóng ca
  - **12 giờ**: Thông báo tự động đóng ca (giới hạn tối đa)
  - Hiển thị tính lương theo thời gian thực
- Sửa lỗi React ref warning trong FormattedNumberInput
- Sửa lỗi debt-reminder API 500 error
- Thêm cột payment_method vào bảng Payments

**Files:** 
- `frontend/src/app/pos/components/shift-controls.tsx`
- `backend/src/routes/shifts.ts`
- `frontend/src/components/formatted-number-input.tsx`
- `backend/src/routes/debt-reminder.ts`
- `backend/scripts/add-payment-method-column.ts`

---

## TASK 2: Thanh toán nợ tự động khi tích checkbox ✅
- Khi tích "Thanh toán cả nợ cũ" trong POS, hệ thống tự động:
  - Tạo bản ghi trong bảng Payments
  - Cập nhật công nợ khách hàng
  - Hiển thị thông báo xác nhận
- Thêm tham số paymentMethod vào API payments

**Files:**
- `frontend/src/app/pos/page.tsx`
- `backend/src/routes/payments.ts`

---

## TASK 3: Cho phép thanh toán nợ độc lập (không mua hàng) ✅
- Sửa điều kiện disable button: `cart.length === 0 && !includeDebtPayment`
- Thêm hàm `processDebtPaymentOnly()` xử lý thanh toán nợ riêng
- Text button đổi thành "Thanh toán nợ" khi giỏ hàng trống + checkbox tích

**Files:**
- `frontend/src/app/pos/page.tsx`

---

## TASK 4: Lưu thanh toán nợ vào mục bán hàng ✅
- Thay đổi cách xử lý: Tạo bản ghi Sale thay vì chỉ Payment
- Đặc điểm của Sale thanh toán nợ:
  - totalAmount = 0, finalAmount = 0
  - previousDebt = số tiền trả
  - items = [] (mảng rỗng)
  - status = 'printed'
- Backend cho phép items rỗng khi isDebtPaymentOnly = true
- Tạo invoice number (PN format) để theo dõi
- Tự động cập nhật công nợ khách hàng
- KHÔNG ảnh hưởng tồn kho (không có sản phẩm)

**Files:**
- `frontend/src/app/pos/page.tsx` (processDebtPaymentOnly)
- `backend/src/routes/sales.ts` (thêm logic debt payment)

---

## TASK 5: Lọc danh sách bán hàng theo cửa hàng và nhân viên ✅

### Yêu cầu
1. ✅ Hiển thị tên khách hàng, nếu khách lẻ thì hiển thị "Khách lẻ"
2. ✅ Chỉ hiển thị đơn hàng của cửa hàng hiện tại
3. ✅ Mỗi nhân viên chỉ thấy đơn hàng do họ tạo

### Giải pháp
- **Database**: Thêm cột `CreatedBy` vào bảng Sales
- **Stored Procedures**: Cập nhật sp_Sales_Create và sp_Sales_GetByStore
- **Backend**: 
  - Tự động lưu userId khi tạo đơn hàng
  - Lọc đơn hàng theo userId (trừ Owner và Company Manager)
- **Quy tắc**:
  - Nhân viên thường: Chỉ xem đơn hàng của mình
  - Owner/Company Manager: Xem tất cả đơn hàng
  - Lọc theo cửa hàng: Tự động (đã có từ trước)
  - Hiển thị khách hàng: "Khách lẻ" nếu không có tên (đã có từ trước)

### Cách triển khai
```bash
# Bước 1: Chạy migration SQL
# File: backend/scripts/migrations/add-created-by-to-sales.sql

# Bước 2: Deploy stored procedures
cd cua-hang-sua-2/backend
npx tsx scripts/deploy-sales-sp-with-createdby.ts

# Bước 3: Khởi động lại backend
npm run dev
```

**Files:**
- `backend/src/routes/sales.ts` - Thêm lọc theo userId
- `backend/src/services/sales-service.ts` - Lưu createdBy
- `backend/src/repositories/sales-repository.ts` - Thêm createdBy interface
- `backend/src/repositories/sales-sp-repository.ts` - Thêm createdBy mapping
- `backend/scripts/migrations/add-created-by-to-sales.sql` - Migration
- `backend/scripts/stored-procedures/sp_Sales_Create.sql` - Cập nhật SP
- `backend/scripts/stored-procedures/sp_Sales_GetByStore.sql` - Cập nhật SP
- `backend/scripts/add-created-by-to-sales.ts` - Migration script
- `backend/scripts/deploy-sales-sp-with-createdby.ts` - Deploy script

---

## TASK 6: Yêu cầu hủy tăng ca (gửi đến quản lý) ✅

### Tính năng
Nhân viên KHÔNG thể tự ý hủy tăng ca. Khi có việc đột xuất, nhân viên phải gửi yêu cầu hủy tăng ca kèm lý do đến quản lý để phê duyệt.

### Luồng hoạt động
```
1. Nhân viên chấp nhận tăng ca (7h55p)
   ↓
2. Badge "TĂNG CA" + Nút "Yêu cầu hủy tăng ca" xuất hiện
   ↓
3. Nhân viên có việc đột xuất → Bấm "Yêu cầu hủy tăng ca"
   ↓
4. Dialog hiện ra → Nhập lý do (bắt buộc, 1-500 ký tự)
   ↓
5. Bấm "Gửi yêu cầu đến quản lý"
   ↓
6. Hệ thống:
   - Tạo notification cho TẤT CẢ quản lý (Owner, Company Manager, Store Manager)
   - Lưu audit log
   - Toast: "✅ Đã gửi yêu cầu"
   ↓
7. Quản lý nhận notification và xem xét
   ↓
8. Quản lý phê duyệt (TODO - cần làm tiếp)
```

### Giao diện
- **Nút**: "Yêu cầu hủy tăng ca" (màu cam, chỉ hiện khi đang tăng ca)
- **Dialog**: Textarea nhập lý do + gợi ý các lý do thường gặp
- **Notification cho quản lý**: 
  ```
  Tiêu đề: "Yêu cầu hủy tăng ca"
  Nội dung: "[Tên NV] yêu cầu hủy tăng ca. 
            Lý do: [Lý do]. 
            Thời gian làm việc: [X] giờ."
  ```

### Database
- **Bảng Notifications**: Lưu thông báo cho quản lý
- **AuditLogs**: Ghi log mọi yêu cầu

### API
- **POST /api/shifts/cancel-overtime-request**
  - Xác thực shift thuộc nhân viên
  - Tạo notification cho tất cả quản lý
  - Lưu audit log

### TODO - Cần làm tiếp
1. Giao diện quản lý xem notifications
2. API phê duyệt: POST /api/shifts/approve-cancel-overtime
3. Thông báo kết quả cho nhân viên
4. Real-time notifications (WebSocket/polling)

### Cách triển khai
```bash
# Bước 1: Chạy migration
# File: backend/scripts/migrations/create-notifications-table.sql

# Bước 2: Khởi động lại
cd cua-hang-sua-2/backend
npm run dev
```

**Files:**
- `frontend/src/app/pos/components/shift-controls.tsx` - Dialog yêu cầu hủy tăng ca
- `backend/src/routes/shifts.ts` - API endpoint
- `backend/scripts/migrations/create-notifications-table.sql` - Migration

---

## Thông tin hệ thống
- **Backend**: Port 3001
- **Frontend**: Port 3000
- **Database**: SQL Server tại 118.69.126.49
- **Ngôn ngữ UI**: Tiếng Việt

## Lưu ý quan trọng
- Đơn hàng cũ (trước khi có CreatedBy) sẽ có giá trị NULL
- Chỉ Owner và Company Manager mới thấy đơn hàng cũ
- Thanh toán nợ được lưu dưới dạng Sale với items rỗng
- Checkbox "Thanh toán cả nợ cũ" hoạt động cả khi giỏ hàng trống
- Nhân viên KHÔNG thể tự ý hủy tăng ca, phải có sự phê duyệt của quản lý
- Hỏi tăng ca lúc 7h55p (còn 5 phút nữa đủ 8 tiếng)
- Countdown 3 phút để nhân viên trả lời
- Tự động đóng ca nếu không trả lời trong 3 phút
