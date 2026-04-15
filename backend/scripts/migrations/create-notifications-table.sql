-- =============================================
-- Create Notifications Table
-- =============================================

-- Create Notifications table if not exists
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Notifications')
BEGIN
    CREATE TABLE Notifications (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        store_id UNIQUEIDENTIFIER NOT NULL,
        user_id UNIQUEIDENTIFIER NULL,
        type NVARCHAR(50) NOT NULL,
        title NVARCHAR(255) NOT NULL,
        message NVARCHAR(MAX) NOT NULL,
        data NVARCHAR(MAX) NULL,
        is_read BIT DEFAULT 0,
        priority NVARCHAR(20) DEFAULT 'normal',
        action_url NVARCHAR(500) NULL,
        created_at DATETIME DEFAULT GETDATE(),
        read_at DATETIME NULL,
        expires_at DATETIME NULL,
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
