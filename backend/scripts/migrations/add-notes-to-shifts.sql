-- Add notes column to Shifts table
-- This allows storing notes about shift closure (manual or automatic)

IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID('Shifts') 
  AND name = 'notes'
)
BEGIN
  ALTER TABLE Shifts ADD notes NVARCHAR(500) NULL;
  PRINT 'Added notes column to Shifts table';
END
ELSE
BEGIN
  PRINT 'notes column already exists in Shifts table';
END
