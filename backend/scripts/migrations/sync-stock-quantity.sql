-- Sync Products.stock_quantity from ProductInventory
-- This fixes products where stock_quantity was not updated during purchase orders

PRINT 'Starting stock quantity sync...';

-- Update all products to match their ProductInventory sum
UPDATE p
SET p.stock_quantity = ISNULL(inv.total_quantity, 0)
FROM Products p
LEFT JOIN (
    SELECT 
        ProductId,
        StoreId,
        SUM(Quantity) as total_quantity
    FROM ProductInventory
    GROUP BY ProductId, StoreId
) inv ON p.id = inv.ProductId AND p.store_id = inv.StoreId
WHERE p.stock_quantity != ISNULL(inv.total_quantity, 0);

PRINT 'Stock quantity sync completed!';

-- Show products that were updated
SELECT 
    p.name AS [Product Name],
    p.stock_quantity AS [New Stock],
    ISNULL(inv.total_quantity, 0) AS [Calculated Stock]
FROM Products p
LEFT JOIN (
    SELECT 
        ProductId,
        StoreId,
        SUM(Quantity) as total_quantity
    FROM ProductInventory
    GROUP BY ProductId, StoreId
) inv ON p.id = inv.ProductId AND p.store_id = inv.StoreId;
