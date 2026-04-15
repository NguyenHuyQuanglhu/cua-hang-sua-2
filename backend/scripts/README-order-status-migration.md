# Order Status Migration

## Overview

This migration script converts all existing orders from the old 4-status system to the new 2-status system.

### Status Mapping

| Old Status | New Status |
|------------|------------|
| draft      | pending    |
| printed    | pending    |
| completed  | processed  |
| cancelled  | processed  |

## Features

- **Pre-migration Validation**: Counts records and validates all statuses before migration
- **Batch Processing**: Processes 1000 records per batch to avoid long table locks
- **Audit Logging**: Records every status change in `MigrationAuditLog` table
- **Post-migration Verification**: Validates counts and ensures no old statuses remain
- **Atomic Transaction**: All changes are wrapped in a transaction with automatic rollback on error
- **Database Constraint Update**: Updates the CHECK constraint to only allow new status values

## Prerequisites

1. Ensure the `MigrationAuditLog` table exists:
   ```bash
   npm run migrate create-migration-audit-log.sql
   ```

2. Backup your database before running the migration

3. Ensure no active transactions are modifying the Sales table

## Running the Migration

### Using npm script (recommended):
```bash
npm run migrate:order-status
```

### Using tsx directly:
```bash
npx tsx scripts/migrate-order-status.ts
```

## Migration Process

The script follows these steps:

1. **Connect to Database**
   - Establishes connection using environment variables

2. **Pre-migration Validation**
   - Counts orders by current status
   - Validates all statuses are recognized
   - Displays current distribution

3. **Start Transaction**
   - Begins atomic transaction for all changes

4. **Migrate Orders (Batch Processing)**
   - Fetches orders in batches of 1000
   - Updates status according to mapping rules
   - Logs each change to `MigrationAuditLog`
   - Displays progress

5. **Update Database Constraint**
   - Drops old CHECK constraint
   - Adds new constraint: `Status IN ('pending', 'processed')`

6. **Commit Transaction**
   - Commits all changes atomically

7. **Post-migration Verification**
   - Counts orders by new status
   - Verifies counts match expected values
   - Ensures no old statuses remain
   - Displays verification results

## Output Example

```
🚀 Order Status Migration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mapping:
  draft → pending
  printed → pending
  completed → processed
  cancelled → processed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔌 Connecting to database...
✅ Connected to database

📋 Pre-migration Validation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Current status distribution:
  draft: 150
  printed: 200
  completed: 800
  cancelled: 50
  Total: 1200
✅ All statuses are valid

📦 Batch ID: migration_1234567890

🔒 Starting transaction...

🔄 Migrating Orders
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Migrated 1000 orders...
  Migrated 1200 orders...

🔧 Updating Database Constraint
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Status constraint updated

💾 Committing transaction...
✅ Transaction committed

✅ Post-migration Verification
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
New status distribution:
  pending: 350
  processed: 850
  Total: 1200

Verification:
  Expected pending: 350, Actual: 350
  Expected processed: 850, Actual: 850
  Records migrated: 1200
✅ All verifications passed

🎉 Migration completed successfully!
Total orders migrated: 1200

🔌 Database connection closed

✅ Done
```

## Error Handling

### Automatic Rollback

If any error occurs during migration, the transaction is automatically rolled back:

```
❌ Error during migration, rolling back...
✅ Transaction rolled back
```

All changes are reverted, and the database remains in its original state.

### Common Errors

1. **Invalid Status Found**
   - Cause: Database contains status values not in the mapping
   - Solution: Review and update the STATUS_MAPPING in the script

2. **Count Mismatch**
   - Cause: Verification failed, counts don't match expected values
   - Solution: Check for concurrent modifications during migration

3. **Connection Timeout**
   - Cause: Database connection lost during migration
   - Solution: Check network and database availability, retry migration

## Audit Log

All status changes are logged in the `MigrationAuditLog` table:

```sql
SELECT * FROM MigrationAuditLog
WHERE migration_batch = 'migration_1234567890'
```

Columns:
- `id`: Auto-increment primary key
- `order_id`: Reference to Sales.Id
- `old_status`: Original status value
- `new_status`: New status value
- `migrated_at`: Timestamp of migration
- `migration_batch`: Batch identifier for this migration run

## Rollback

If you need to rollback the migration, use the rollback script:

```bash
npm run rollback:order-status migration_1234567890
```

Replace `migration_1234567890` with your actual batch ID from the migration output.

## Testing

Before running on production:

1. **Test on Staging**
   - Run migration on staging database with production-like data
   - Verify all counts and statuses
   - Test application functionality with new statuses

2. **Performance Test**
   - Test with large datasets (100k+ records)
   - Measure migration time
   - Ensure acceptable downtime

3. **Rollback Test**
   - Test rollback script on staging
   - Verify data is restored correctly

## Maintenance Window

Recommended maintenance window:
- Small databases (<10k orders): 5-10 minutes
- Medium databases (10k-100k orders): 15-30 minutes
- Large databases (>100k orders): 30-60 minutes

During migration:
- Application should be in maintenance mode
- No new orders should be created
- No status updates should occur

## Post-Migration

After successful migration:

1. **Verify Application**
   - Test order creation (should have status='pending')
   - Test order completion (should update to status='processed')
   - Test order cancellation (should update to status='processed')
   - Test status filters in UI

2. **Monitor**
   - Check application logs for errors
   - Monitor database performance
   - Verify no old status values appear

3. **Update Documentation**
   - Update API documentation with new status values
   - Update user guides
   - Notify team of changes

## Support

For issues or questions:
1. Check the audit log for migration details
2. Review error messages in console output
3. Contact the development team with batch ID and error details
