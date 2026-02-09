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

async function debugToggleIssue() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('✓ Connected\n');

    // 1. Check if auto_renewal column exists
    console.log('1. Checking if auto_renewal column exists...');
    const columnCheck = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Users' 
      AND COLUMN_NAME IN ('auto_renewal', 'subscription_plan_id', 'subscription_status')
      ORDER BY COLUMN_NAME
    `);
    
    if (columnCheck.recordset.length === 0) {
      console.log('❌ Required columns not found!');
      console.log('Need to add: auto_renewal, subscription_plan_id, subscription_status');
    } else {
      console.log('✓ Found columns:');
      columnCheck.recordset.forEach((col: any) => {
        console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (nullable: ${col.IS_NULLABLE})`);
      });
    }
    console.log('');

    // 2. Check current values for a user
    console.log('2. Checking current user data...');
    const userData = await pool.request().query(`
      SELECT TOP 1
        id,
        email,
        subscription_plan_id,
        subscription_status,
        auto_renewal,
        subscription_start_date,
        subscription_end_date
      FROM Users
      WHERE email = 'admin@example.com'
    `);

    if (userData.recordset.length > 0) {
      const user = userData.recordset[0];
      console.log('User data:', {
        id: user.id,
        email: user.email,
        subscription_plan_id: user.subscription_plan_id,
        subscription_status: user.subscription_status,
        auto_renewal: user.auto_renewal,
        subscription_start_date: user.subscription_start_date,
        subscription_end_date: user.subscription_end_date,
      });
    } else {
      console.log('❌ User not found');
    }
    console.log('');

    // 3. Try to update auto_renewal
    console.log('3. Testing UPDATE query...');
    const userId = userData.recordset[0]?.id;
    if (userId) {
      const currentValue = userData.recordset[0].auto_renewal;
      const newValue = currentValue === 1 ? 0 : 1;
      
      console.log(`Attempting to change auto_renewal from ${currentValue} to ${newValue}...`);
      
      const updateResult = await pool.request()
        .input('userId', sql.UniqueIdentifier, userId)
        .input('autoRenewal', sql.Bit, newValue)
        .query(`
          UPDATE Users 
          SET auto_renewal = @autoRenewal, updated_at = GETDATE() 
          WHERE id = @userId
        `);
      
      console.log('✓ Update successful, rows affected:', updateResult.rowsAffected[0]);
      
      // Verify the change
      const verifyResult = await pool.request()
        .input('userId', sql.UniqueIdentifier, userId)
        .query(`SELECT auto_renewal FROM Users WHERE id = @userId`);
      
      console.log('✓ Verified new value:', verifyResult.recordset[0].auto_renewal);
      
      // Change it back
      await pool.request()
        .input('userId', sql.UniqueIdentifier, userId)
        .input('autoRenewal', sql.Bit, currentValue)
        .query(`
          UPDATE Users 
          SET auto_renewal = @autoRenewal, updated_at = GETDATE() 
          WHERE id = @userId
        `);
      console.log('✓ Restored original value');
    }
    console.log('');

    // 4. Check AuditLogs table
    console.log('4. Checking if AuditLogs table exists...');
    const auditTableCheck = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'AuditLogs'
    `);
    
    if (auditTableCheck.recordset.length === 0) {
      console.log('⚠️  AuditLogs table does not exist - this might cause the 500 error!');
      console.log('The backend tries to insert into AuditLogs after updating auto_renewal');
    } else {
      console.log('✓ AuditLogs table exists');
      
      // Check columns
      const auditColumns = await pool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'AuditLogs'
        ORDER BY ORDINAL_POSITION
      `);
      console.log('Columns:', auditColumns.recordset.map((c: any) => c.COLUMN_NAME).join(', '));
    }

    console.log('\n✅ Debug complete!');
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

debugToggleIssue();
