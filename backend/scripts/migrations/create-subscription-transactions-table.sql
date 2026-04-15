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
        payment_method NVARCHAR(50) NOT NULL, -- 'auto_payment', 'bank_transfer', 'credit_card', 'cash', 'admin_assign'
        payment_status NVARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
        transaction_reference NVARCHAR(100) NULL, -- Mã giao dịch từ payment gateway
        start_date DATETIME2 NOT NULL,
        end_date DATETIME2 NOT NULL,
        auto_renewal BIT NOT NULL DEFAULT 1,
        processed_by NVARCHAR(36) NULL, -- User ID của người xử lý (nếu manual)
        processed_by_role NVARCHAR(50) NULL, -- 'system', 'admin', 'owner'
        processed_by_name NVARCHAR(255) NULL,
        processed_by_email NVARCHAR(255) NULL,
        user_name_snapshot NVARCHAR(255) NULL,
        user_email_snapshot NVARCHAR(255) NULL,
        notes NVARCHAR(500) NULL,
        metadata NVARCHAR(MAX) NULL, -- JSON data for additional info
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        
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

-- Backward compatibility for existing schemas
IF OBJECT_ID('SubscriptionTransactions', 'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('SubscriptionTransactions', 'processed_by_name') IS NULL
        ALTER TABLE SubscriptionTransactions ADD processed_by_name NVARCHAR(255) NULL;

    IF COL_LENGTH('SubscriptionTransactions', 'processed_by_email') IS NULL
        ALTER TABLE SubscriptionTransactions ADD processed_by_email NVARCHAR(255) NULL;

    IF COL_LENGTH('SubscriptionTransactions', 'user_name_snapshot') IS NULL
        ALTER TABLE SubscriptionTransactions ADD user_name_snapshot NVARCHAR(255) NULL;

    IF COL_LENGTH('SubscriptionTransactions', 'user_email_snapshot') IS NULL
        ALTER TABLE SubscriptionTransactions ADD user_email_snapshot NVARCHAR(255) NULL;

    DECLARE @dropSql NVARCHAR(MAX) = N'';

    SELECT @dropSql = @dropSql
        + N'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(fk.parent_object_id))
        + N'.' + QUOTENAME(OBJECT_NAME(fk.parent_object_id))
        + N' DROP CONSTRAINT ' + QUOTENAME(fk.name) + N';'
    FROM sys.foreign_keys fk
    INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
    INNER JOIN sys.columns parent_col
        ON parent_col.object_id = fkc.parent_object_id
        AND parent_col.column_id = fkc.parent_column_id
    INNER JOIN sys.columns ref_col
        ON ref_col.object_id = fkc.referenced_object_id
        AND ref_col.column_id = fkc.referenced_column_id
    WHERE OBJECT_NAME(fk.parent_object_id) = 'SubscriptionTransactions'
      AND parent_col.name = 'user_id'
      AND OBJECT_NAME(fk.referenced_object_id) = 'Users'
      AND ref_col.name = 'id';

    IF LEN(@dropSql) > 0
        EXEC sp_executesql @dropSql;
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