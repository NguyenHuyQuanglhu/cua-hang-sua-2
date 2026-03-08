-- =============================================
-- sp_Inventory_GetAvailable
-- Description: Gets available inventory quantity for a product
-- Requirements: 4.1
-- =============================================

IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_Inventory_GetAvailable')
    DROP PROCEDURE sp_Inventory_GetAvailable;
GO

CREATE PROCEDURE sp_Inventory_GetAvailable
    @productId NVARCHAR(36),
    @storeId NVARCHAR(36),
    @unitId NVARCHAR(36)
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        pi.Id AS id,
        pi.ProductId AS productId,
        pi.StoreId AS storeId,
        pi.UnitId AS unitId,
        ISNULL(pi.Quantity, 0) AS availableQuantity,
        p.name AS productName,
        u.name AS unitName,
        pi.CreatedAt AS createdAt,
        pi.UpdatedAt AS updatedAt
    FROM ProductInventory pi
    INNER JOIN Products p ON pi.ProductId = p.id
    LEFT JOIN Units u ON pi.UnitId = u.id
    WHERE pi.ProductId = @productId 
        AND pi.StoreId = @storeId 
        AND pi.UnitId = @unitId;
    
    -- If no record found, return 0 quantity
    IF @@ROWCOUNT = 0
    BEGIN
        SELECT 
            NULL AS id,
            @productId AS productId,
            @storeId AS storeId,
            @unitId AS unitId,
            0 AS availableQuantity,
            p.name AS productName,
            u.name AS unitName,
            NULL AS createdAt,
            NULL AS updatedAt
        FROM Products p
        LEFT JOIN Units u ON u.id = @unitId
        WHERE p.id = @productId;
    END
END
GO

PRINT 'sp_Inventory_GetAvailable created successfully!';
GO
