-- Migration: Create Subscription Transactions Table
-- Purpose: Lưu lịch sử giao dịch thanh toán gói dịch vụ tự động
-- Date: 2026-04-01

-- Create SubscriptionTransactions table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SubscriptionTransactions' AND xtype='U')
BEGIN
    CREATE TABLE SubscriptionTransactions (
        id NVARCHAR(36) PRIMARY KEY DEFAULT NEWID(),
        user_id NVARCHAR(36) NOT NULL,
        tenant_id NVARCHAR(36) NULL, -- For multi-tenant tracking
        transaction_type NVARCHAR(50) NOT NULL, -- 'auto_renewal', 'manual_upgrade', 'manual_purchase'
        plan_id NVARCHAR(50) NOT NULL, -- 'basic', 'pro', 'enterprise'
        previous_plan_id NVARCHAR(50) NULL, -- Plan trước đó (nếu upgrade)
        max_stores INT NOT NULL,
        amount DECIMAL(18,2) NOT NULL,
        currency NVARCHAR(3) DEFAULT 'VND',
        payment_method NVARCHAR(50) NOT NULL, -- 'auto_payment', 'bank_transfer', 'credit_card'
        payment_status NVARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
        transaction_reference NVARCHAR(100) NULL, -- Mã giao dịch từ payment gateway
        start_date DATETIME2 NOT NULL,
        end_date DATETIME2 NOT NULL,
        auto_renewal BIT NOT NULL DEFAULT 1,
        processed_by NVARCHAR(36) NULL, -- User ID của người xử lý (nếu manual)
        processed_by_role NVARCHAR(50) NULL, -- 'system', 'admin', 'owner'
        notes NVARCHAR(500) NULL,
        metadata NVARCHAR(MAX) NULL, -- JSON data for additional info
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        
        -- Foreign key constraints
        FOREIGN KEY (user_id) REFERENCES Users(id),
        
        -- Indexes for performance
        INDEX IX_SubscriptionTransactions_UserId (user_id),
        INDEX IX_SubscriptionTransactions_TenantId (tenant_id),
        INDEX IX_SubscriptionTransactions_CreatedAt (created_at DESC),
        INDEX IX_SubscriptionTransactions_PaymentStatus (payment_status),
        INDEX IX_SubscriptionTransactions_TransactionType (transaction_type)
    );
    
    PRINT 'Created SubscriptionTransactions table successfully';
END
ELSE
BEGIN
    PRINT 'SubscriptionTransactions table already exists';
END

-- Create trigger to update updated_at automatically
IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'TR_SubscriptionTransactions_UpdatedAt')
BEGIN
    EXEC('
    CREATE TRIGGER TR_SubscriptionTransactions_UpdatedAt
    ON SubscriptionTransactions
    AFTER UPDATE
    AS
    BEGIN
        SET NOCOUNT ON;
        UPDATE SubscriptionTransactions 
        SET updated_at = GETDATE()
        FROM SubscriptionTransactions st
        INNER JOIN inserted i ON st.id = i.id;
    END
    ');
    
    PRINT 'Created trigger TR_SubscriptionTransactions_UpdatedAt successfully';
END

-- Add sample data for testing (optional)
-- INSERT INTO SubscriptionTransactions (
--     user_id, transaction_type, plan_id, max_stores, amount, 
--     payment_method, payment_status, start_date, end_date, 
--     processed_by_role, notes
-- ) VALUES (
--     'sample-user-id', 'auto_renewal', 'pro', 5, 499000.00,
--     'auto_payment', 'completed', GETDATE(), DATEADD(MONTH, 1, GETDATE()),
--     'system', 'Tự động gia hạn gói Pro'
-- );

PRINT 'Migration completed: create-subscription-transactions-table.sql';