# Migration Audit Log Table

## Purpose
This migration creates the `MigrationAuditLog` table to track all status changes during the order status migration process. This allows for verification and rollback if needed.

## Schema
The table includes the following columns:
- `id`: Auto-incrementing primary key
- `order_id`: Reference to the Sales table (NVARCHAR(36))
- `old_status`: The previous status value (NVARCHAR(20))
- `new_status`: The new status value (NVARCHAR(20))
- `migrated_at`: Timestamp when the migration occurred (DATETIME, defaults to current time)
- `migration_batch`: Batch identifier for grouping related migrations (NVARCHAR(50))

## Indexes
The following indexes are created for efficient querying:
- `idx_migration_audit_order_id`: Index on `order_id` for fast lookups by order
- `idx_migration_audit_batch`: Index on `migration_batch` for batch-based queries
- `idx_migration_audit_migrated_at`: Descending index on `migrated_at` for time-based queries

## How to Run
Execute the migration using the following command:

```bash
npm run migrate create-migration-audit-log.sql
```

Or using npx directly:

```bash
npx tsx scripts/run-migration.ts create-migration-audit-log.sql
```

## Validation
After running the migration, verify the table was created:

```sql
-- Check if table exists
SELECT * FROM sys.tables WHERE name = 'MigrationAuditLog';

-- Check table structure
EXEC sp_help 'MigrationAuditLog';

-- Check indexes
SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('MigrationAuditLog');
```

## Related Requirements
This migration satisfies **Requirement 4.3** from the pos-sales-ui-improvements spec:
- THE POS_System SHALL ghi log tất cả các thay đổi trạng thái trong quá trình migration để có thể audit

## Next Steps
After creating this table, the next step is to implement the main migration script (Task 4.2) that will:
1. Update order statuses from the old system (draft, printed, completed, cancelled) to the new system (pending, processed)
2. Log each change in this audit table
3. Provide rollback capability using the audit log
