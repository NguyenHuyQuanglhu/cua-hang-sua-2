-- Add hourly_rate column to Users table
-- This stores the hourly wage for employees

IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('Users') 
    AND name = 'hourly_rate'
)
BEGIN
    ALTER TABLE Users
    ADD hourly_rate DECIMAL(18, 2) NULL DEFAULT 20000;
    
    PRINT 'Added hourly_rate column to Users table';
END
ELSE
BEGIN
    PRINT 'hourly_rate column already exists in Users table';
END
GO

-- Update existing users with default hourly rate if NULL
UPDATE Users
SET hourly_rate = 20000
WHERE hourly_rate IS NULL;
GO

PRINT 'Users table updated successfully!';
GO
