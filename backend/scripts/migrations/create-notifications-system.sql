-- =============================================
-- Create Notifications System
-- =============================================

-- Create Notifications table if not exists
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Notifications')
BEGIN
    CREATE TABLE Notifications (
        id NVARCHAR(36) PRIMARY KEY DEFAULT NEWID(),
        store_id NVARCHAR(36) NOT NULL,
        user_id NVARCHAR(36) NULL, -- NULL means for all users in store
        type NVARCHAR(50) NOT NULL, -- 'low_stock', 'debt_reminder', 'shift_ending', 'activity'
        title NVARCHAR(255) NOT NULL,
        message NVARCHAR(MAX) NOT NULL,
        data NVARCHAR(MAX) NULL, -- JSON data for additional info
        is_read BIT DEFAULT 0,
        priority NVARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
        action_url NVARCHAR(500) NULL, -- URL to navigate when clicked
        created_at DATETIME DEFAULT GETDATE(),
        read_at DATETIME NULL,
        expires_at DATETIME NULL, -- Auto-delete after this date
        FOREIGN KEY (store_id) REFERENCES Stores(id) ON DELETE CASCADE
    );

    CREATE INDEX idx_notifications_store_user ON Notifications(store_id, user_id);
    CREATE INDEX idx_notifications_is_read ON Notifications(is_read);
    CREATE INDEX idx_notifications_created_at ON Notifications(created_at DESC);
    CREATE INDEX idx_notifications_type ON Notifications(type);

    PRINT 'Created Notifications table';
END
ELSE
BEGIN
    PRINT 'Notifications table already exists';
END

GO

-- Create stored procedure to clean up old notifications
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_CleanupOldNotifications')
    DROP PROCEDURE sp_CleanupOldNotifications;
GO

CREATE PROCEDURE sp_CleanupOldNotifications
    @daysToKeep INT = 30
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @cutoffDate DATETIME = DATEADD(DAY, -@daysToKeep, GETDATE());
    
    -- Delete read notifications older than cutoff date
    DELETE FROM Notifications 
    WHERE is_read = 1 
    AND created_at < @cutoffDate;
    
    -- Delete expired notifications
    DELETE FROM Notifications
    WHERE expires_at IS NOT NULL
    AND expires_at < GETDATE();
    
    PRINT 'Cleaned up old notifications';
END
GO

PRINT 'Notifications system created successfully';
