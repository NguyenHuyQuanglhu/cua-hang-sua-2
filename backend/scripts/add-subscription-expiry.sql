-- Add subscription expiry and auto-renewal columns to Users table

USE Data_quanlybanhang_online;
GO

-- Check if columns exist before adding
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'subscription_plan_id')
BEGIN
    ALTER TABLE Users ADD subscription_plan_id NVARCHAR(50) NULL;
    PRINT '✓ Added subscription_plan_id column';
END
ELSE
BEGIN
    PRINT '✓ subscription_plan_id column already exists';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'subscription_start_date')
BEGIN
    ALTER TABLE Users ADD subscription_start_date DATETIME NULL;
    PRINT '✓ Added subscription_start_date column';
END
ELSE
BEGIN
    PRINT '✓ subscription_start_date column already exists';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'subscription_end_date')
BEGIN
    ALTER TABLE Users ADD subscription_end_date DATETIME NULL;
    PRINT '✓ Added subscription_end_date column';
END
ELSE
BEGIN
    PRINT '✓ subscription_end_date column already exists';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'auto_renewal')
BEGIN
    ALTER TABLE Users ADD auto_renewal BIT DEFAULT 1;
    PRINT '✓ Added auto_renewal column';
END
ELSE
BEGIN
    PRINT '✓ auto_renewal column already exists';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'subscription_status')
BEGIN
    ALTER TABLE Users ADD subscription_status NVARCHAR(20) DEFAULT 'active' CHECK (subscription_status IN ('active', 'expired', 'cancelled'));
    PRINT '✓ Added subscription_status column';
END
ELSE
BEGIN
    PRINT '✓ subscription_status column already exists';
END
GO

-- Create SubscriptionHistory table to track all subscription changes
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SubscriptionHistory')
BEGIN
    CREATE TABLE SubscriptionHistory (
        id NVARCHAR(36) PRIMARY KEY,
        user_id NVARCHAR(36) NOT NULL,
        plan_id NVARCHAR(50) NOT NULL,
        max_stores INT NOT NULL,
        amount DECIMAL(18, 2) NOT NULL,
        payment_method NVARCHAR(50),
        start_date DATETIME NOT NULL,
        end_date DATETIME NOT NULL,
        status NVARCHAR(20) NOT NULL CHECK (status IN ('active', 'expired', 'cancelled', 'renewed')),
        auto_renewal BIT DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IX_SubscriptionHistory_UserId ON SubscriptionHistory(user_id);
    CREATE INDEX IX_SubscriptionHistory_Status ON SubscriptionHistory(status);
    CREATE INDEX IX_SubscriptionHistory_EndDate ON SubscriptionHistory(end_date);
    
    PRINT '✓ Created SubscriptionHistory table';
END
ELSE
BEGIN
    PRINT '✓ SubscriptionHistory table already exists';
END
GO

-- Update existing users to have default subscription (basic plan, no expiry)
UPDATE Users
SET 
    subscription_plan_id = 'basic',
    subscription_status = 'active',
    auto_renewal = 1
WHERE subscription_plan_id IS NULL;

PRINT '✓ Updated existing users with default subscription';
GO

PRINT '';
PRINT '=== Subscription Expiry Setup Complete ===';
PRINT 'Users table now has:';
PRINT '  - subscription_plan_id: Plan identifier (basic/pro/enterprise)';
PRINT '  - subscription_start_date: When subscription started';
PRINT '  - subscription_end_date: When subscription expires';
PRINT '  - auto_renewal: Auto-renew on expiry (1=yes, 0=no)';
PRINT '  - subscription_status: active/expired/cancelled';
PRINT '';
PRINT 'SubscriptionHistory table tracks all subscription changes';
GO
