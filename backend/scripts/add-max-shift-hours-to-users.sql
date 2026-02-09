-- Add max_shift_hours column to Users table
-- This defines the maximum hours an employee can work per shift

IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID('Users') 
  AND name = 'max_shift_hours'
)
BEGIN
  ALTER TABLE Users ADD max_shift_hours DECIMAL(5,2) NULL;
  PRINT 'Added max_shift_hours column to Users table';
END
ELSE
BEGIN
  PRINT 'max_shift_hours column already exists in Users table';
END

-- Set default max shift hours to 8 hours for all users
UPDATE Users 
SET max_shift_hours = 8.0 
WHERE max_shift_hours IS NULL;

PRINT 'Updated default max_shift_hours to 8.0 hours for all users';
