# Sửa Lỗi: Tồn Kho Không Cập Nhật Sau Khi Nhập Hàng

## Vấn Đề

Sau khi nhập hàng thành công qua chức năng "Nhập nhanh", số lượng tồn kho của sản phẩm không tăng lên trên giao diện người dùng, mặc dù:
- Đơn nhập hàng được tạo thành công
- Database được cập nhật đúng
- Không có lỗi nào được báo cáo

## Nguyên Nhân

### 1. Cấu Trúc Dữ Liệu

Hệ thống lưu trữ tồn kho ở 2 nơi:
- **`Products.stock_quantity`**: Tồn kho tổng của sản phẩm
- **`ProductInventory.Quantity`**: Tồn kho theo từng đơn vị (hỗ trợ multi-unit)

### 2. Logic Cập Nhật

Khi tạo đơn nhập hàng, code backend đã cập nhật đúng cả 2 bảng:

```typescript
// Update ProductInventory
if (existingInventory) {
  await transactionQuery(
    transaction,
    `UPDATE ProductInventory SET Quantity = Quantity + @quantity, UpdatedAt = GETDATE() WHERE Id = @id`,
    { id: existingInventory.Id, quantity: baseQuantity }
  );
} else {
  await transactionInsert(transaction, 'ProductInventory', {
    Id: crypto.randomUUID(),
    ProductId: item.productId,
    StoreId: storeId,
    UnitId: baseUnitId,
    Quantity: baseQuantity,
    CreatedAt: now,
    UpdatedAt: now,
  });
}

// Update Products.stock_quantity
await transactionQuery(
  transaction,
  `UPDATE Products SET stock_quantity = stock_quantity + @quantity, updated_at = GETDATE() WHERE id = @productId AND store_id = @storeId`,
  { productId: item.productId, storeId, quantity: baseQuantity }
);
```

### 3. Vấn Đề Ở Stored Procedure

Stored procedure `sp_Products_GetByStore` và `sp_Products_GetById` được sử dụng để lấy danh sách sản phẩm. Chúng tính `currentStock` bằng cách JOIN với `ProductInventory`:

**Code CŨ (SAI):**
```sql
SELECT 
    p.*,
    ISNULL(pi.Quantity, p.stock_quantity) AS currentStock
FROM Products p
LEFT JOIN ProductInventory pi ON p.id = pi.ProductId AND pi.StoreId = @storeId
```

**Vấn đề:**
- Nếu có NHIỀU records trong `ProductInventory` với các `UnitId` khác nhau, JOIN chỉ lấy 1 record đầu tiên
- Điều này dẫn đến `currentStock` không phản ánh đúng tổng tồn kho

**Ví dụ:**
```
Product A có:
- ProductInventory record 1: UnitId = "hop", Quantity = 10
- ProductInventory record 2: UnitId = "cai", Quantity = 5

JOIN chỉ lấy 1 record → currentStock = 10 (SAI!)
Đúng phải là: currentStock = 15
```

## Giải Pháp

Thay đổi stored procedures để SUM tất cả các records trong `ProductInventory`:

**Code MỚI (ĐÚNG):**
```sql
SELECT 
    p.*,
    ISNULL((SELECT SUM(Quantity) FROM ProductInventory WHERE ProductId = p.id AND StoreId = @storeId), p.stock_quantity) AS currentStock
FROM Products p
```

**Lợi ích:**
- Tính tổng TẤT CẢ các records trong `ProductInventory`
- Hỗ trợ đúng multi-unit inventory
- Fallback về `stock_quantity` nếu không có record nào trong `ProductInventory`

## Các File Đã Thay Đổi

### 1. `backend/scripts/stored-procedures/products-module.sql`
- Cập nhật `sp_Products_GetByStore`
- Cập nhật `sp_Products_GetById`

### 2. `backend/scripts/update-products-sp.ts` (MỚI)
- Script để deploy stored procedures đã cập nhật
- Chạy: `npx ts-node scripts/update-products-sp.ts`

## Cách Kiểm Tra

### 1. Kiểm tra database trực tiếp:

```sql
-- Xem tồn kho trong Products
SELECT id, name, stock_quantity FROM Products WHERE id = 'product-id';

-- Xem tồn kho trong ProductInventory
SELECT ProductId, UnitId, Quantity FROM ProductInventory WHERE ProductId = 'product-id';

-- Xem kết quả từ stored procedure
EXEC sp_Products_GetById @id = 'product-id', @storeId = 'store-id';
```

### 2. Kiểm tra qua UI:

1. Vào trang "Nhập nhanh - Tồn kho thấp"
2. Chọn một sản phẩm có tồn kho thấp
3. Nhập hàng với số lượng cụ thể
4. Làm mới trang
5. Kiểm tra số tồn kho đã tăng đúng

### 3. Kiểm tra qua API:

```bash
# Get low stock products
curl -H "Authorization: Bearer <token>" \
     -H "X-Store-Id: <store-id>" \
     http://localhost:3001/api/products/low-stock?threshold=10

# Get product details
curl -H "Authorization: Bearer <token>" \
     -H "X-Store-Id: <store-id>" \
     http://localhost:3001/api/products/<product-id>
```

## Deployment

### Development:
```bash
cd backend
npx ts-node scripts/update-products-sp.ts
```

### Production:
```bash
# Option 1: Run the TypeScript script
cd backend
npx ts-node scripts/update-products-sp.ts

# Option 2: Execute SQL directly
# Connect to SQL Server and run:
# backend/scripts/stored-procedures/products-module.sql
```

## Lưu Ý

1. **Backup trước khi deploy**: Luôn backup database trước khi thay đổi stored procedures
2. **Test trên staging**: Test kỹ trên môi trường staging trước khi deploy production
3. **Monitor sau deploy**: Theo dõi logs và kiểm tra tồn kho sau khi deploy
4. **Rollback plan**: Giữ lại version cũ của stored procedures để rollback nếu cần

## Tác Động

- ✅ Tồn kho hiển thị đúng sau khi nhập hàng
- ✅ Hỗ trợ đúng multi-unit inventory
- ✅ Không ảnh hưởng đến các chức năng khác
- ✅ Không cần thay đổi code application
- ✅ Backward compatible

## Related Issues

- Chức năng nhập nhanh: `QUICK_IMPORT_FEATURE.md`
- Multi-unit inventory: `INVENTORY_CALCULATION_FIX.md`
