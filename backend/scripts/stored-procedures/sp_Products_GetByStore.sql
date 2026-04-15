-- =============================================
-- Stored Procedure: sp_Products_GetByStore
-- Description: Retrieves products for a store with optional filters and JOIN ProductInventory (multi-unit support with avg cost per unit)
-- Requirements: 1.4
-- =============================================

IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_Products_GetByStore')
    DROP PROCEDURE sp_Products_GetByStore;
GO

CREATE PROCEDURE sp_Products_GetByStore
    @storeId NVARCHAR(36),
    @status NVARCHAR(20) = NULL,
    @categoryId NVARCHAR(36) = NULL,
    @searchTerm NVARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Get products with aggregated inventory info
    SELECT 
        p.id,
        p.store_id AS storeId,
        p.category_id AS categoryId,
        p.name,
        p.description,
        p.price,
        p.cost_price AS costPrice,
        p.sku,
        p.unit_id AS unitId,
        p.stock_quantity AS stockQuantity,
        p.images,
        p.status,
        p.created_at AS createdAt,
        p.updated_at AS updatedAt,
        c.name AS categoryName,
        -- Get inventory as JSON array with all units
        (
            SELECT 
                pi.UnitId as unitId,
                u.name as unitName,
                pi.Quantity as quantity
            FROM ProductInventory pi
            LEFT JOIN Units u ON pi.UnitId = u.id
            WHERE pi.ProductId = p.id AND pi.StoreId = @storeId AND pi.Quantity > 0
            FOR JSON PATH
        ) AS inventoryUnits,
        -- Get average cost per unit from PurchaseLots
        ISNULL((
            SELECT 
                pl.unit_id as unitId,
                u.name as unitName,
                AVG(pl.cost) as avgCost,
                SUM(pl.remaining_quantity) as totalQty
            FROM PurchaseLots pl
            LEFT JOIN Units u ON pl.unit_id = u.id
            WHERE pl.product_id = p.id AND pl.store_id = @storeId AND pl.remaining_quantity > 0
            GROUP BY pl.unit_id, u.name
            FOR JSON PATH
        ), '[]') AS avgCostByUnit,
        -- Total stock in base unit for sorting/filtering (convert all units to base unit)
        -- Total stock in default base unit for sorting/filtering
        ISNULL((
            SELECT SUM(pi.Quantity)
            FROM ProductInventory pi
            WHERE pi.ProductId = p.id AND pi.StoreId = @storeId AND pi.UnitId = p.unit_id
        ), p.stock_quantity) AS currentStock
    FROM Products p
    LEFT JOIN Categories c ON p.category_id = c.id
    WHERE p.store_id = @storeId
        AND p.status != 'deleted'
        AND (@status IS NULL OR p.status = @status)
        AND (@categoryId IS NULL OR p.category_id = @categoryId)
        AND (@searchTerm IS NULL OR p.name LIKE '%' + @searchTerm + '%' OR p.sku LIKE '%' + @searchTerm + '%')
    ORDER BY p.updated_at DESC, p.created_at DESC;
END
GO
