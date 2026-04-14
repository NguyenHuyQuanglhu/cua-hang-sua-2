-- Create contractors catalog and link purchase invoices to contractors

IF OBJECT_ID(N'Contractors', N'U') IS NULL
BEGIN
    CREATE TABLE Contractors (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        store_id UNIQUEIDENTIFIER NOT NULL,
        name NVARCHAR(255) NOT NULL,
        contact_person NVARCHAR(255),
        email NVARCHAR(255),
        phone NVARCHAR(50),
        address NVARCHAR(500),
        tax_code NVARCHAR(50),
        identity_number NVARCHAR(50),
        description NVARCHAR(MAX),
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_Contractors_Stores FOREIGN KEY (store_id) REFERENCES Stores(id)
    );
    PRINT 'Created Contractors table';
END
ELSE
BEGIN
    PRINT 'Contractors table already exists';
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID(N'PurchaseOrders')
      AND name = 'contractor_id'
)
BEGIN
    ALTER TABLE PurchaseOrders ADD contractor_id UNIQUEIDENTIFIER NULL;
    PRINT 'Added contractor_id column to PurchaseOrders';
END
ELSE
BEGIN
    PRINT 'contractor_id column already exists in PurchaseOrders';
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID(N'Sales')
      AND name = 'contractor_id'
)
BEGIN
    ALTER TABLE Sales ADD contractor_id UNIQUEIDENTIFIER NULL;
    PRINT 'Added contractor_id column to Sales';
END
ELSE
BEGIN
    PRINT 'contractor_id column already exists in Sales';
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_PurchaseOrders_Contractors'
)
BEGIN
    ALTER TABLE PurchaseOrders
    ADD CONSTRAINT FK_PurchaseOrders_Contractors
        FOREIGN KEY (contractor_id) REFERENCES Contractors(id);
    PRINT 'Added FK_PurchaseOrders_Contractors';
END
ELSE
BEGIN
    PRINT 'FK_PurchaseOrders_Contractors already exists';
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_Sales_Contractors'
)
BEGIN
    ALTER TABLE Sales
    ADD CONSTRAINT FK_Sales_Contractors
        FOREIGN KEY (contractor_id) REFERENCES Contractors(id);
    PRINT 'Added FK_Sales_Contractors';
END
ELSE
BEGIN
    PRINT 'FK_Sales_Contractors already exists';
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_Contractors_store_id'
      AND object_id = OBJECT_ID(N'Contractors')
)
BEGIN
    CREATE INDEX IX_Contractors_store_id ON Contractors(store_id);
    PRINT 'Created IX_Contractors_store_id';
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_PurchaseOrders_contractor_id'
      AND object_id = OBJECT_ID(N'PurchaseOrders')
)
BEGIN
    CREATE INDEX IX_PurchaseOrders_contractor_id ON PurchaseOrders(contractor_id);
    PRINT 'Created IX_PurchaseOrders_contractor_id';
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_Sales_contractor_id'
      AND object_id = OBJECT_ID(N'Sales')
)
BEGIN
    CREATE INDEX IX_Sales_contractor_id ON Sales(contractor_id);
    PRINT 'Created IX_Sales_contractor_id';
END
GO

PRINT 'Contractors migration completed successfully';
