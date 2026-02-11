# Bắt buộc Nhà cung cấp cho Đơn nhập hàng

## Tổng quan

Từ nay, mọi đơn nhập hàng (Purchase Order) đều BẮT BUỘC phải có nhà cung cấp (Supplier). Không cho phép tạo đơn nhập hàng mà không chọn nhà cung cấp.

## Lý do thay đổi

1. **Quản lý tốt hơn**: Cần biết hàng nhập từ đâu để quản lý công nợ, chất lượng
2. **Báo cáo chính xác**: Báo cáo công nợ NCC cần có thông tin đầy đủ
3. **Truy xuất nguồn gốc**: Dễ dàng truy vết nguồn gốc sản phẩm khi có vấn đề
4. **Dữ liệu nhất quán**: Tránh dữ liệu thiếu thông tin quan trọng

## Thay đổi

### Frontend Validation

File: `frontend/src/app/purchases/components/purchase-order-form.tsx`

```typescript
const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1, "Vui lòng chọn nhà cung cấp."), // BẮT BUỘC
  importDate: z.string().min(1, "Ngày nhập là bắt buộc."),
  items: z.array(purchaseOrderItemSchema).min(1, "Đơn nhập phải có ít nhất một sản phẩm."),
  notes: z.string().optional(),
});
```

### Backend Validation

File: `backend/src/routes/purchases.ts`

```typescript
// Validate required fields
if (!supplierId) {
  res.status(400).json({ error: 'Supplier is required', code: 'VALIDATION_ERROR' });
  return;
}
```

### Hiển thị dữ liệu cũ

Các đơn hàng cũ không có NCC (nếu còn) sẽ hiển thị: `[Chưa có NCC]`

File: `backend/src/repositories/purchase-order-repository.ts`

```sql
SELECT po.*, ISNULL(s.name, N'[Chưa có NCC]') as supplier_name, ...
```

## Dọn dẹp dữ liệu mẫu

Đã xóa 16 đơn nhập hàng không có nhà cung cấp (dữ liệu mẫu không hợp lệ):

```
Script: backend/scripts/delete-purchases-without-supplier.ts
Kết quả: 
- Đã xóa: 16 purchase orders
- Đã xóa: Purchase lots, items, supplier payments liên quan
- Còn lại: 0 purchase orders without supplier
```

### Các đơn đã xóa:

- PN2026010001, PN2026010003, PN2026010004, PN2026010005
- PN2026010006, PN2026010011, PN2026010013, PN2026010014
- PN2026010015 (2 đơn trùng số), PN2026010021, PN2026010023, PN2026010024
- PN2026020001, PN2026020002, PN2026020003

## Hướng dẫn sử dụng

### Tạo đơn nhập hàng mới

1. Vào trang "Nhập hàng"
2. Nhấn "Tạo đơn nhập hàng"
3. **BẮT BUỘC**: Chọn nhà cung cấp từ dropdown
4. Chọn ngày nhập
5. Thêm sản phẩm
6. Lưu đơn

Nếu không chọn nhà cung cấp, hệ thống sẽ hiển thị lỗi: "Vui lòng chọn nhà cung cấp."

### Nếu chưa có nhà cung cấp

1. Vào trang "Nhà cung cấp"
2. Nhấn "Thêm nhà cung cấp"
3. Nhập thông tin: Tên, SĐT, Email, Địa chỉ
4. Lưu
5. Quay lại tạo đơn nhập hàng và chọn NCC vừa tạo

## Lợi ích

1. ✅ Dữ liệu đầy đủ, chính xác
2. ✅ Quản lý công nợ NCC tốt hơn
3. ✅ Báo cáo chính xác
4. ✅ Truy xuất nguồn gốc dễ dàng
5. ✅ Không còn dữ liệu "rác"

## Ngày cập nhật

2025-02-11

## Script liên quan

- `backend/scripts/delete-purchases-without-supplier.ts`: Xóa đơn nhập hàng không có NCC
