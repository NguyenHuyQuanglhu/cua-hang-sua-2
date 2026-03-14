# Tính năng Lưu trữ Lịch sử Thanh toán khi Nhập hàng

## Tổng quan

Hệ thống đã được cập nhật để lưu trữ lịch sử số tiền đã nhập và thu được từ khách hàng (nhà cung cấp) khi nhập hàng.

## Các thay đổi chính

### 1. Frontend - Quick Import Dialog

**File:** `frontend/src/app/purchases/components/quick-import-dialog.tsx`

Đã thêm các trường mới:
- `paidAmount`: Số tiền đã thanh toán cho nhà cung cấp
- `paymentMethod`: Phương thức thanh toán (tiền mặt, chuyển khoản, thẻ)

Giao diện hiển thị:
- Tổng tiền nhập hàng
- Số tiền đã thanh toán
- Số tiền còn nợ (tự động tính)

### 2. Backend - Purchase Routes

**File:** `backend/src/routes/purchases.ts`

Route `/api/purchases/quick` đã được cập nhật để:
- Nhận thêm `paidAmount` và `paymentMethod` từ request
- Validate số tiền thanh toán (không âm, không vượt quá tổng tiền)
- Truyền thông tin thanh toán xuống repository

### 3. Backend - Purchase Order Repository

**File:** `backend/src/repositories/purchase-order-repository.ts`

Phương thức `createWithItems` đã được cập nhật để:

1. **Tính toán trạng thái thanh toán:**
   - `unpaid`: Chưa thanh toán (paidAmount = 0)
   - `partial`: Thanh toán một phần (0 < paidAmount < totalAmount)
   - `paid`: Đã thanh toán đủ (paidAmount >= totalAmount)

2. **Lưu thông tin thanh toán vào PurchaseOrders:**
   - `paid_amount`: Số tiền đã thanh toán
   - `remaining_debt`: Số tiền còn nợ
   - `payment_status`: Trạng thái thanh toán

3. **Tạo bản ghi SupplierPayments:**
   - Chỉ tạo khi `paidAmount > 0` và có `supplierId`
   - Lưu thông tin: số tiền, ngày thanh toán, phương thức, ghi chú
   - Liên kết với `purchase_id` để theo dõi thanh toán cho đơn hàng cụ thể

### 4. Frontend - All Transactions Report

**File:** `frontend/src/app/reports/all-transactions/page.tsx`

Đã cập nhật để hiển thị số tiền đã thanh toán thay vì tổng tiền nhập:
- Card "Đã thanh toán NCC" hiển thị tổng số tiền đã trả cho nhà cung cấp
- Sử dụng `paidAmount` thay vì `totalAmount` khi hiển thị giao dịch nhập hàng
- Thêm mô tả rõ ràng: "Số tiền đã trả cho nhà cung cấp"

### 5. Frontend - Types

**File:** `frontend/src/lib/types.ts`

Đã thêm type alias `Purchase` để tương thích với code cũ:
```typescript
export type Purchase = PurchaseOrder & {
  purchaseDate: string; // Alias for importDate
  invoiceNumber: string; // Alias for orderNumber
  supplierName?: string;
};
```

## Luồng dữ liệu

```
1. User nhập thông tin nhập hàng + thanh toán
   ↓
2. Frontend gửi request với paidAmount, paymentMethod
   ↓
3. Backend tạo PurchaseOrder với:
   - total_amount: Tổng tiền nhập
   - paid_amount: Số tiền đã trả
   - remaining_debt: Số tiền còn nợ
   - payment_status: Trạng thái
   ↓
4. Nếu paidAmount > 0:
   - Tạo bản ghi SupplierPayments
   - Lưu lịch sử thanh toán
   ↓
5. Tạo CashTransaction (chi tiền nhập hàng)
   ↓
6. Báo cáo "Tất Cả Giao Dịch" hiển thị số tiền đã thanh toán
```

## Cấu trúc dữ liệu

### PurchaseOrders Table
```sql
- id: UUID
- order_number: String
- supplier_id: UUID
- total_amount: Decimal
- paid_amount: Decimal (MỚI)
- remaining_debt: Decimal (MỚI)
- payment_status: String (unpaid/partial/paid) (MỚI)
- import_date: DateTime
- notes: String
```

### SupplierPayments Table
```sql
- id: UUID
- store_id: UUID
- supplier_id: UUID
- purchase_id: UUID (liên kết với PurchaseOrders)
- amount: Decimal
- payment_date: DateTime
- payment_method: String (cash/bank_transfer/card)
- notes: String
- created_at: DateTime
```

## Ví dụ sử dụng

### Nhập hàng và thanh toán ngay

```typescript
// Request
POST /api/purchases/quick
{
  "supplierId": "uuid-supplier",
  "productId": "uuid-product",
  "quantity": 10,
  "cost": 50000,
  "unitId": "uuid-unit",
  "importDate": "2024-03-15",
  "paidAmount": 300000,  // Thanh toán 300k
  "paymentMethod": "cash"
}

// Kết quả:
// - PurchaseOrder: total_amount=500000, paid_amount=300000, remaining_debt=200000
// - SupplierPayment: amount=300000, purchase_id=uuid-purchase
// - CashTransaction: type=chi, amount=500000
// - Báo cáo hiển thị: "Đã thanh toán NCC: 300,000đ"
```

### Nhập hàng chưa thanh toán

```typescript
// Request
POST /api/purchases/quick
{
  "supplierId": "uuid-supplier",
  "productId": "uuid-product",
  "quantity": 10,
  "cost": 50000,
  "unitId": "uuid-unit",
  "importDate": "2024-03-15",
  "paidAmount": 0,  // Chưa thanh toán
  "paymentMethod": "cash"
}

// Kết quả:
// - PurchaseOrder: total_amount=500000, paid_amount=0, remaining_debt=500000
// - KHÔNG tạo SupplierPayment
// - CashTransaction: type=chi, amount=500000
// - Báo cáo hiển thị: "Đã thanh toán NCC: 0đ"
```

## Hiển thị trong Báo cáo

### Trang "Tất Cả Giao Dịch"

Card "Đã thanh toán NCC" hiển thị:
- Tổng số tiền đã thanh toán cho nhà cung cấp (paidAmount)
- KHÔNG phải tổng tiền nhập hàng (totalAmount)
- Giúp theo dõi dòng tiền thực tế đã chi ra

Ví dụ:
- Nhập hàng 1: Tổng 1,000,000đ, đã trả 500,000đ
- Nhập hàng 2: Tổng 2,000,000đ, đã trả 2,000,000đ
- Nhập hàng 3: Tổng 500,000đ, đã trả 0đ
- **Card hiển thị: 2,500,000đ** (500k + 2,000k + 0)

## Lợi ích

1. **Theo dõi công nợ chính xác:** Biết được số tiền còn nợ nhà cung cấp cho từng đơn hàng
2. **Lịch sử thanh toán đầy đủ:** Mọi giao dịch thanh toán đều được lưu trong SupplierPayments
3. **Báo cáo tài chính chính xác:** Phân biệt rõ tiền nhập hàng và tiền đã thanh toán
4. **Quản lý dòng tiền:** Biết được số tiền thực tế đã chi ra, không bị nhầm lẫn với công nợ
5. **Báo cáo "Tất Cả Giao Dịch":** Hiển thị đúng số tiền đã thanh toán, giúp quản lý dòng tiền tốt hơn

## Tương lai

Có thể mở rộng thêm:
- Thanh toán nhiều lần cho một đơn hàng
- Nhắc nhở thanh toán công nợ
- Báo cáo công nợ theo nhà cung cấp
- Tích hợp với hệ thống kế toán
- Báo cáo chi tiết về lịch sử thanh toán từng đơn hàng
