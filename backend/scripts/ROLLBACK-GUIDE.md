# Order Status Migration Rollback Guide

## Overview

This guide explains how to rollback the order status migration from the new 2-status system (pending/processed) back to the old 4-status system (draft/printed/completed/cancelled).

## Prerequisites

- The migration must have been run using `migrate-order-status.ts`
- You must have the batch ID from the migration (format: `migration_<timestamp>`)
- Database backup is recommended before rollback

## Finding the Batch ID

The batch ID is displayed when you run the migration script. It follows the format:

```
migration_1234567890
```

If you don't have the batch ID, you can query the database:

```sql
SELECT DISTINCT migration_batch 
FROM MigrationAuditLog 
ORDER BY migration_batch DESC;
```

## Running the Rollback

### Command

```bash
npm run rollback:order-status <batch-id>
```

### Example

```bash
npm run rollback:order-status migration_1704067200000
```

## What the Rollback Does

1. **Validates the batch ID** - Ensures audit log entries exist for the specified batch
2. **Restores old status values** - Uses the audit log to restore each order's original status
3. **Restores old constraint** - Updates the database CHECK constraint to accept old status values
4. **Deletes audit log entries** - Removes the audit log entries for this batch
5. **Verifies completion** - Confirms all changes were applied correctly

## Status Mapping (Rollback)

The rollback restores the original status values:

| Current Status | Restored Status |
|---------------|-----------------|
| pending       | draft or printed (from audit log) |
| processed     | completed or cancelled (from audit log) |

## Output Example

```
🔄 Order Status Rollback
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Batch ID: migration_1704067200000
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This will restore:
  pending → original status (draft/printed)
  processed → original status (completed/cancelled)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔌 Connecting to database...
✅ Connected to database

📋 Pre-rollback Validation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Found 1234 audit log entries for batch: migration_1704067200000
Current status distribution:
  pending: 500
  processed: 734
  Total: 1234

🔒 Starting transaction...

🔄 Restoring Old Status Values
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Found 1234 orders to rollback
  Restored 100 orders...
  Restored 200 orders...
  ...
✅ Restored 1234 orders to old status values

🔧 Restoring Old Database Constraint
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Status constraint restored to old values

🗑️  Deleting Audit Log Entries
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Deleted 1234 audit log entries

💾 Committing transaction...
✅ Transaction committed

✅ Post-rollback Verification
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status distribution after rollback:
  draft: 200
  printed: 300
  completed: 500
  cancelled: 234
  Total: 1234
  Records restored: 1234
✅ All verifications passed

🎉 Rollback completed successfully!
Total orders restored: 1234

🔌 Database connection closed

✅ Done
```

## Error Handling

### Batch ID Not Found

If the batch ID doesn't exist in the audit log:

```
❌ Error: No audit log entries found for batch ID: migration_invalid
```

**Solution**: Verify the batch ID is correct by querying the database.

### Transaction Rollback

If any error occurs during rollback, all changes are automatically rolled back:

```
❌ Error during rollback, rolling back transaction...
✅ Transaction rolled back
```

The database will remain in its state before the rollback attempt.

### Orders Created After Migration

If orders were created after the migration with new status values, you'll see a warning:

```
⚠️  Warning: 10 orders still have new status values
   (These may be orders created after the migration)
```

This is expected and safe - these are new orders that weren't part of the original migration.

## Safety Features

1. **Atomic Transaction** - All changes are wrapped in a transaction. If any step fails, everything is rolled back.
2. **Pre-validation** - Verifies the batch ID exists before making any changes.
3. **Post-verification** - Confirms all changes were applied correctly.
4. **Audit Trail** - Uses the audit log to ensure accurate restoration.

## Important Notes

- **Backup First**: Always create a database backup before running the rollback.
- **Downtime**: The rollback may take several minutes for large datasets. Consider scheduling during low-traffic periods.
- **One-time Use**: Each batch ID can only be rolled back once (audit log entries are deleted after rollback).
- **New Orders**: Orders created after the migration will not be affected by the rollback.

## Troubleshooting

### Cannot Find Batch ID

Query the database to find available batch IDs:

```sql
SELECT DISTINCT migration_batch, COUNT(*) as order_count, MIN(migrated_at) as migration_date
FROM MigrationAuditLog
GROUP BY migration_batch
ORDER BY migration_date DESC;
```

### Rollback Fails Mid-Process

The transaction will automatically rollback. Check the error message and:

1. Verify database connectivity
2. Check database permissions
3. Ensure no other processes are locking the Sales table
4. Review the error logs for specific issues

### Need to Re-run Rollback

If the rollback was interrupted and the transaction rolled back, you can safely re-run the command with the same batch ID (as long as the audit log entries still exist).

## Support

For issues or questions, contact the development team or refer to the main migration documentation.
