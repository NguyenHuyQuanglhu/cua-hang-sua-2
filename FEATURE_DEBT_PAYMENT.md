# 💰 Tính Năng: Thanh Toán Nợ Tự Động

## 📋 Mô Tả

Khi bán hàng cho khách hàng có nợ cũ, nhân viên có thể tích checkbox **"Thanh toán cả nợ cũ"** để tự động thanh toán nợ và lưu lịch sử thanh toán.

## 🎯 Luồng Hoạt Động

### 1. Chọn Khách Hàng Có Nợ

Khi chọn khách hàng có nợ cũ trong POS:
- Hệ thống hiển thị số nợ hiện tại
- Hiển thị checkbox: **"Thanh toán cả nợ cũ (XXX đ)"**

### 2. Tích Checkbox Thanh Toán Nợ

Khi tích checkbox:
- ✅ Tự động cộng số tiền nợ vào tổng phải trả
- ✅ Tự động cập nhật "Tiền khách đưa" = Tổng đơn hàng + Nợ cũ
- ✅ Hiển thị rõ ràng tổng phải trả bao gồm nợ

### 3. Thanh Toán

Khi nhấn nút "Thanh toán":
1. **Tạo đơn hàng mới** với thông tin đầy đủ
2. **Tự động tạo payment record** cho nợ cũ với:
   - Số tiền: Đúng bằng số nợ cũ
   - Phương thức: Giống phương thức thanh toán đơn hàng
   - Ghi chú: "Thanh toán nợ cũ cùng đơn hàng [Mã đơn]"
   - Ngày thanh toán: Thời điểm hiện tại

3. **Cập nhật công nợ khách hàng**:
   - Trừ số tiền đã thanh toán
   - Cập nhật tổng nợ mới

### 4. Thông Báo

Sau khi thanh toán thành công:
- Toast chính: "✅ Thanh toán thành công!"
- Toast phụ: "💰 Đã ghi nhận thanh toán nợ: XXX đ"
- Hiển thị trong chi tiết đơn hàng

## 📊 Lịch Sử Thanh Toán

### Xem Lịch Sử

Lịch sử thanh toán nợ được lưu trong bảng `Payments`:
- Truy cập: **Khách hàng** → Chọn khách hàng → Tab **"Lịch sử thanh toán"**
- Hoặc: **Báo cáo** → **Công nợ khách hàng**

### Thông Tin Lưu Trữ

Mỗi payment record bao gồm:
- 📅 Ngày thanh toán
- 💵 Số tiền
- 💳 Phương thức thanh toán (cash, card, transfer, qr, gateway)
- 📝 Ghi chú (liên kết đến đơn hàng nếu có)
- 👤 Nhân viên xử lý (từ shift)

## 🔧 Chi Tiết Kỹ Thuật

### Database Changes

**Table: Payments**
```sql
ALTER TABLE Payments
ADD payment_method NVARCHAR(20) NULL DEFAULT 'cash';
```

Các giá trị payment_method:
- `cash` - Tiền mặt
- `card` - Thẻ
- `transfer` - Chuyển khoản
- `qr` - QR Code
- `gateway` - Cổng thanh toán (VNPay, MoMo, ZaloPay)

### API Endpoint

**POST /api/payments**

Request body:
```json
{
  "customerId": "uuid",
  "amount": 587964200,
  "paymentDate": "2026-02-10T...",
  "paymentMethod": "cash",
  "notes": "Thanh toán nợ cũ cùng đơn hàng PN2026020001"
}
```

Response:
```json
{
  "success": true,
  "payment": {
    "id": "uuid",
    "customerId": "uuid",
    "amount": 587964200,
    "paymentDate": "2026-02-10T...",
    "paymentMethod": "cash",
    "notes": "...",
    "createdAt": "2026-02-10T..."
  }
}
```

### Frontend Logic

File: `frontend/src/app/pos/page.tsx`

```typescript
// Khi thanh toán thành công
if (includeDebtPayment && previousDebt > 0) {
  const paymentData = {
    customerId: selectedCustomerId,
    amount: previousDebt,
    paymentDate: new Date().toISOString(),
    paymentMethod: paymentMethod,
    notes: `Thanh toán nợ cũ cùng đơn hàng ${invoiceNumber}`,
  };

  await apiClient.createPayment(paymentData);
}
```

## ✅ Lợi Ích

### Cho Nhân Viên
- ⚡ Nhanh chóng: Không cần vào trang khách hàng để thanh toán nợ riêng
- 🎯 Chính xác: Tự động tính toán, không sai sót
- 📝 Đầy đủ: Tự động ghi nhận lịch sử

### Cho Quản Lý
- 📊 Báo cáo rõ ràng: Mọi khoản thanh toán đều được ghi nhận
- 🔍 Dễ kiểm tra: Có thể tra cứu lịch sử thanh toán
- 💼 Quản lý công nợ tốt hơn: Khách hàng thanh toán nợ thường xuyên hơn

### Cho Khách Hàng
- 💳 Tiện lợi: Thanh toán nợ cùng lúc với mua hàng
- 📱 Minh bạch: Có lịch sử thanh toán rõ ràng
- 🎁 Động lực: Dễ dàng thanh toán nợ để tiếp tục mua hàng

## 📸 Screenshots

### 1. Checkbox Thanh Toán Nợ
```
┌─────────────────────────────────────────┐
│ Khách cần trả              0            │
│ Nợ cũ                      587,964,200  │
│                                         │
│ ☑ Thanh toán cả nợ cũ (587,964,200)    │
│                                         │
│ Tổng phải trả              587,964,200  │
└─────────────────────────────────────────┘
```

### 2. Toast Thành Công
```
┌─────────────────────────────────────────┐
│ ✅ Thanh toán thành công!               │
│                                         │
│ Đơn hàng PN2026020001 đã được tạo      │
│ Phương thức: Tiền mặt                   │
│ ✓ Đã thanh toán nợ cũ: 587,964,200 đ   │
│                                         │
│                        [In hóa đơn]     │
└─────────────────────────────────────────┘
```

### 3. Lịch Sử Thanh Toán
```
┌──────────────────────────────────────────────────────────┐
│ Lịch Sử Thanh Toán - Nguyễn Văn A                       │
├──────────────┬──────────────┬──────────┬────────────────┤
│ Ngày         │ Số tiền      │ PT       │ Ghi chú        │
├──────────────┼──────────────┼──────────┼────────────────┤
│ 10/02/2026   │ 587,964,200  │ Tiền mặt │ Thanh toán nợ  │
│ 14:30        │              │          │ cùng đơn hàng  │
│              │              │          │ PN2026020001   │
└──────────────┴──────────────┴──────────┴────────────────┘
```

## 🧪 Testing

### Test Case 1: Thanh Toán Nợ Thành Công
1. Chọn khách hàng có nợ: 587,964,200 đ
2. Thêm sản phẩm vào giỏ: 100,000 đ
3. Tích checkbox "Thanh toán cả nợ cũ"
4. Nhập tiền khách đưa: 588,064,200 đ
5. Nhấn "Thanh toán"

**Kết quả mong đợi:**
- ✅ Đơn hàng được tạo
- ✅ Payment record được tạo với amount = 587,964,200
- ✅ Nợ khách hàng = 0
- ✅ Toast hiển thị thông báo thanh toán nợ

### Test Case 2: Không Tích Checkbox
1. Chọn khách hàng có nợ: 587,964,200 đ
2. Thêm sản phẩm: 100,000 đ
3. KHÔNG tích checkbox
4. Thanh toán

**Kết quả mong đợi:**
- ✅ Đơn hàng được tạo
- ✅ KHÔNG tạo payment record
- ✅ Nợ khách hàng vẫn là 587,964,200 đ

### Test Case 3: Khách Hàng Không Có Nợ
1. Chọn khách hàng không có nợ
2. Thêm sản phẩm
3. Thanh toán

**Kết quả mong đợi:**
- ✅ Không hiển thị checkbox thanh toán nợ
- ✅ Thanh toán bình thường

## 🔄 Rollback

Nếu cần rollback tính năng:

```sql
-- Remove payment_method column
ALTER TABLE Payments
DROP COLUMN payment_method;
```

Sau đó revert code changes trong:
- `frontend/src/app/pos/page.tsx`
- `backend/src/routes/payments.ts`

## 📝 Notes

- Tính năng chỉ áp dụng cho khách hàng có tài khoản (không phải khách vãng lai)
- Payment method của thanh toán nợ sẽ giống với payment method của đơn hàng
- Nếu thanh toán nợ thất bại, đơn hàng vẫn được tạo nhưng có cảnh báo
- Có thể xem lịch sử thanh toán trong trang chi tiết khách hàng

## 🚀 Future Enhancements

- [ ] Cho phép thanh toán một phần nợ
- [ ] Gửi SMS/Email thông báo khi thanh toán nợ
- [ ] Tích hợp với loyalty points (tặng điểm khi thanh toán nợ)
- [ ] Báo cáo chi tiết về thanh toán nợ theo thời gian
- [ ] Nhắc nhở tự động khi khách hàng có nợ quá hạn

---

**Phiên bản:** 1.0  
**Ngày tạo:** 10/02/2026  
**Tác giả:** Kiro AI Assistant
