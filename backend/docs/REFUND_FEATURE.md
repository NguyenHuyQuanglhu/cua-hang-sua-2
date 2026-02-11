# Tính năng Hoàn tiền cho Khách hàng

## Tổng quan

Tính năng hoàn tiền cho phép cửa hàng hoàn lại tiền cho khách hàng khi họ trả thừa (công nợ âm).

## Khi nào cần hoàn tiền?

Khách hàng có công nợ âm (số dư âm) xảy ra khi:
1. Khách hàng trả trước cho đơn hàng tương lai
2. Khách hàng chuyển khoản nhầm số tiền lớn hơn
3. Có đơn hàng hoàn trả nhưng khách đã thanh toán trước đó
4. Lỗi nhập liệu trong quá trình ghi nhận thanh toán

## Backend API

### Endpoint: POST /api/payments/refund

Tạo giao dịch hoàn tiền cho khách hàng.

**Request Body:**
```json
{
  "customerId": "uuid",
  "amount": 100000,
  "paymentMethod": "cash",
  "notes": "Hoàn tiền trả thừa"
}
```

**Validation:**
- `amount` phải > 0
- Khách hàng phải tồn tại
- Khách hàng phải có công nợ âm (đã trả thừa)
- Số tiền hoàn không được vượt quá số tiền trả thừa

**Response Success (201):**
```json
{
  "success": true,
  "refund": {
    "id": "uuid",
    "store_id": "uuid",
    "customer_id": "uuid",
    "amount": -100000,
    "payment_date": "2024-01-01T00:00:00Z",
    "payment_method": "cash",
    "notes": "Hoàn tiền trả thừa cho khách hàng Nguyễn Văn A",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "message": "Đã hoàn 100000 cho khách hàng Nguyễn Văn A"
}
```

**Response Error (400):**
```json
{
  "error": "Customer does not have excess payment to refund",
  "currentDebt": 50000
}
```

hoặc

```json
{
  "error": "Refund amount cannot exceed 100000",
  "maxRefundAmount": 100000
}
```

## Cách hoạt động

### 1. Ghi nhận hoàn tiền
- Tạo bản ghi trong bảng `Payments` với `amount` âm
- Ví dụ: Hoàn 100,000đ → amount = -100,000

### 2. Cập nhật công nợ khách hàng
- Gọi stored procedure `sp_Customers_UpdateDebt`
- Tăng công nợ (giảm số dư âm) bằng số tiền hoàn
- Ví dụ: 
  - Trước: Công nợ = -200,000đ (khách trả thừa 200k)
  - Hoàn: 100,000đ
  - Sau: Công nợ = -100,000đ (còn thừa 100k)

### 3. Ghi nhận thu chi
- Tạo bản ghi trong `CashTransactions`
- Loại: `chi` (tiền ra)
- Danh mục: "Hoàn tiền khách hàng"
- Liên kết với ID của refund

## Frontend Components

### RefundDialog Component

Component dialog để nhập thông tin hoàn tiền.

**Props:**
```typescript
interface RefundDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  customer: {
    customerId: string
    customerName: string
    customerPhone?: string
    excessAmount: number // Số tiền khách trả thừa (số dương)
  }
  onSuccess?: () => void
}
```

**Features:**
- Hiển thị số tiền khách trả thừa
- Nhập số tiền hoàn (tối đa = số tiền trả thừa)
- Chọn phương thức hoàn tiền (Tiền mặt, Chuyển khoản, MoMo, ZaloPay)
- Nhập ghi chú
- Validation số tiền
- Toast notification khi thành công/thất bại

### Tích hợp vào Báo cáo Công nợ

Trong trang `/reports/debt`:
- Hiển thị công nợ âm với màu xanh (primary color)
- Nút "Hoàn tiền" xuất hiện khi công nợ < 0
- Click nút → Mở RefundDialog
- Sau khi hoàn tiền thành công → Reload báo cáo

## Ví dụ sử dụng

### Scenario 1: Khách trả thừa 500,000đ

1. Khách hàng mua hàng 1,000,000đ
2. Khách thanh toán 1,500,000đ (nhầm)
3. Công nợ = -500,000đ (hiển thị màu xanh)
4. Nhân viên click "Hoàn tiền"
5. Nhập số tiền: 500,000đ
6. Chọn phương thức: Chuyển khoản
7. Ghi chú: "Hoàn tiền chuyển khoản nhầm"
8. Xác nhận → Hoàn tiền thành công
9. Công nợ = 0đ

### Scenario 2: Hoàn một phần

1. Khách hàng có công nợ = -1,000,000đ
2. Khách muốn giữ lại 500,000đ để mua hàng sau
3. Nhân viên hoàn 500,000đ
4. Công nợ còn lại = -500,000đ
5. Lần mua hàng sau sẽ trừ vào số dư này

## Database Schema

### Bảng Payments

```sql
CREATE TABLE Payments (
    id UNIQUEIDENTIFIER PRIMARY KEY,
    store_id UNIQUEIDENTIFIER NOT NULL,
    customer_id UNIQUEIDENTIFIER NOT NULL,
    amount DECIMAL(18, 2) NOT NULL,  -- Có thể âm cho refund
    payment_date DATETIME NOT NULL,
    payment_method NVARCHAR(50),
    notes NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (store_id) REFERENCES Stores(id),
    FOREIGN KEY (customer_id) REFERENCES Customers(id)
);
```

**Lưu ý:** 
- `amount` > 0: Khách thanh toán (thu tiền)
- `amount` < 0: Hoàn tiền cho khách (chi tiền)

## API Client Usage

```typescript
import { apiClient } from '@/lib/api-client'

// Hoàn tiền cho khách hàng
const response = await apiClient.createRefund({
  customerId: 'customer-uuid',
  amount: 100000,
  paymentMethod: 'bank_transfer',
  notes: 'Hoàn tiền trả thừa'
})

console.log(response.message) // "Đã hoàn 100000 cho khách hàng Nguyễn Văn A"
```

## Báo cáo & Thống kê

### Lịch sử hoàn tiền

Xem trong:
1. **Lịch sử thanh toán khách hàng**: Hiển thị các giao dịch với amount âm
2. **Báo cáo thu chi**: Loại "chi", danh mục "Hoàn tiền khách hàng"
3. **Chi tiết khách hàng**: Tab lịch sử giao dịch

### Tính toán công nợ

Công nợ = Tổng mua hàng - Tổng thanh toán + Tổng hoàn tiền

Ví dụ:
- Tổng mua: 1,000,000đ
- Tổng thanh toán: 1,500,000đ
- Tổng hoàn tiền: 200,000đ
- Công nợ = 1,000,000 - 1,500,000 + 200,000 = -300,000đ

## Security & Validation

### Backend Validation
- Kiểm tra quyền truy cập (authentication + store context)
- Validate amount > 0
- Kiểm tra khách hàng tồn tại
- Kiểm tra công nợ âm
- Kiểm tra số tiền hoàn không vượt quá số dư

### Frontend Validation
- Zod schema validation
- Max amount = excess amount
- Required fields: amount, paymentMethod
- Disable submit khi đang xử lý

## Error Handling

### Common Errors

1. **Customer not found**
   - Status: 404
   - Message: "Customer not found"

2. **No excess payment**
   - Status: 400
   - Message: "Customer does not have excess payment to refund"

3. **Amount exceeds limit**
   - Status: 400
   - Message: "Refund amount cannot exceed {maxAmount}"

4. **Invalid amount**
   - Status: 400
   - Message: "Amount must be greater than 0"

## Testing

### Test Cases

1. **Hoàn tiền thành công**
   - Khách có công nợ -500,000đ
   - Hoàn 300,000đ
   - Kết quả: Công nợ = -200,000đ

2. **Hoàn toàn bộ**
   - Khách có công nợ -500,000đ
   - Hoàn 500,000đ
   - Kết quả: Công nợ = 0đ

3. **Lỗi: Vượt quá số dư**
   - Khách có công nợ -500,000đ
   - Hoàn 600,000đ
   - Kết quả: Error 400

4. **Lỗi: Khách không có số dư thừa**
   - Khách có công nợ 100,000đ (nợ dương)
   - Hoàn tiền
   - Kết quả: Error 400

## Troubleshooting

### Công nợ không cập nhật sau hoàn tiền
1. Kiểm tra stored procedure `sp_Customers_UpdateDebt`
2. Xem log backend: `[Refund] Updated customer debt`
3. Kiểm tra bảng Payments có record với amount âm

### Cash flow không ghi nhận
1. Xem log: `[Refund] Created cash transaction`
2. Kiểm tra bảng CashTransactions
3. Verify loại = 'chi', category = 'Hoàn tiền khách hàng'

### Dialog không mở
1. Kiểm tra điều kiện: `(data.totalDebt || 0) < 0`
2. Verify selectedCustomerForRefund có data
3. Check console log có lỗi không
