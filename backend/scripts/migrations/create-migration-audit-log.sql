-- =============================================
-- Create Migration Audit Log Table
-- Purpose: Track all status changes during order status migration
-- =============================================

-- Create MigrationAuditLog table if not exists
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MigrationAuditLog')
BEGIN
    CREATE TABLE MigrationAuditLog (
        id INT IDENTITY(1,1) PRIMARY KEY,
        order_id NVARCHAR(36) NOT NULL,
        old_status NVARCHAR(20) NOT NULL,
        new_status NVARCHAR(20) NOT NULL,
        migrated_at DATETIME DEFAULT GETDATE(),
        migration_batch NVARCHAR(50) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES Sales(Id) ON DELETE CASCADE
    );

    -- Create indexes for efficient querying
    CREATE INDEX idx_migration_audit_order_id ON MigrationAuditLog(order_id);
    CREATE INDEX idx_migration_audit_batch ON MigrationAuditLog(migration_batch);
    CREATE INDEX idx_migration_audit_migrated_at ON MigrationAuditLog(migrated_at DESC);

    PRINT 'Created MigrationAuditLog table with indexes';
END
ELSE
BEGIN
    PRINT 'MigrationAuditLog table already exists';
END
