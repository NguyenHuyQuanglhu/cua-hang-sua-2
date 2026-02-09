import sql from 'mssql';

const config = {
  server: '118.69.126.49',
  database: 'Data_quanlybanhang_online',
  user: 'userquanlybanhangonline',
  password: '123456789',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function fixAuditLogsStoreId() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('✓ Connected\n');

    console.log('Making store_id column nullable in AuditLogs...');
    
    // First, check if there's a default constraint
    const constraintCheck = await pool.request().query(`
      SELECT name
      FROM sys.default_constraints
      WHERE parent_object_id = OBJECT_ID('AuditLogs')
      AND parent_column_id = (
        SELECT column_id 
        FROM sys.columns 
        WHERE object_id = OBJECT_ID('AuditLogs') 
        AND name = 'store_id'
      )
    `);

    if (constraintCheck.recordset.length > 0) {
      const constraintName = constraintCheck.recordset[0].name;
      console.log(`Dropping default constraint: ${constraintName}`);
      await pool.request().query(`
        ALTER TABLE AuditLogs DROP CONSTRAINT ${constraintName}
      `);
    }

    // Make the column nullable
    await pool.request().query(`
      ALTER TABLE AuditLogs
      ALTER COLUMN store_id UNIQUEIDENTIFIER NULL
    `);
    
    console.log('✓ store_id column is now nullable\n');

    // Test insert without store_id
    console.log('Testing insert without store_id...');
    const testUserId = 'A4660FF2-2C59-4605-A0BF-1B2B836D8B40';
    
    await pool.request()
      .input('userId', sql.UniqueIdentifier, testUserId)
      .input('details', sql.NVarChar(sql.MAX), JSON.stringify({ 
        test: true, 
        timestamp: new Date().toISOString() 
      }))
      .query(`
        INSERT INTO AuditLogs (id, user_id, action, entity_type, entity_id, details, created_at)
        VALUES (NEWID(), @userId, 'test_subscription_toggle', 'subscription', @userId, @details, GETDATE())
      `);
    
    console.log('✓ Test insert successful!');
    
    // Clean up
    await pool.request().query(`
      DELETE FROM AuditLogs 
      WHERE action = 'test_subscription_toggle' AND entity_type = 'subscription'
    `);
    console.log('✓ Test record cleaned up');

    console.log('\n✅ AuditLogs table is now ready for subscription operations!');
    console.log('You can now toggle auto-renewal from the frontend.');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

fixAuditLogsStoreId();
