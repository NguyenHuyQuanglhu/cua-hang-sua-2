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
    
    -- Add created_by column
    ALTER TABLE Sales
    ADD CreatedBy NVARCHAR(36) NULL;
    
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
END
GO
