# Bug Fix: Unit Field Not Populating in Product Edit Form

## Issue Description
When editing a product that already has a unit configured and has existing stock, the unit dropdown field in the edit form was not showing the selected unit. Instead, it showed the placeholder "Chọn đơn vị tính chính" (Select main unit).

## Root Cause
The stored procedures `sp_Products_GetById`, `sp_Products_GetByStore`, and `sp_Products_Create` were missing the `unit_id` field in their SELECT statements. This meant:

1. When fetching a product for editing via `GET /api/products/:id`, the API response did not include `unitId`
2. When the ProductForm component received the product data, `product.unitId` was `undefined`
3. The form's useEffect that resets form values set `unitId: product.unitId || ''`, which resulted in an empty string
4. The Select component couldn't match the empty string to any option, so it showed the placeholder

## Files Modified

### 1. `backend/scripts/stored-procedures/products-module.sql`

#### sp_Products_GetById
Added `p.unit_id AS unitId` to the SELECT statement:

```sql
SELECT 
    p.id,
    p.store_id AS storeId,
    p.category_id AS categoryId,
    p.name,
    p.description,
    p.price,
    p.cost_price AS costPrice,
    p.sku,
    p.unit_id AS unitId,  -- ADDED THIS LINE
    p.stock_quantity AS stockQuantity,
    p.images,
    p.status,
    p.created_at AS createdAt,
    p.updated_at AS updatedAt,
    c.name AS categoryName,
    ISNULL((SELECT SUM(Quantity) FROM ProductInventory WHERE ProductId = p.id AND StoreId = @storeId), p.stock_quantity) AS currentStock
FROM Products p
LEFT JOIN Categories c ON p.category_id = c.id
WHERE p.id = @id AND p.store_id = @storeId;
```

#### sp_Products_GetByStore
Added `p.unit_id AS unitId` to the SELECT statement:

```sql
SELECT 
    p.id,
    p.store_id AS storeId,
    p.category_id AS categoryId,
    p.name,
    p.description,
    p.price,
    p.cost_price AS costPrice,
    p.sku,
    p.unit_id AS unitId,  -- ADDED THIS LINE
    p.stock_quantity AS stockQuantity,
    p.images,
    p.status,
    p.created_at AS createdAt,
    p.updated_at AS updatedAt,
    c.name AS categoryName,
    ISNULL((SELECT SUM(Quantity) FROM ProductInventory WHERE ProductId = p.id AND StoreId = @storeId), p.stock_quantity) AS currentStock
FROM Products p
LEFT JOIN Categories c ON p.category_id = c.id
WHERE p.store_id = @storeId
    AND p.status != 'deleted'
    AND (@status IS NULL OR p.status = @status)
    AND (@categoryId IS NULL OR p.category_id = @categoryId)
    AND (@searchTerm IS NULL OR p.name LIKE '%' + @searchTerm + '%' OR p.sku LIKE '%' + @searchTerm + '%')
ORDER BY p.name ASC;
```

#### sp_Products_Create
Added `p.unit_id AS unitId` to the SELECT statement in the return section:

```sql
SELECT 
    p.id,
    p.store_id AS storeId,
    p.category_id AS categoryId,
    p.name,
    p.description,
    p.price,
    p.cost_price AS costPrice,
    p.sku,
    p.unit_id AS unitId,  -- ADDED THIS LINE
    p.stock_quantity AS stockQuantity,
    p.images,
    p.status,
    p.created_at AS createdAt,
    p.updated_at AS updatedAt,
    c.name AS categoryName,
    ISNULL(pi.Quantity, 0) AS currentStock
FROM Products p
LEFT JOIN Categories c ON p.category_id = c.id
LEFT JOIN ProductInventory pi ON p.id = pi.ProductId AND pi.StoreId = @storeId
WHERE p.id = @id AND p.store_id = @storeId;
```

### 2. `backend/scripts/update-products-sp-unitid.ts`
Created deployment script to update the stored procedures in the database.

## Deployment
Ran the deployment script:
```bash
npx ts-node scripts/update-products-sp-unitid.ts
```

All stored procedures were successfully updated.

## Testing
After deployment:
1. Open the Products page
2. Click "Chỉnh sửa" (Edit) on any product that has a unit configured
3. The unit dropdown should now show the currently selected unit instead of the placeholder
4. The unit field should be disabled if the product has existing purchase lots (to prevent changing the unit after stock has been recorded)

## Impact
- Products can now be edited properly without losing their unit configuration
- The unit field correctly displays the current unit when editing
- The disable logic works correctly: unit can be set initially, but cannot be changed after purchase lots exist

## Related Issues
- User reported: "chỉnh sửa ko lưu đc" (edit doesn't save)
- User reported: "bấm lưu nó không lưu" (clicking save doesn't save)
- User reported: "chức năng chỉnh sửa hinh như không hoạt động" (edit function seems not working)

The issue was not that saving didn't work, but that the form wasn't properly loading the existing unit value, making it appear as if the unit needed to be set again.
