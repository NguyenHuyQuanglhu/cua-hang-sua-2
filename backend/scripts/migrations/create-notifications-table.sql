-- Migration: Create Notifications table for manager notifications
-- This table stores notifications for managers about overtime cancel requests and other events

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Notifications' AND xtype='U')
BEGIN
    PRINT 'Creating Notifications table...';
    
    CREATE TABLE Notifications (
        Id NVARCHAR(36) PRIMARY KEY,
        UserId NVARCHAR(36) NOT NULL,
        Type NVARCHAR(50) NOT NULL,
        Title NVARCHAR(255) NOT NULL,
        Message NVARCHAR(MAX) NOT NULL,
        RelatedId NVARCHAR(36) NULL,
        IsRead BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        ReadAt DATETIME NULL,
        FOREIGN KEY (UserId) REFERENCES Users(Id)
    );
    
    -- Create index for faster queries
    CREATE INDEX IX_Notifications_UserId_IsRead ON Notifications(UserId, IsRead);
    CREATE INDEX IX_Notifications_CreatedAt ON Notifications(CreatedAt DESC);
    
    PRINT 'Notifications table created successfully';
END
ELSE
BEGIN
    PRINT 'Notifications table already exists';
END
GO
