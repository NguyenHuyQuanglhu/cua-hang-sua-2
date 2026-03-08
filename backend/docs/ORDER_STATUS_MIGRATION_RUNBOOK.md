# Order Status Migration Runbook

## Document Information

- **Feature**: POS Sales UI Improvements - Order Status Simplification
- **Migration Type**: Database Schema and Data Migration
- **Impact Level**: High (affects all existing orders)
- **Estimated Duration**: 5-60 minutes (depending on database size)
- **Rollback Available**: Yes
- **Requirements**: 4.1, 4.3, 4.4

## Executive Summary

This runbook provides step-by-step instructions for migrating the order status system from a 4-status model (draft, printed, completed, cancelled) to a simplified 2-status model (pending, processed). The migration includes automated data transformation, audit logging, and rollback capabilities.

### Status Mapping

| Old Status | New Status | Description |
|------------|------------|-------------|
| draft      | pending    | Order created but not completed |
| printed    | pending    | Invoice printed but payment not finalized |
| completed  | processed  | Order successfully completed |
| cancelled  | processed  | Order cancelled |

---

## Pre-Migration Checklist

### 1. Environment Preparation

- [ ] **Verify Environment Variables**
  ```bash
  # Check database connection settings
  cat .env | grep DB_
  ```
  Required variables:
  - `DB_HOST`
  - `DB_PORT`
  - `DB_USER`
  - `DB_PASSWORD`
  - `DB_NAME`

- [ ] **Test Database Connectivity**
  ```bash
  npm run db:test-connection
  ```

- [ ] **Verify Node.js and npm Versions**
  ```bash
  node --version  # Should be >= 18.x
  npm --version   # Should be >= 9.x
  ```

### 2. Database Backup

- [ ] **Create Full Database Backup**
  ```bash
  # PostgreSQL example
  pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -F c -b -v -f backup_before_migration_$(date +%Y%m%d_%H%M%S).dump
  ```

- [ ] **Verify Backup Integrity**
  ```bash
  # Check backup file exists and has reasonable size
  ls -lh backup_before_migration_*.dump
  ```

- [ ] **Store Backup in Safe Location**
  - Copy backup to secure storage
  - Document backup location and timestamp

### 3. Pre-Migration Validation

- [ ] **Check Current Order Status Distribution**
  ```sql
  SELECT Status, COUNT(*) as count
  FROM Sales
  GROUP BY Status
  ORDER BY Status;
  ```
  Document the counts for verification later.

- [ ] **Verify Migration Audit Log Table Exists**
  ```sql
  SELECT COUNT(*) FROM information_schema.tables 
  WHERE table_name = 'MigrationAuditLog';
  ```
  If table doesn't exist, create it:
  ```bash
  npm run migrate:create-audit-table
  ```

- [ ] **Check for Active Transactions**
  ```sql
  SELECT * FROM pg_stat_activity 
  WHERE state = 'active' AND query LIKE '%Sales%';
  ```
  Ensure no long-running transactions are modifying the Sales table.

- [ ] **Verify Disk Space**
  ```bash
  df -h
  ```
  Ensure sufficient disk space for audit log (approximately 10% of Sales table size).

### 4. Application Preparation

- [ ] **Enable Maintenance Mode**
  - Display maintenance page to users
  - Prevent new order creation
  - Block order status updates

- [ ] **Stop Background Jobs**
  ```bash
  # Stop any cron jobs or scheduled tasks that modify orders
  systemctl stop order-processor
  ```

- [ ] **Notify Stakeholders**
  - Send notification to team about maintenance window
  - Provide estimated downtime
  - Share rollback plan

### 5. Team Readiness

- [ ] **Migration Team Assembled**
  - Database Administrator present
  - Backend Developer available
  - System Administrator on standby

- [ ] **Communication Channels Open**
  - Team chat/Slack channel active
  - Phone numbers exchanged for emergencies

- [ ] **Rollback Plan Reviewed**
  - Team understands rollback procedure
  - Rollback script tested on staging

### 6. Staging Validation

- [ ] **Migration Tested on Staging**
  - Run migration on staging environment
  - Verify data integrity
  - Test application functionality with new statuses

- [ ] **Performance Benchmarked**
  - Measure migration time on staging
  - Confirm acceptable duration

- [ ] **Rollback Tested on Staging**
  - Successfully rolled back staging migration
  - Verified data restoration

---

## Migration Execution Steps

### Phase 1: Final Pre-Migration Checks (5 minutes)

#### Step 1.1: Verify System State
```bash
# Check application is in maintenance mode
curl -I https://your-app.com/health

# Verify no active users
SELECT COUNT(*) FROM pg_stat_activity WHERE application_name = 'your-app';
```

#### Step 1.2: Record Pre-Migration Metrics
```sql
-- Save current counts
SELECT 
  Status,
  COUNT(*) as count,
  NOW() as snapshot_time
FROM Sales
GROUP BY Status;
```

Document these numbers:
- draft: _______
- printed: _______
- completed: _______
- cancelled: _______
- **Total**: _______

#### Step 1.3: Create Migration Log File
```bash
# Create log directory if it doesn't exist
mkdir -p logs/migrations

# Set log file path
export MIGRATION_LOG="logs/migrations/migration_$(date +%Y%m%d_%H%M%S).log"
```

### Phase 2: Execute Migration (10-50 minutes)

#### Step 2.1: Start Migration Script
```bash
# Run migration with logging
npm run migrate:order-status 2>&1 | tee $MIGRATION_LOG
```

#### Step 2.2: Monitor Progress
The script will display:
- Batch ID (save this for potential rollback)
- Progress updates every 1000 records
- Current status counts

**Expected Output:**
```
🚀 Order Status Migration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Batch ID: migration_1704067200000
🔄 Migrating Orders
  Migrated 1000 orders...
  Migrated 2000 orders...
```

**Save the Batch ID**: `migration_________________`

#### Step 2.3: Wait for Completion
- Do not interrupt the process
- Monitor for any error messages
- Keep communication channel open

### Phase 3: Verification (5 minutes)

#### Step 3.1: Review Migration Output
Check the final output for:
- ✅ All verifications passed
- ✅ Migration completed successfully
- Total orders migrated matches expected count

#### Step 3.2: Verify Database State
```sql
-- Check new status distribution
SELECT Status, COUNT(*) as count
FROM Sales
GROUP BY Status
ORDER BY Status;
```

Expected results:
- pending: _______ (should equal draft + printed from pre-migration)
- processed: _______ (should equal completed + cancelled from pre-migration)

#### Step 3.3: Verify Audit Log
```sql
-- Check audit log entries
SELECT 
  migration_batch,
  old_status,
  new_status,
  COUNT(*) as count
FROM MigrationAuditLog
WHERE migration_batch = 'migration_XXXXX'  -- Use your batch ID
GROUP BY migration_batch, old_status, new_status;
```

Expected entries:
- draft → pending: _______
- printed → pending: _______
- completed → processed: _______
- cancelled → processed: _______

#### Step 3.4: Verify Database Constraint
```sql
-- Check constraint definition
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'Sales'::regclass
  AND conname LIKE '%status%';
```

Should show: `CHECK (Status IN ('pending', 'processed'))`

---

## Post-Migration Verification Steps

### 1. Data Integrity Checks

#### Check 1.1: Record Count Consistency
```sql
-- Verify total record count unchanged
SELECT COUNT(*) as total_orders FROM Sales;
```
Compare with pre-migration total: _______

#### Check 1.2: No Old Status Values Remain
```sql
-- Should return 0 rows
SELECT * FROM Sales 
WHERE Status NOT IN ('pending', 'processed')
LIMIT 10;
```

#### Check 1.3: Sample Data Verification
```sql
-- Check a few specific orders
SELECT Id, Status, CreatedAt, UpdatedAt
FROM Sales
WHERE Id IN ('order-id-1', 'order-id-2', 'order-id-3');
```

### 2. Application Functionality Tests

#### Test 2.1: Create New Order
- [ ] Create a new order through the application
- [ ] Verify status is set to 'pending'
- [ ] Check database confirms status='pending'

#### Test 2.2: Complete Order
- [ ] Complete an existing pending order
- [ ] Verify status updates to 'processed'
- [ ] Check database confirms status='processed'

#### Test 2.3: Cancel Order
- [ ] Cancel an existing pending order
- [ ] Verify status updates to 'processed'
- [ ] Check database confirms status='processed'

#### Test 2.4: Status Filters
- [ ] Open sales list page
- [ ] Filter by "Chưa xử lý" (pending)
- [ ] Verify only pending orders shown
- [ ] Filter by "Đã xử lý" (processed)
- [ ] Verify only processed orders shown
- [ ] Check status counts are accurate

#### Test 2.5: Status Badges
- [ ] Verify pending orders show yellow badge with "Chưa xử lý"
- [ ] Verify processed orders show green badge with "Đã xử lý"

### 3. API Endpoint Verification

#### Test 3.1: GET /api/sales
```bash
# Test without filter
curl -X GET "http://localhost:3000/api/sales" | jq

# Test with pending filter
curl -X GET "http://localhost:3000/api/sales?status=pending" | jq

# Test with processed filter
curl -X GET "http://localhost:3000/api/sales?status=processed" | jq
```

Verify:
- [ ] Response includes only valid status values
- [ ] Counts match database queries
- [ ] No old status values in responses

#### Test 3.2: POST /api/sales
```bash
curl -X POST "http://localhost:3000/api/sales" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"product_id":"123","quantity":1,"price":100}],"total":100}' | jq
```

Verify:
- [ ] New order created with status='pending'

#### Test 3.3: PATCH /api/sales/:id
```bash
curl -X PATCH "http://localhost:3000/api/sales/ORDER_ID" \
  -H "Content-Type: application/json" \
  -d '{"status":"processed"}' | jq
```

Verify:
- [ ] Status updated successfully
- [ ] Response shows new status

### 4. Performance Monitoring

#### Monitor 4.1: Database Performance
```sql
-- Check query performance
EXPLAIN ANALYZE
SELECT * FROM Sales WHERE Status = 'pending';
```

#### Monitor 4.2: Application Response Times
- [ ] Check application logs for slow queries
- [ ] Monitor API response times
- [ ] Verify no performance degradation

### 5. Error Log Review

#### Check 5.1: Application Logs
```bash
# Check for errors in application logs
tail -n 100 logs/application.log | grep -i error
```

#### Check 5.2: Database Logs
```bash
# Check PostgreSQL logs
tail -n 100 /var/log/postgresql/postgresql-*.log | grep -i error
```

### 6. Final Sign-Off

- [ ] **All verification checks passed**
- [ ] **Application functionality confirmed**
- [ ] **No errors in logs**
- [ ] **Performance acceptable**
- [ ] **Team approval obtained**

---

## Rollback Procedure

### When to Rollback

Consider rollback if:
- Migration verification fails
- Data integrity issues detected
- Application functionality broken
- Critical bugs discovered
- Stakeholder decision to revert

### Rollback Prerequisites

- [ ] Have the migration batch ID ready
- [ ] Verify audit log entries exist
- [ ] Ensure database backup is available
- [ ] Application still in maintenance mode

### Rollback Execution Steps

#### Step 1: Prepare for Rollback
```bash
# Verify batch ID exists
npm run db:query "SELECT COUNT(*) FROM MigrationAuditLog WHERE migration_batch = 'migration_XXXXX'"
```

#### Step 2: Execute Rollback Script
```bash
# Run rollback with your batch ID
npm run rollback:order-status migration_XXXXX 2>&1 | tee logs/rollback_$(date +%Y%m%d_%H%M%S).log
```

#### Step 3: Monitor Rollback Progress
Watch for:
- Restoration progress updates
- Constraint restoration
- Audit log cleanup
- Verification results

**Expected Output:**
```
🔄 Order Status Rollback
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Batch ID: migration_XXXXX
🔄 Restoring Old Status Values
  Restored 1000 orders...
  Restored 2000 orders...
✅ Rollback completed successfully!
```

#### Step 4: Verify Rollback
```sql
-- Check status distribution
SELECT Status, COUNT(*) as count
FROM Sales
GROUP BY Status
ORDER BY Status;
```

Should show original statuses:
- draft: _______
- printed: _______
- completed: _______
- cancelled: _______

#### Step 5: Test Application
- [ ] Create test order
- [ ] Complete test order
- [ ] Verify old status system working
- [ ] Check UI displays correctly

#### Step 6: Restore Normal Operations
- [ ] Disable maintenance mode
- [ ] Restart background jobs
- [ ] Notify stakeholders of rollback
- [ ] Document rollback reason

### Rollback Troubleshooting

#### Issue: Batch ID Not Found
```sql
-- Find available batch IDs
SELECT DISTINCT migration_batch, COUNT(*) as order_count
FROM MigrationAuditLog
GROUP BY migration_batch
ORDER BY migration_batch DESC;
```

#### Issue: Rollback Script Fails
1. Check error message in output
2. Verify database connectivity
3. Check for table locks
4. Review database logs
5. Contact database administrator

#### Issue: Partial Rollback
- Transaction ensures atomicity
- If rollback fails, no changes are applied
- Safe to retry rollback command

---

## Emergency Procedures

### Emergency Contact List

| Role | Name | Contact |
|------|------|---------|
| Database Administrator | _______ | _______ |
| Backend Lead | _______ | _______ |
| DevOps Engineer | _______ | _______ |
| Product Manager | _______ | _______ |

### Critical Failure Scenarios

#### Scenario 1: Migration Hangs
**Symptoms**: Script stops responding, no progress updates

**Actions**:
1. Do NOT kill the process immediately
2. Check database for active queries:
   ```sql
   SELECT pid, query, state, query_start
   FROM pg_stat_activity
   WHERE state = 'active';
   ```
3. If query is running, wait for timeout
4. If truly hung, contact DBA before terminating

#### Scenario 2: Database Connection Lost
**Symptoms**: Connection error during migration

**Actions**:
1. Transaction will automatically rollback
2. Verify database state:
   ```sql
   SELECT Status, COUNT(*) FROM Sales GROUP BY Status;
   ```
3. If old statuses present, migration was rolled back
4. Fix connectivity issue
5. Retry migration from beginning

#### Scenario 3: Verification Fails
**Symptoms**: Post-migration counts don't match

**Actions**:
1. Do NOT proceed with application restart
2. Document the discrepancy
3. Check audit log for missing entries
4. Consult with database administrator
5. Consider rollback if issue cannot be resolved

#### Scenario 4: Application Won't Start
**Symptoms**: Application crashes after migration

**Actions**:
1. Check application logs for specific errors
2. Verify database constraint is correct
3. Check for code expecting old status values
4. If critical, execute rollback immediately
5. Fix application code before retry

### Data Recovery

If rollback fails and backup is needed:

```bash
# Restore from backup
pg_restore -h $DB_HOST -U $DB_USER -d $DB_NAME -v backup_before_migration_TIMESTAMP.dump

# Verify restoration
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT Status, COUNT(*) FROM Sales GROUP BY Status;"
```

---

## Post-Migration Tasks

### Immediate (Within 1 hour)

- [ ] **Disable Maintenance Mode**
  - Remove maintenance page
  - Enable order creation
  - Restart background jobs

- [ ] **Monitor Application**
  - Watch error logs for 30 minutes
  - Monitor user activity
  - Check for unusual patterns

- [ ] **Send Success Notification**
  - Notify team of successful migration
  - Share final metrics
  - Document any issues encountered

### Short-term (Within 24 hours)

- [ ] **Update Documentation**
  - Update API documentation with new status values
  - Update user guides
  - Update developer documentation

- [ ] **Performance Review**
  - Analyze migration duration
  - Review database performance metrics
  - Document lessons learned

- [ ] **Cleanup Old References**
  - Search codebase for old status references
  - Update comments and documentation
  - Remove deprecated code

### Long-term (Within 1 week)

- [ ] **Archive Migration Artifacts**
  - Store migration logs
  - Archive database backups (after retention period)
  - Document migration in change log

- [ ] **Team Retrospective**
  - Review what went well
  - Identify improvement areas
  - Update runbook based on experience

- [ ] **Monitor Audit Log Size**
  - Check MigrationAuditLog table size
  - Consider archiving after 30 days
  - Plan for eventual cleanup

---

## Appendix

### A. Estimated Timelines

| Database Size | Migration Time | Verification Time | Total Time |
|---------------|----------------|-------------------|------------|
| < 10,000 orders | 2-5 minutes | 3 minutes | 5-10 minutes |
| 10,000 - 50,000 | 5-15 minutes | 5 minutes | 10-20 minutes |
| 50,000 - 100,000 | 15-30 minutes | 5 minutes | 20-35 minutes |
| > 100,000 orders | 30-50 minutes | 10 minutes | 40-60 minutes |

### B. SQL Queries Reference

#### Check Migration Status
```sql
SELECT 
  migration_batch,
  COUNT(*) as total_migrated,
  MIN(migrated_at) as started_at,
  MAX(migrated_at) as completed_at
FROM MigrationAuditLog
GROUP BY migration_batch
ORDER BY started_at DESC;
```

#### Find Orders by Old Status
```sql
-- This should return 0 rows after migration
SELECT Id, Status, CreatedAt
FROM Sales
WHERE Status IN ('draft', 'printed', 'completed', 'cancelled')
LIMIT 10;
```

#### Audit Log Analysis
```sql
SELECT 
  old_status,
  new_status,
  COUNT(*) as count,
  MIN(migrated_at) as first_migration,
  MAX(migrated_at) as last_migration
FROM MigrationAuditLog
WHERE migration_batch = 'migration_XXXXX'
GROUP BY old_status, new_status;
```

### C. Troubleshooting Common Issues

#### Issue: "Status constraint violation"
**Cause**: Attempting to insert old status value after migration

**Solution**: Update application code to use new status values

#### Issue: "Batch size too large"
**Cause**: Memory issues with large batches

**Solution**: Reduce batch size in migration script (default: 1000)

#### Issue: "Timeout during migration"
**Cause**: Database performance issues

**Solution**: 
- Check database load
- Increase timeout settings
- Run during off-peak hours

### D. Related Documentation

- [Migration Script README](../scripts/README-order-status-migration.md)
- [Rollback Guide](../scripts/ROLLBACK-GUIDE.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Design Document](../../.kiro/specs/pos-sales-ui-improvements/design.md)
- [Requirements Document](../../.kiro/specs/pos-sales-ui-improvements/requirements.md)

### E. Checklist Summary

**Pre-Migration** (30 items)
- Environment: 4 items
- Backup: 3 items
- Validation: 4 items
- Application: 3 items
- Team: 2 items
- Staging: 3 items

**Migration Execution** (11 items)
- Pre-checks: 3 items
- Execution: 3 items
- Verification: 4 items

**Post-Migration** (25 items)
- Data Integrity: 3 items
- Functionality: 5 items
- API: 3 items
- Performance: 2 items
- Logs: 2 items
- Sign-off: 6 items

**Total Checklist Items**: 66

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-XX | Development Team | Initial runbook creation |

---

## Approval Signatures

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Database Administrator | _______ | _______ | _______ |
| Backend Lead | _______ | _______ | _______ |
| DevOps Engineer | _______ | _______ | _______ |
| Product Manager | _______ | _______ | _______ |

---

**End of Runbook**
