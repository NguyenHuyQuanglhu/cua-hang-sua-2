/**
 * Order Status Migration Script
 * 
 * Migrates order statuses from the old 4-status system to the new 2-status system:
 * - draft → pending
 * - printed → pending
 * - completed → processed
 * - cancelled → processed
 * 
 * Features:
 * - Pre-migration validation
 * - Batch processing (1000 records/batch)
 * - Audit logging for each change
 * - Post-migration verification
 * - Atomic transaction with automatic rollback on error
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

const BATCH_SIZE = 1000;

// Status mapping rules
const STATUS_MAPPING: Record<string, string> = {
  'draft': 'pending',
  'printed': 'pending',
  'completed': 'processed',
  'cancelled': 'processed',
};

interface StatusCount {
  status: string;
  count: number;
}

interface OrderRecord {
  Id: string;
  Status: string;
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
 * Validate that all statuses are recognized
 */
async function validateStatuses(pool: sql.ConnectionPool): Promise<boolean> {
  const result = await pool.request().query<{ status: string }>(`
    SELECT DISTINCT Status as status
    FROM Sales
  `);

  const validOldStatuses = ['draft', 'printed', 'completed', 'cancelled'];
  const validNewStatuses = ['pending', 'processed'];
  const allValidStatuses = [...validOldStatuses, ...validNewStatuses];

  for (const row of result.recordset) {
    if (!allValidStatuses.includes(row.status)) {
      console.error(`❌ Invalid status found: ${row.status}`);
      return false;
    }
  }

  return true;
}

/**
 * Pre-migration validation
 */
async function preMigrationValidation(pool: sql.ConnectionPool): Promise<void> {
  console.log('\n📋 Pre-migration Validation');
  console.log('━'.repeat(50));

  // Count records by status
  const counts = await countOrdersByStatus(pool);
  console.log('Current status distribution:');
  for (const [status, count] of Object.entries(counts)) {
    console.log(`  ${status}: ${count}`);
  }

  const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);
  console.log(`  Total: ${totalRecords}`);

  // Validate all statuses are recognized
  const isValid = await validateStatuses(pool);
  if (!isValid) {
    throw new Error('Invalid statuses found in database');
  }

  console.log('✅ All statuses are valid');
}

/**
 * Migrate orders in batches
 */
async function migrateOrders(transaction: sql.Transaction, batchId: string): Promise<number> {
  console.log('\n🔄 Migrating Orders');
  console.log('━'.repeat(50));

  let totalMigrated = 0;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    // Get batch of orders with old status
    const request = new sql.Request(transaction);
    const result = await request.query<OrderRecord>(`
      SELECT Id, Status
      FROM Sales
      WHERE Status IN ('draft', 'printed', 'completed', 'cancelled')
      ORDER BY Id
      OFFSET ${offset} ROWS
      FETCH NEXT ${BATCH_SIZE} ROWS ONLY
    `);

    const orders = result.recordset;

    if (orders.length === 0) {
      hasMore = false;
      break;
    }

    // Update each order and log
    for (const order of orders) {
      const newStatus = STATUS_MAPPING[order.Status];

      if (!newStatus) {
        throw new Error(`No mapping found for status: ${order.Status}`);
      }

      // Update order status
      const updateRequest = new sql.Request(transaction);
      updateRequest.input('id', sql.NVarChar(36), order.Id);
      updateRequest.input('newStatus', sql.NVarChar(20), newStatus);

      await updateRequest.query(`
        UPDATE Sales
        SET Status = @newStatus, UpdatedAt = GETDATE()
        WHERE Id = @id
      `);

      // Log migration
      const logRequest = new sql.Request(transaction);
      logRequest.input('orderId', sql.NVarChar(36), order.Id);
      logRequest.input('oldStatus', sql.NVarChar(20), order.Status);
      logRequest.input('newStatus', sql.NVarChar(20), newStatus);
      logRequest.input('batchId', sql.NVarChar(50), batchId);

      await logRequest.query(`
        INSERT INTO MigrationAuditLog (order_id, old_status, new_status, migration_batch)
        VALUES (@orderId, @oldStatus, @newStatus, @batchId)
      `);

      totalMigrated++;
    }

    offset += BATCH_SIZE;
    console.log(`  Migrated ${totalMigrated} orders...`);
  }

  return totalMigrated;
}

/**
 * Update database constraint for status field
 */
async function updateStatusConstraint(transaction: sql.Transaction): Promise<void> {
  console.log('\n🔧 Updating Database Constraint');
  console.log('━'.repeat(50));

  const request = new sql.Request(transaction);

  // Drop old constraint if exists
  await request.query(`
    IF EXISTS (
      SELECT * FROM sys.check_constraints 
      WHERE name = 'CK_Sales_Status'
    )
    BEGIN
      ALTER TABLE Sales DROP CONSTRAINT CK_Sales_Status
    END
  `);

  // Add new constraint
  await request.query(`
    ALTER TABLE Sales
    ADD CONSTRAINT CK_Sales_Status
    CHECK (Status IN ('pending', 'processed'))
  `);

  console.log('✅ Status constraint updated');
}

/**
 * Post-migration verification
 */
async function postMigrationVerification(
  pool: sql.ConnectionPool,
  preCounts: Record<string, number>,
  migratedCount: number
): Promise<void> {
  console.log('\n✅ Post-migration Verification');
  console.log('━'.repeat(50));

  // Count records by new status
  const postCounts = await countOrdersByStatus(pool);
  console.log('New status distribution:');
  for (const [status, count] of Object.entries(postCounts)) {
    console.log(`  ${status}: ${count}`);
  }

  const totalRecords = Object.values(postCounts).reduce((sum, count) => sum + count, 0);
  console.log(`  Total: ${totalRecords}`);

  // Verify counts match expected
  const expectedPending = (preCounts.draft || 0) + (preCounts.printed || 0) + (preCounts.pending || 0);
  const expectedProcessed = (preCounts.completed || 0) + (preCounts.cancelled || 0) + (preCounts.processed || 0);

  const actualPending = postCounts.pending || 0;
  const actualProcessed = postCounts.processed || 0;

  console.log('\nVerification:');
  console.log(`  Expected pending: ${expectedPending}, Actual: ${actualPending}`);
  console.log(`  Expected processed: ${expectedProcessed}, Actual: ${actualProcessed}`);
  console.log(`  Records migrated: ${migratedCount}`);

  if (actualPending !== expectedPending) {
    throw new Error(`Pending count mismatch: expected ${expectedPending}, got ${actualPending}`);
  }

  if (actualProcessed !== expectedProcessed) {
    throw new Error(`Processed count mismatch: expected ${expectedProcessed}, got ${actualProcessed}`);
  }

  // Verify no old statuses remain
  const oldStatusCheck = await pool.request().query<{ count: number }>(`
    SELECT COUNT(*) as count
    FROM Sales
    WHERE Status IN ('draft', 'printed', 'completed', 'cancelled')
  `);

  const remainingOldStatuses = oldStatusCheck.recordset[0].count;
  if (remainingOldStatuses > 0) {
    throw new Error(`${remainingOldStatuses} orders still have old status values`);
  }

  console.log('✅ All verifications passed');
}

/**
 * Main migration function
 */
async function migrateOrderStatus(): Promise<void> {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('🚀 Order Status Migration');
    console.log('━'.repeat(50));
    console.log('Mapping:');
    console.log('  draft → pending');
    console.log('  printed → pending');
    console.log('  completed → processed');
    console.log('  cancelled → processed');
    console.log('━'.repeat(50));

    // Connect to database
    console.log('\n🔌 Connecting to database...');
    pool = await sql.connect(config);
    console.log('✅ Connected to database');

    // Pre-migration validation
    await preMigrationValidation(pool);
    const preCounts = await countOrdersByStatus(pool);

    // Generate batch ID
    const batchId = `migration_${Date.now()}`;
    console.log(`\n📦 Batch ID: ${batchId}`);

    // Start transaction
    console.log('\n🔒 Starting transaction...');
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Migrate orders
      const migratedCount = await migrateOrders(transaction, batchId);

      // Update constraint
      await updateStatusConstraint(transaction);

      // Commit transaction
      console.log('\n💾 Committing transaction...');
      await transaction.commit();
      console.log('✅ Transaction committed');

      // Post-migration verification
      await postMigrationVerification(pool, preCounts, migratedCount);

      console.log('\n🎉 Migration completed successfully!');
      console.log(`Total orders migrated: ${migratedCount}`);

    } catch (error) {
      console.error('\n❌ Error during migration, rolling back...');
      await transaction.rollback();
      console.log('✅ Transaction rolled back');
      throw error;
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run migration
if (require.main === module) {
  migrateOrderStatus()
    .then(() => {
      console.log('\n✅ Done');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error:', error);
      process.exit(1);
    });
}

export { migrateOrderStatus };
