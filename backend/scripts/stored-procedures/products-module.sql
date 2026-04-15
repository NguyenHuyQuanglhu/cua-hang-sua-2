-- =============================================
-- Products Module - All Stored Procedures
-- Description: Combined file for all Products-related stored procedures
-- Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
-- =============================================

-- =============================================
-- sp_Products_Create
-- Description: Creates a new product and its corresponding ProductInventory record
-- Requirements: 1.1
-- =============================================

IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_Products_Create')
    DROP PROCEDURE sp_Products_Create;
GO

CREATE PROCEDURE sp_Products_Create
    @id NVARCHAR(36),
    @storeId NVARCHAR(36),
    @categoryId NVARCHAR(36) = NULL,
    @name NVARCHAR(255),
    @description NVARCHAR(MAX) = NULL,
    @price DECIMAL(18,2),
    @costPrice DECIMAL(18,2),
    @sku NVARCHAR(100) = NULL,
    @unitId NVARCHAR(36) = NULL,
    @stockQuantity DECIMAL(18,4) = 0,
    @status NVARCHAR(20) = 'active',
    @images NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Insert into Products table
        INSERT INTO Products (
            id, 
            store_id, 
            category_id, 
            name, 
            description, 
            price, 
            cost_price, 
            sku, 
            stock_quantity, 
            images, 
            status, 
            created_at, 
            updated_at
        )
        VALUES (
            @id, 
            @storeId, 
            @categoryId, 
            @name, 
            @description, 
            @price, 
            @costPrice, 
            @sku, 
            @stockQuantity, 
            @images, 
            @status, 
            GETDATE(), 
            GETDATE()
        );
        
        -- Create ProductInventory record if unitId is provided
        IF @unitId IS NOT NULL
        BEGIN
            INSERT INTO ProductInventory (
                Id, 
                ProductId, 
                StoreId, 
                UnitId, 
                Quantity, 
                CreatedAt, 
                UpdatedAt
            )
            VALUES (
                NEWID(), 
                @id, 
                @storeId, 
                @unitId, 
                @stockQuantity, 
                GETDATE(), 
                GETDATE()
            );
        END
        
        COMMIT TRANSACTION;
        
        -- Return the created product
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
            ISNULL(pi.Quantity, 0) AS currentStock
        FROM Products p
        LEFT JOIN Categories c ON p.category_id = c.id
        LEFT JOIN ProductInventory pi ON p.id = pi.ProductId AND pi.StoreId = @storeId
        WHERE p.id = @id AND p.store_id = @storeId;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        THROW;
    END CATCH
END
GO

-- =============================================
-- sp_Products_Update
-- Description: Updates an existing product with COALESCE for partial updates
-- Requirements: 1.2
-- =============================================

IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_Products_Update')
    DROP PROCEDURE sp_Products_Update;
GO

CREATE PROCEDURE sp_Products_Update
    @id NVARCHAR(36),
    @storeId NVARCHAR(36),
    @categoryId NVARCHAR(36) = NULL,
    @name NVARCHAR(255) = NULL,
    @description NVARCHAR(MAX) = NULL,
    @price DECIMAL(18,2) = NULL,
    @costPrice DECIMAL(18,2) = NULL,
    @sku NVARCHAR(100) = NULL,
    @unitId NVARCHAR(36) = NULL,
    @stockQuantity DECIMAL(18,4) = NULL,
    @status NVARCHAR(20) = NULL,
    @images NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Check if product exists
    IF NOT EXISTS (SELECT 1 FROM Products WHERE id = @id AND store_id = @storeId)
    BEGIN
        RAISERROR('Product not found', 16, 1);
        RETURN;
    END
    
    -- Update product with COALESCE for partial updates
    UPDATE Products SET
        category_id = COALESCE(@categoryId, category_id),
        name = COALESCE(@name, name),
        description = COALESCE(@description, description),
        price = COALESCE(@price, price),
        cost_price = COALESCE(@costPrice, cost_price),
        sku = COALESCE(@sku, sku),
        unit_id = COALESCE(@unitId, unit_id),
        stock_quantity = COALESCE(@stockQuantity, stock_quantity),
        status = COALESCE(@status, status),
        images = COALESCE(@images, images),
        updated_at = GETDATE()
    WHERE id = @id AND store_id = @storeId;
    
    -- Update ProductInventory if stockQuantity is provided
    IF @stockQuantity IS NOT NULL AND @unitId IS NOT NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM ProductInventory WHERE ProductId = @id AND StoreId = @storeId AND UnitId = @unitId)
        BEGIN
            UPDATE ProductInventory 
            SET Quantity = @stockQuantity, UpdatedAt = GETDATE()
            WHERE ProductId = @id AND StoreId = @storeId AND UnitId = @unitId;
        END
        ELSE
        BEGIN
            INSERT INTO ProductInventory (Id, ProductId, StoreId, UnitId, Quantity, CreatedAt, UpdatedAt)
            VALUES (NEWID(), @id, @storeId, @unitId, @stockQuantity, GETDATE(), GETDATE());
        END
    END
    
    -- Return the updated product
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
        ISNULL(pi.Quantity, 0) AS currentStock
    FROM Products p
    LEFT JOIN Categories c ON p.category_id = c.id
    LEFT JOIN ProductInventory pi ON p.id = pi.ProductId AND pi.StoreId = @storeId
    WHERE p.id = @id AND p.store_id = @storeId;
END
GO

-- =============================================
-- sp_Products_Delete
-- Description: Soft deletes a product by setting status to 'deleted'
-- Requirements: 1.3
-- =============================================

IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_Products_Delete')
    DROP PROCEDURE sp_Products_Delete;
GO

CREATE PROCEDURE sp_Products_Delete
    @id NVARCHAR(36),
    @storeId NVARCHAR(36)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Check if product exists
    IF NOT EXISTS (SELECT 1 FROM Products WHERE id = @id AND store_id = @storeId)
    BEGIN
        RAISERROR('Product not found', 16, 1);
        RETURN;
    END
    
    -- Soft delete by setting status to 'deleted'
    UPDATE Products 
    SET status = 'deleted', updated_at = GETDATE()
    WHERE id = @id AND store_id = @storeId;
    
    -- Return affected rows count
    SELECT @@ROWCOUNT AS AffectedRows;
END
GO

-- =============================================
-- sp_Products_GetByStore
-- Description: Retrieves products for a store with optional filters and JOIN ProductInventory
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
        -- Use SUM of all ProductInventory records, fallback to stock_quantity
        ISNULL((SELECT SUM(Quantity) FROM ProductInventory WHERE ProductId = p.id AND StoreId = @storeId), p.stock_quantity) AS currentStock
    FROM Products p
    LEFT JOIN Categories c ON p.category_id = c.id
    WHERE p.store_id = @storeId
        AND p.status != 'deleted'
        AND (@status IS NULL OR p.status = @status)
        AND (@categoryId IS NULL OR p.category_id = @categoryId)
        AND (@searchTerm IS NULL OR p.name LIKE '%' + @searchTerm + '%' OR p.sku LIKE '%' + @searchTerm + '%')
    ORDER BY p.name ASC;
END
GO

-- =============================================
-- sp_Products_GetById
-- Description: Retrieves a single product by ID with stock from ProductInventory
-- Requirements: 1.5
-- =============================================

IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_Products_GetById')
    DROP PROCEDURE sp_Products_GetById;
GO

CREATE PROCEDURE sp_Products_GetById
    @id NVARCHAR(36),
    @storeId NVARCHAR(36)
AS
BEGIN
    SET NOCOUNT ON;
    
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
        -- Use SUM of all ProductInventory records, fallback to stock_quantity
        ISNULL((SELECT SUM(Quantity) FROM ProductInventory WHERE ProductId = p.id AND StoreId = @storeId), p.stock_quantity) AS currentStock
    FROM Products p
    LEFT JOIN Categories c ON p.category_id = c.id
    WHERE p.id = @id AND p.store_id = @storeId;
END
GO

PRINT 'Products module stored procedures created successfully!';
GO
