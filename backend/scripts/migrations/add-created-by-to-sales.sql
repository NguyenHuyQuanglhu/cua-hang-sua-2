-- Migration: Add created_by column to Sales table
-- This allows filtering sales by the employee who created them

-- Check if column already exists
IF NOT EXISTS (
    SELECT 1 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'Sales' AND COLUMN_NAME = 'CreatedBy'
)
BEGIN
    PRINT 'Adding CreatedBy column to Sales table...';
    
    -- Add created_by column with UNIQUEIDENTIFIER type to match Users.Id
    ALTER TABLE Sales
    ADD CreatedBy UNIQUEIDENTIFIER NULL;
    
    PRINT 'CreatedBy column added successfully';
    
    -- Add foreign key constraint
    ALTER TABLE Sales
    ADD CONSTRAINT FK_Sales_CreatedBy
    FOREIGN KEY (CreatedBy) REFERENCES Users(Id);
    
    PRINT 'Foreign key constraint added successfully';
END
ELSE
BEGIN
    PRINT 'CreatedBy column already exists';
    
    -- Check if it's the wrong type and fix it
    DECLARE @DataType NVARCHAR(50);
    SELECT @DataType = DATA_TYPE 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'Sales' AND COLUMN_NAME = 'CreatedBy';
    
    IF @DataType = 'nvarchar'
    BEGIN
        PRINT 'CreatedBy has wrong data type (nvarchar), fixing...';
        
        -- Drop foreign key if exists
        IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Sales_CreatedBy')
        BEGIN
            ALTER TABLE Sales DROP CONSTRAINT FK_Sales_CreatedBy;
            PRINT 'Dropped existing foreign key';
        END
        
        -- Drop and recreate column with correct type
        ALTER TABLE Sales DROP COLUMN CreatedBy;
        PRINT 'Dropped old CreatedBy column';
        
        ALTER TABLE Sales ADD CreatedBy UNIQUEIDENTIFIER NULL;
        PRINT 'Added CreatedBy column with correct type';
        
        -- Add foreign key constraint
        ALTER TABLE Sales
        ADD CONSTRAINT FK_Sales_CreatedBy
        FOREIGN KEY (CreatedBy) REFERENCES Users(Id);
        
        PRINT 'Foreign key constraint added successfully';
    END
END
GO
