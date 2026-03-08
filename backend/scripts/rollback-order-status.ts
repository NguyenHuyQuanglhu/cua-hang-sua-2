/**
 * Order Status Rollback Script
 * 
 * Rolls back order status migration from the new 2-status system to the old 4-status system
 * using the audit log entries created during migration.
 * 
 * Features:
 * - Restores old status values from audit log
 * - Restores old database constraint
 * - Accepts batch ID parameter to rollback specific migration
 * - Atomic transaction with automatic rollback on error
 * - Verification of rollback completion
 */

import * as dotenv from 'dotenv';
import * as sql from 'mssql';

dotenv.config();

const config: sql.config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'SmartInventory',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT !== 'false',
  },
};

interface AuditLogEntry {
  id: number;
  order_id: string;
  old_status: string;
  new_status: string;
  migrated_at: Date;
  migration_batch: string;
}

interface StatusCount {
  status: string;
  count: number;
}

/**
 * Count orders by status
 */
async function countOrdersByStatus(pool: sql.ConnectionPool): Promise<Record<string, number>> {
  const result = await pool.request().query<StatusCount>(`
    SELECT Status as status, COUNT(*) as count
    FROM Sales
    GROUP BY Status
  `);

  const counts: Record<string, number> = {};
  for (const row of result.recordset) {
    counts[row.status] = row.count;
  }

  return counts;
}

/**
 * Verify batch ID exists in audit log
 */
async function verifyBatchExists(pool: sql.ConnectionPool, batchId: string): Promise<number> {
  const request = pool.request();
  request.input('batchId', sql.NVarChar(50), batchId);

  const result = await request.query<{ count: number }>(`
    SELECT COUNT(*) as count
    FROM MigrationAuditLog
    WHERE migration_batch = @batchId
  `);

  return result.recordset[0].count;
}

/**
 * Pre-rollback validation
 */
async function preRollbackValidation(pool: sql.ConnectionPool, batchId: string): Promise<void> {
  console.log('\n📋 Pre-rollback Validation');
  console.log('━'.repeat(50));

  // Verify batch exists
  const auditCount = await verifyBatchExists(pool, batchId);
  if (auditCount === 0) {
    throw new Error(`No audit log entries found for batch ID: ${batchId}`);
  }

  console.log(`✅ Found ${auditCount} audit log entries for batch: ${batchId}`);

  // Count current status distribution
  const counts = await countOrdersByStatus(pool);
  console.log('Current status distribution:');
  for (const [status, count] of Object.entries(counts)) {
    console.log(`  ${status}: ${count}`);
  }

  const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);
  console.log(`  Total: ${totalRecords}`);
}

/**
 * Restore old status values from audit log
 */
async function restoreOldStatuses(transaction: sql.Transaction, batchId: string): Promise<number> {
  console.log('\n🔄 Restoring Old Status Values');
  console.log('━'.repeat(50));

  // Get all audit log entries for this batch
  const request = new sql.Request(transaction);
  request.input('batchId', sql.NVarChar(50), batchId);

  const result = await request.query<AuditLogEntry>(`
    SELECT id, order_id, old_status, new_status, migrated_at, migration_batch
    FROM MigrationAuditLog
    WHERE migration_batch = @batchId
    ORDER BY id
  `);

  const auditEntries = result.recordset;
  console.log(`Found ${auditEntries.length} orders to rollback`);

  let restoredCount = 0;

  // Restore each order's old status
  for (const entry of auditEntries) {
    const updateRequest = new sql.Request(transaction);
    updateRequest.input('orderId', sql.NVarChar(36), entry.order_id);
    updateRequest.input('oldStatus', sql.NVarChar(20), entry.old_status);

    await updateRequest.query(`
      UPDATE Sales
      SET Status = @oldStatus, UpdatedAt = GETDATE()
      WHERE Id = @orderId
    `);

    restoredCount++;

    if (restoredCount % 100 === 0) {
      console.log(`  Restored ${restoredCount} orders...`);
    }
  }

  console.log(`✅ Restored ${restoredCount} orders to old status values`);
  return restoredCount;
}

/**
 * Restore old database constraint for status field
 */
async function restoreOldConstraint(transaction: sql.Transaction): Promise<void> {
  console.log('\n🔧 Restoring Old Database Constraint');
  console.log('━'.repeat(50));

  const request = new sql.Request(transaction);

  // Drop new constraint if exists
  await request.query(`
    IF EXISTS (
      SELECT * FROM sys.check_constraints 
      WHERE name = 'CK_Sales_Status'
    )
    BEGIN
      ALTER TABLE Sales DROP CONSTRAINT CK_Sales_Status
    END
  `);

  // Add old constraint
  await request.query(`
    ALTER TABLE Sales
    ADD CONSTRAINT CK_Sales_Status
    CHECK (Status IN ('draft', 'printed', 'completed', 'cancelled'))
  `);

  console.log('✅ Status constraint restored to old values');
}

/**
 * Delete audit log entries for this batch
 */
async function deleteAuditLogEntries(transaction: sql.Transaction, batchId: string): Promise<void> {
  console.log('\n🗑️  Deleting Audit Log Entries');
  console.log('━'.repeat(50));

  const request = new sql.Request(transaction);
  request.input('batchId', sql.NVarChar(50), batchId);

  const result = await request.query(`
    DELETE FROM MigrationAuditLog
    WHERE migration_batch = @batchId
  `);

  console.log(`✅ Deleted ${result.rowsAffected[0]} audit log entries`);
}

/**
 * Post-rollback verification
 */
async function postRollbackVerification(
  pool: sql.ConnectionPool,
  batchId: string,
  restoredCount: number
): Promise<void> {
  console.log('\n✅ Post-rollback Verification');
  console.log('━'.repeat(50));

  // Count records by old status
  const postCounts = await countOrdersByStatus(pool);
  console.log('Status distribution after rollback:');
  for (const [status, count] of Object.entries(postCounts)) {
    console.log(`  ${status}: ${count}`);
  }

  const totalRecords = Object.values(postCounts).reduce((sum, count) => sum + count, 0);
  console.log(`  Total: ${totalRecords}`);
  console.log(`  Records restored: ${restoredCount}`);

  // Verify no new statuses remain (unless they were created after migration)
  const newStatusCheck = await pool.request().query<{ count: number }>(`
    SELECT COUNT(*) as count
    FROM Sales
    WHERE Status IN ('pending', 'processed')
  `);

  const remainingNewStatuses = newStatusCheck.recordset[0].count;
  if (remainingNewStatuses > 0) {
    console.log(`⚠️  Warning: ${remainingNewStatuses} orders still have new status values`);
    console.log('   (These may be orders created after the migration)');
  }

  // Verify audit log entries are deleted
  const auditCount = await verifyBatchExists(pool, batchId);
  if (auditCount > 0) {
    throw new Error(`Audit log entries still exist for batch: ${batchId}`);
  }

  console.log('✅ All verifications passed');
}

/**
 * Main rollback function
 */
async function rollbackOrderStatus(batchId: string): Promise<void> {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('🔄 Order Status Rollback');
    console.log('━'.repeat(50));
    console.log(`Batch ID: ${batchId}`);
    console.log('━'.repeat(50));
    console.log('This will restore:');
    console.log('  pending → original status (draft/printed)');
    console.log('  processed → original status (completed/cancelled)');
    console.log('━'.repeat(50));

    // Connect to database
    console.log('\n🔌 Connecting to database...');
    pool = await sql.connect(config);
    console.log('✅ Connected to database');

    // Pre-rollback validation
    await preRollbackValidation(pool, batchId);

    // Start transaction
    console.log('\n🔒 Starting transaction...');
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Restore old status values
      const restoredCount = await restoreOldStatuses(transaction, batchId);

      // Restore old constraint
      await restoreOldConstraint(transaction);

      // Delete audit log entries
      await deleteAuditLogEntries(transaction, batchId);

      // Commit transaction
      console.log('\n💾 Committing transaction...');
      await transaction.commit();
      console.log('✅ Transaction committed');

      // Post-rollback verification
      await postRollbackVerification(pool, batchId, restoredCount);

      console.log('\n🎉 Rollback completed successfully!');
      console.log(`Total orders restored: ${restoredCount}`);

    } catch (error) {
      console.error('\n❌ Error during rollback, rolling back transaction...');
      await transaction.rollback();
      console.log('✅ Transaction rolled back');
      throw error;
    }

  } catch (error) {
    console.error('\n❌ Rollback failed:', error);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

/**
 * Parse command line arguments
 */
function parseArguments(): string {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('❌ Error: Batch ID is required');
    console.log('\nUsage: npm run rollback-order-status <batch-id>');
    console.log('Example: npm run rollback-order-status migration_1234567890');
    process.exit(1);
  }

  const batchId = args[0];
  return batchId;
}

// Run rollback
if (require.main === module) {
  const batchId = parseArguments();

  rollbackOrderStatus(batchId)
    .then(() => {
      console.log('\n✅ Done');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error:', error);
      process.exit(1);
    });
}

export { rollbackOrderStatus };
