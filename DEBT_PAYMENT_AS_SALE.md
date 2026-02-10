# 💰 Thanh Toán Nợ Lưu Vào Bán Hàng

## 🎯 Thay Đổi Mới

**Trước đây:**
- Thanh toán nợ riêng → Chỉ tạo payment record
- Không có trong danh sách bán hàng
- Khó theo dõi và báo cáo

**Bây giờ:**
- Thanh toán nợ riêng → Tạo sale record (đơn hàng)
- Hiển thị trong danh sách bán hàng
- Dễ theo dõi, báo cáo, và kiểm tra

## 📊 Cách Hoạt Động

### Khi Thanh Toán Nợ Riêng (Không Mua Hàng)

**Hệ thống tạo một sale record đặc biệt:**

```json
{
  "invoiceNumber": "PN2026021000XX",
  "customerId": "uuid",
  "shiftId": "uuid",
  "totalAmount": 0,           // Không có sản phẩm
  "finalAmount": 0,           // Không có sản phẩm
  "customerPayment": 1500000, // Tiền khách đưa
  "previousDebt": 1500000,    // Nợ được thanh toán
  "remainingDebt": 0,         // Nợ còn lại = 0
  "paymentMethod": "cash",
  "status": "printed",
  "items": []                 // Không có sản phẩm
}
```

### Đặc Điểm Của Sale Thanh Toán Nợ

| Trường | Giá trị | Ý nghĩa |
|--------|---------|---------|
| `totalAmount` | 0 | Không có sản phẩm |
| `finalAmount` | 0 | Không có sản phẩm |
| `previousDebt` | > 0 | Số nợ được thanh toán |
| `customerPayment` | ≥ previousDebt | Tiền khách đưa |
| `remainingDebt` | 0 | Nợ đã trả hết |
| `items` | [] | Mảng rỗng |
| `status` | "printed" | Không cần in hóa đơn |

## 🔍 Nhận Diện Sale Thanh Toán Nợ

### Trong Danh Sách Bán Hàng

**Cách 1: Xem cột "Tổng tiền"**
- Nếu = 0 và có "Nợ cũ" > 0 → Đây là thanh toán nợ

**Cách 2: Xem chi tiết đơn hàng**
- Không có sản phẩm (items = [])
- Có field "Nợ cũ đã thanh toán"

**Cách 3: Xem mã đơn hàng**
- Mã đơn bình thường: PN20260210XXXX
- Có thể thêm prefix riêng nếu cần: DN20260210XXXX (Debt Number)

## 📈 Lợi Ích

### 1. Theo Dõi Dễ Dàng
- Tất cả giao dịch đều ở một nơi
- Không cần vào nhiều trang khác nhau
- Dễ tìm kiếm theo khách hàng, ngày, ca làm việc

### 2. Báo Cáo Chính Xác
- Báo cáo doanh thu: Tách riêng được thanh toán nợ
- Báo cáo ca làm việc: Thấy được tất cả giao dịch
- Báo cáo khách hàng: Lịch sử đầy đủ

### 3. Kiểm Tra Dễ Dàng
- Audit trail đầy đủ
- Có invoice number để tra cứu
- Liên kết với shift và user

### 4. Tích Hợp Tốt
- Cùng workflow với bán hàng thường
- Cùng phương thức thanh toán
- Cùng cách in biên lai (nếu cần)

## 🖼️ Ví Dụ Trong Danh Sách Bán Hàng

```
┌────────────────────────────────────────────────────────────────────┐
│ Danh Sách Bán Hàng                                                │
├──────────────┬──────────────┬──────────────┬──────────┬───────────┤
│ Mã đơn       │ Khách hàng   │ Tổng tiền    │ Nợ cũ    │ Thanh toán│
├──────────────┼──────────────┼──────────────┼──────────┼───────────┤
│ PN2026021001 │ Nguyễn Văn A │ 500,000      │ 0        │ 500,000   │
│ PN2026021002 │ Trần Thị B   │ 0            │ 1,500,000│ 1,500,000 │ ← Thanh toán nợ
│ PN2026021003 │ Lê Văn C     │ 300,000      │ 200,000  │ 500,000   │
│ PN2026021004 │ Phạm Thị D   │ 0            │ 800,000  │ 800,000   │ ← Thanh toán nợ
└──────────────┴──────────────┴──────────────┴──────────┴───────────┘
```

### Chi Tiết Đơn Thanh Toán Nợ (PN2026021002)

```
┌─────────────────────────────────────────────────────────────┐
│ Chi Tiết Đơn Hàng: PN2026021002                            │
├─────────────────────────────────────────────────────────────┤
│ Khách hàng: Trần Thị B                                     │
│ Ngày: 10/02/2026 14:30                                     │
│ Ca làm việc: CA001                                         │
│ Nhân viên: Nguyễn Văn X                                    │
├─────────────────────────────────────────────────────────────┤
│ Sản phẩm:                                                  │
│   (Không có sản phẩm - Thanh toán nợ)                     │
├─────────────────────────────────────────────────────────────┤
│ Tổng tiền hàng:                              0 đ          │
│ Nợ cũ đã thanh toán:                 1,500,000 đ          │
│ Khách thanh toán:                    1,500,000 đ          │
│ Tiền thối lại:                               0 đ          │
├─────────────────────────────────────────────────────────────┤
│ Phương thức: Tiền mặt                                      │
│ Trạng thái: Đã hoàn thành                                  │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Chi Tiết Kỹ Thuật

### Backend Logic

**File:** `backend/src/routes/sales.ts`

```typescript
// Detect debt payment only
const isDebtPaymentOnly = 
  previousDebt > 0 && 
  totalAmount === 0 && 
  (!items || items.length === 0);

if (isDebtPaymentOnly) {
  // Create simple sale record without inventory management
  // - Generate invoice number
  // - Insert into Sales table
  // - Update customer debt
  // - No inventory deduction
}
```

### Frontend Logic

**File:** `frontend/src/app/pos/page.tsx`

```typescript
const processDebtPaymentOnly = async (paymentMethod) => {
  // Create sale with empty items
  const saleData = {
    customerId,
    shiftId,
    totalAmount: 0,
    finalAmount: 0,
    customerPayment,
    previousDebt,
    remainingDebt: 0,
    paymentMethod,
    items: [], // Empty array
  };
  
  await upsertSaleTransaction(saleData);
};
```

## 📊 Báo Cáo

### Lọc Thanh Toán Nợ

**SQL Query:**
```sql
-- Lấy tất cả giao dịch thanh toán nợ
SELECT * FROM Sales
WHERE total_amount = 0 
  AND previous_debt > 0
  AND store_id = @storeId
ORDER BY transaction_date DESC;
```

**Trong UI:**
- Thêm filter "Loại giao dịch"
  - Tất cả
  - Bán hàng (totalAmount > 0)
  - Thanh toán nợ (totalAmount = 0)

### Báo Cáo Ca Làm Việc

Bao gồm cả thanh toán nợ:
```
┌─────────────────────────────────────────────────────┐
│ Báo Cáo Ca Làm Việc - CA001                        │
├─────────────────────────────────────────────────────┤
│ Tổng giao dịch: 10                                 │
│   - Bán hàng: 8 đơn                                │
│   - Thanh toán nợ: 2 đơn                           │
│                                                     │
│ Doanh thu bán hàng: 5,000,000 đ                    │
│ Thu nợ: 2,300,000 đ                                │
│ Tổng thu: 7,300,000 đ                              │
└─────────────────────────────────────────────────────┘
```

## ⚠️ Lưu Ý Quan Trọng

### 1. Không Ảnh Hưởng Tồn Kho
- Sale thanh toán nợ KHÔNG trừ tồn kho
- Vì không có sản phẩm (items = [])
- Backend skip inventory management

### 2. Cập Nhật Công Nợ
- Tự động trừ nợ khách hàng
- Cập nhật `total_debt` và `total_paid`
- Đồng bộ với bảng Customers

### 3. Hiển Thị Trong UI
- Cần thêm logic để phân biệt
- Có thể thêm badge "Thanh toán nợ"
- Hoặc màu sắc khác biệt

### 4. In Biên Lai
- Có thể in biên lai thanh toán nợ
- Template khác với hóa đơn bán hàng
- Hiển thị rõ "BIÊN LAI THANH TOÁN NỢ"

## 🎨 UI Improvements (Tùy Chọn)

### Thêm Badge Trong Danh Sách

```tsx
{sale.totalAmount === 0 && sale.previousDebt > 0 && (
  <Badge variant="secondary">
    💰 Thanh toán nợ
  </Badge>
)}
```

### Màu Sắc Khác Biệt

```tsx
<TableRow 
  className={cn(
    sale.totalAmount === 0 && sale.previousDebt > 0 
      ? "bg-blue-50 dark:bg-blue-950/20" 
      : ""
  )}
>
```

### Filter Riêng

```tsx
<Select value={transactionType} onValueChange={setTransactionType}>
  <SelectItem value="all">Tất cả</SelectItem>
  <SelectItem value="sale">Bán hàng</SelectItem>
  <SelectItem value="debt">Thanh toán nợ</SelectItem>
</Select>
```

## ✅ Checklist Kiểm Tra

Sau khi thanh toán nợ, kiểm tra:

- [ ] Có sale record mới trong bảng Sales
- [ ] Invoice number được tạo đúng format
- [ ] totalAmount = 0
- [ ] finalAmount = 0
- [ ] previousDebt = số nợ đã trả
- [ ] remainingDebt = 0
- [ ] items = [] (rỗng)
- [ ] Nợ khách hàng đã giảm
- [ ] Hiển thị trong danh sách bán hàng
- [ ] Có thể xem chi tiết đơn hàng
- [ ] Liên kết với shift đúng

## 🚀 Future Enhancements

- [ ] Thêm prefix riêng cho thanh toán nợ (DN thay vì PN)
- [ ] Template in biên lai thanh toán nợ riêng
- [ ] Báo cáo chi tiết thu nợ theo thời gian
- [ ] Dashboard widget: "Thu nợ hôm nay"
- [ ] Thống kê: Tỷ lệ khách hàng trả nợ
- [ ] Gửi SMS/Email xác nhận thanh toán nợ

---

**Kết luận:** Thanh toán nợ giờ được lưu như một sale record đặc biệt, giúp quản lý tập trung và báo cáo dễ dàng hơn!
