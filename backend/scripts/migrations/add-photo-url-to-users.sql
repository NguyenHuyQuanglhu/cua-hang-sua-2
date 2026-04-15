-- Add photo_url column to Users table
-- This column stores the user's avatar/profile picture as base64 or URL

IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'Users') 
    AND name = 'photo_url'
)
BEGIN
    ALTER TABLE Users
    ADD photo_url NVARCHAR(MAX) NULL;
    
    PRINT 'Added photo_url column to Users table';
END
ELSE
BEGIN
    PRINT 'photo_url column already exists in Users table';
END

