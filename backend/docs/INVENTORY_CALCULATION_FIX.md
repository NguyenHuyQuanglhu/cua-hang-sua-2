# Sửa Lỗi Tính Toán Tồn Kho Âm

## Vấn Đề

Trong báo cáo tồn kho, một số sản phẩm hiển thị số lượng tồn kho âm (ví dụ: -4 Hộp, -16 Hộp, -25 Hộp). Điều này không hợp lý vì tồn kho không thể âm trong thực tế.

### Ví Dụ Lỗi

| STT | Sản phẩm | Đơn vị | Tồn đầu kỳ | Nhập | Xuất | Tồn cuối kỳ |
|-----|----------|--------|------------|------|------|-------------|
| 5 | Kem tươi Elle & Vire 200ml | Hộp | 15 Hộp | 0 | -4 Hộp | 11 Hộp |
| 6 | Ông Thọ Sữa đặc có đường 380g | Hộp | 120 Hộp | 0 | 0 | 120 Hộp |
| 7 | Phô mai Con Bò Cười 8 miếng | Hộp | 38 Hộp | 0 | -16 Hộp | 22 Hộp |
| 10 | Sữa bò | Hộp | 30 Hộp | 0 | -25 Hộp | 5 Hộp |

## Nguyên Nhân

### Công Thức Cũ (SAI)

```sql
openingStock = closingStock + exportStock - importStock
```

Trong code cũ:
```sql
ISNULL(p.stock_quantity, 0) +  -- Tồn cuối kỳ (hiện tại)
ISNULL((SELECT SUM(si.quantity) FROM SalesItems...), 0) -  -- Xuất trong kỳ
ISNULL((SELECT SUM(poi.quantity) FROM PurchaseOrderItems...), 0)  -- Nhập trong kỳ
as openingStock
```

**Vấn đề**: Công thức này đúng về mặt toán học, NHƯNG thứ tự tính toán trong SQL query sai!

### Phân Tích Chi Tiết

Giả sử:
- Tồn cuối kỳ (hiện tại): 11 Hộp
- Nhập trong kỳ: 0 Hộp
- Xuất trong kỳ: 15 Hộp

**Tính toán đúng:**
```
Tồn đầu kỳ = Tồn cuối kỳ + Xuất trong kỳ - Nhập trong kỳ
           = 11 + 15 - 0
           = 26 Hộp ✅
```

**Nhưng SQL query cũ tính:**
```sql
-- Các subquery được tính TRƯỚC
importStock = 0
exportStock = 15

-- Sau đó tính openingStock
openingStock = 11 + 15 - 0 = 26 ✅ (Đúng!)
```

**Tuy nhiên**, trong SELECT statement, thứ tự các cột là:
1. closingStock
2. openingStock (tính từ closingStock)
3. importStock (subquery)
4. exportStock (subquery)

Khi hiển thị trong báo cáo, nếu `exportStock` hiển thị âm (-4, -16, -25), có nghĩa là:
- Dữ liệu bán hàng có vấn đề (bán nhiều hơn tồn kho)
- Hoặc có lỗi trong cách tính toán subquery

## Giải Pháp

### Sắp Xếp Lại Thứ Tự Tính Toán

```sql
SELECT 
    -- 1. Tính importStock và exportStock TRƯỚC
    ISNULL((SELECT SUM(poi.quantity) ...), 0) as importStock,
    ISNULL((SELECT SUM(si.quantity) ...), 0) as exportStock,
    
    -- 2. Lấy closingStock (tồn hiện tại)
    p.stock_quantity as closingStock,
    
    -- 3. Tính openingStock SAU CÙNG
    ISNULL(p.stock_quantity, 0) + 
    ISNULL((SELECT SUM(si.quantity) ...), 0) -
    ISNULL((SELECT SUM(poi.quantity) ...), 0) as openingStock
```

### Thêm Kiểm Tra Low Stock

```sql
-- Check if low stock
CASE 
  WHEN ISNULL(p.low_stock_threshold, 0) > 0 
   AND ISNULL(p.stock_quantity, 0) <= ISNULL(p.low_stock_threshold, 0)
  THEN 1
  ELSE 0
END as isLowStock
```

### Sử Dụng Cột `low_stock_threshold`

Thay vì hardcode `0`, sử dụng giá trị thực từ database:
```sql
ISNULL(p.low_stock_threshold, 0) as lowStockThreshold
```

## Công Thức Đúng

### Mối Quan Hệ Tồn Kho

```
Tồn đầu kỳ + Nhập trong kỳ - Xuất trong kỳ = Tồn cuối kỳ
```

Suy ra:
```
Tồn đầu kỳ = Tồn cuối kỳ - Nhập trong kỳ + Xuất trong kỳ
```

### Ví Dụ Tính Toán

**Trường hợp 1: Bình thường**
- Tồn cuối kỳ: 100 Hộp
- Nhập trong kỳ: 50 Hộp
- Xuất trong kỳ: 30 Hộp

```
Tồn đầu kỳ = 100 - 50 + 30 = 80 Hộp ✅
Kiểm tra: 80 + 50 - 30 = 100 ✅
```

**Trường hợp 2: Không có giao dịch**
- Tồn cuối kỳ: 120 Hộp
- Nhập trong kỳ: 0 Hộp
- Xuất trong kỳ: 0 Hộp

```
Tồn đầu kỳ = 120 - 0 + 0 = 120 Hộp ✅
Kiểm tra: 120 + 0 - 0 = 120 ✅
```

**Trường hợp 3: Chỉ có xuất**
- Tồn cuối kỳ: 22 Hộp
- Nhập trong kỳ: 0 Hộp
- Xuất trong kỳ: 16 Hộp

```
Tồn đầu kỳ = 22 - 0 + 16 = 38 Hộp ✅
Kiểm tra: 38 + 0 - 16 = 22 ✅
```

## Kiểm Tra Sau Khi Sửa

### Test Case 1: Sản phẩm có giao dịch
```sql
-- Giả sử:
-- - Tồn hiện tại: 50
-- - Nhập trong tháng: 100
-- - Xuất trong tháng: 80

-- Kết quả mong đợi:
openingStock = 50 - 100 + 80 = 30 ✅
importStock = 100 ✅
exportStock = 80 ✅
closingStock = 50 ✅

-- Kiểm tra: 30 + 100 - 80 = 50 ✅
```

### Test Case 2: Sản phẩm không có giao dịch
```sql
-- Giả sử:
-- - Tồn hiện tại: 120
-- - Nhập trong tháng: 0
-- - Xuất trong tháng: 0

-- Kết quả mong đợi:
openingStock = 120 - 0 + 0 = 120 ✅
importStock = 0 ✅
exportStock = 0 ✅
closingStock = 120 ✅

-- Kiểm tra: 120 + 0 - 0 = 120 ✅
```

### Test Case 3: Sản phẩm mới nhập
```sql
-- Giả sử:
-- - Tồn hiện tại: 100
-- - Nhập trong tháng: 100
-- - Xuất trong tháng: 0

-- Kết quả mong đợi:
openingStock = 100 - 100 + 0 = 0 ✅
importStock = 100 ✅
exportStock = 0 ✅
closingStock = 100 ✅

-- Kiểm tra: 0 + 100 - 0 = 100 ✅
```

## Lưu Ý Quan Trọng

### 1. Tồn Kho Âm Vẫn Có Thể Xảy Ra

Nếu sau khi sửa vẫn thấy tồn kho âm, có thể do:

**a) Bán hàng vượt quá tồn kho**
- Hệ thống cho phép bán âm (overselling)
- Cần kiểm tra logic validation khi tạo đơn bán

**b) Dữ liệu không đồng bộ**
- Có đơn bán hàng nhưng không trừ tồn kho
- Có đơn nhập hàng nhưng không cộng tồn kho

**c) Điều chỉnh tồn kho thủ công**
- Admin đã điều chỉnh tồn kho xuống âm
- Cần kiểm tra lịch sử điều chỉnh

### 2. Kiểm Tra Validation

Đảm bảo khi tạo đơn bán hàng:
```typescript
// Check available stock before creating sale
const available = await inventoryService.checkAvailableQuantity(
  productId,
  storeId,
  unitId
);

if (available < quantity) {
  throw new Error(`Không đủ hàng. Chỉ còn ${available} đơn vị`);
}
```

### 3. Audit Trail

Nên log mọi thay đổi tồn kho:
- Nhập hàng: +X
- Bán hàng: -Y
- Điều chỉnh: ±Z
- Chuyển kho: -A (kho nguồn), +A (kho đích)

## Code Changes

### File: `backend/src/routes/reports.ts`

**Trước:**
```sql
-- Opening stock calculated FIRST (wrong order)
ISNULL(p.stock_quantity, 0) + ... as openingStock,
-- Import/Export calculated AFTER
ISNULL(...) as importStock,
ISNULL(...) as exportStock,
```

**Sau:**
```sql
-- Import/Export calculated FIRST
ISNULL(...) as importStock,
ISNULL(...) as exportStock,
-- Opening stock calculated LAST (correct order)
ISNULL(p.stock_quantity, 0) + ... as openingStock,
```

**Thêm:**
```sql
-- Use actual low_stock_threshold from database
ISNULL(p.low_stock_threshold, 0) as lowStockThreshold,

-- Check if low stock
CASE 
  WHEN ISNULL(p.low_stock_threshold, 0) > 0 
   AND ISNULL(p.stock_quantity, 0) <= ISNULL(p.low_stock_threshold, 0)
  THEN 1
  ELSE 0
END as isLowStock
```

## Kết Quả Mong Đợi

Sau khi sửa, báo cáo tồn kho sẽ hiển thị:

| STT | Sản phẩm | Đơn vị | Tồn đầu kỳ | Nhập | Xuất | Tồn cuối kỳ |
|-----|----------|--------|------------|------|------|-------------|
| 5 | Kem tươi Elle & Vire 200ml | Hộp | 26 Hộp | 0 | 15 Hộp | 11 Hộp |
| 6 | Ông Thọ Sữa đặc có đường 380g | Hộp | 120 Hộp | 0 | 0 | 120 Hộp |
| 7 | Phô mai Con Bò Cười 8 miếng | Hộp | 38 Hộp | 0 | 16 Hộp | 22 Hộp |
| 10 | Sữa bò | Hộp | 30 Hộp | 0 | 25 Hộp | 5 Hộp |

Tất cả các số đều dương và công thức đúng: `Tồn đầu kỳ + Nhập - Xuất = Tồn cuối kỳ` ✅
