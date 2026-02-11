# Tích hợp Thanh toán với Lịch sử Thu Chi

## Tổng quan

Khi ghi nhận thanh toán công nợ từ khách hàng, hệ thống sẽ tự động tạo bản ghi trong lịch sử thu chi (CashTransactions).

## Luồng xử lý

### 1. Thanh toán từ Khách hàng (Customer Payments)

Khi tạo payment qua API `POST /api/payments`:

1. Lưu thông tin thanh toán vào bảng `Payments`
2. Tự động tạo bản ghi thu tiền trong bảng `CashTransactions`:
   - **Loại**: `thu` (thu tiền)
   - **Danh mục**: `Thu tiền khách hàng`
   - **Số tiền**: Số tiền thanh toán
   - **Lý do**: Ghi chú từ payment hoặc "Thu tiền từ khách hàng: [Tên KH]"
   - **Ngày giao dịch**: Ngày thanh toán
   - **Người tạo**: User ID của người ghi nhận thanh toán

### 2. Thanh toán cho Nhà cung cấp (Supplier Payments)

Khi tạo supplier payment qua API `POST /api/supplier-payments`:

1. Lưu thông tin thanh toán vào bảng `SupplierPayments`
2. Cập nhật công nợ trong bảng `PurchaseOrders`
3. Tự động tạo bản ghi chi tiền trong bảng `CashTransactions`:
   - **Loại**: `chi` (chi tiền)
   - **Danh mục**: `Thanh toán nhà cung cấp`
   - **Số tiền**: Số tiền thanh toán
   - **Lý do**: "Thanh toán cho [Tên NCC]" + ghi chú (nếu có)
   - **Ngày giao dịch**: Ngày thanh toán

## Lợi ích

1. **Tự động hóa**: Không cần nhập thủ công vào lịch sử thu chi
2. **Đồng bộ dữ liệu**: Đảm bảo mọi khoản thanh toán đều được ghi nhận trong cash flow
3. **Báo cáo chính xác**: Báo cáo thu chi phản ánh đầy đủ các giao dịch thanh toán
4. **Truy vết**: Có thể liên kết từ cash flow về payment gốc qua `relatedInvoiceId`

## Xử lý lỗi

Nếu việc tạo cash transaction thất bại:
- Payment vẫn được lưu thành công
- Lỗi được ghi log nhưng không làm fail toàn bộ transaction
- Admin có thể tạo cash transaction thủ công nếu cần

## Code Implementation

### Customer Payment (payments.ts)

```typescript
// Create cash flow entry for the payment (income)
await cashTransactionRepository.create(
  {
    storeId,
    type: 'thu',
    transactionDate: paymentDateValue.toISOString(),
    amount: amount,
    reason: cashFlowDescription,
    category: 'Thu tiền khách hàng',
    relatedInvoiceId: payment.id,
    createdBy: userId,
  },
  storeId
);
```

### Supplier Payment (supplier-payments.ts)

```typescript
// Create cash transaction for the payment (expense)
await cashTransactionRepository.create(
  {
    storeId,
    type: 'chi',
    transactionDate: paymentDateValue.toISOString(),
    amount: amount,
    reason: `Thanh toán cho ${supplierName}${notes ? ` - ${notes}` : ''}`,
    category: 'Thanh toán nhà cung cấp',
    relatedInvoiceId: paymentId,
  },
  storeId
);
```

## Testing

Để test tính năng:

1. Vào trang "Báo cáo công nợ khách hàng"
2. Nhấn "Thanh toán" cho một khách hàng có nợ
3. Nhập số tiền và ghi chú
4. Lưu thanh toán
5. Kiểm tra trang "Lịch sử thu chi" - sẽ thấy bản ghi mới với:
   - Loại: Thu
   - Danh mục: Thu tiền khách hàng
   - Số tiền: Số tiền vừa thanh toán
   - Lý do: Ghi chú hoặc "Thu tiền từ khách hàng: [Tên]"

## Ngày cập nhật

2025-02-11
