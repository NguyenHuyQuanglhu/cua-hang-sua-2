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

async function checkSubscriptionHistoryTable() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Checking SubscriptionHistory table...\n');
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('✓ Connected\n');

    // Check if table exists
    console.log('1. Checking if SubscriptionHistory table exists...');
    const tableCheck = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'SubscriptionHistory'
    `);

    if (tableCheck.recordset.length === 0) {
      console.log('❌ SubscriptionHistory table does NOT exist!');
      console.log('This is causing the cancel subscription error.\n');
      
      console.log('Creating SubscriptionHistory table...');
      await pool.request().query(`
        CREATE TABLE SubscriptionHistory (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          user_id UNIQUEIDENTIFIER NOT NULL,
          plan_id NVARCHAR(50) NOT NULL,
          max_stores INT NOT NULL,
          amount DECIMAL(18, 2) NOT NULL,
          payment_method NVARCHAR(50),
          start_date DATETIME2 NOT NULL,
          end_date DATETIME2 NOT NULL,
          status NVARCHAR(20) NOT NULL DEFAULT 'active',
          auto_renewal BIT DEFAULT 1,
          created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
          updated_at DATETIME2,
          FOREIGN KEY (user_id) REFERENCES Users(id)
        )
      `);
      console.log('✓ SubscriptionHistory table created!\n');
    } else {
      console.log('✓ SubscriptionHistory table exists\n');
      
      // Check columns
      console.log('2. Checking table structure...');
      const columns = await pool.request().query(`
        SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'SubscriptionHistory'
        ORDER BY ORDINAL_POSITION
      `);
      
      console.log('Columns:');
      columns.recordset.forEach((col: any) => {
        console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
      });
      console.log('');
    }

    // Check if there are any records
    console.log('3. Checking existing records...');
    const count = await pool.request().query(`
      SELECT COUNT(*) as count FROM SubscriptionHistory
    `);
    console.log(`Found ${count.recordset[0].count} record(s)\n`);

    // Test cancel operation
    console.log('4. Testing cancel operation...');
    const testUserId = 'BF92C2D7-1E37-408A-9EE2-FA6B2F228EFF'; // bao@lhu.edu.vn (enterprise plan)
    
    // Get current subscription
    const user = await pool.request()
      .input('userId', sql.UniqueIdentifier, testUserId)
      .query(`
        SELECT 
          email,
          subscription_plan_id, 
          subscription_end_date,
          subscription_status,
          auto_renewal
        FROM Users 
        WHERE id = @userId
      `);
    
    if (user.recordset.length === 0) {
      console.log('❌ Test user not found');
    } else {
      const userData = user.recordset[0];
      console.log('Test user:', {
        email: userData.email,
        plan: userData.subscription_plan_id,
        status: userData.subscription_status,
        auto_renewal: userData.auto_renewal,
      });
      
      if (userData.subscription_plan_id === 'basic') {
        console.log('⚠️  Cannot test with basic plan user');
      } else {
        console.log('\nAttempting to cancel subscription...');
        
        // Update subscription status
        await pool.request()
          .input('userId', sql.UniqueIdentifier, testUserId)
          .query(`
            UPDATE Users 
            SET subscription_status = 'cancelled',
                auto_renewal = 0,
                updated_at = GETDATE()
            WHERE id = @userId
          `);
        console.log('✓ Updated Users table');
        
        // Update subscription history (if exists)
        const historyUpdate = await pool.request()
          .input('userId', sql.UniqueIdentifier, testUserId)
          .query(`
            UPDATE SubscriptionHistory
            SET status = 'cancelled'
            WHERE user_id = @userId AND status = 'active'
          `);
        console.log(`✓ Updated ${historyUpdate.rowsAffected[0]} record(s) in SubscriptionHistory`);
        
        // Insert audit log
        await pool.request()
          .input('userId', sql.UniqueIdentifier, testUserId)
          .input('details', sql.NVarChar(sql.MAX), JSON.stringify({ 
            planId: userData.subscription_plan_id,
            endDate: userData.subscription_end_date,
            timestamp: new Date().toISOString() 
          }))
          .query(`
            INSERT INTO AuditLogs (id, user_id, action, entity_type, entity_id, details, created_at)
            VALUES (NEWID(), @userId, 'subscription_cancelled', 'subscription', @userId, @details, GETDATE())
          `);
        console.log('✓ Inserted audit log');
        
        // Restore original status
        await pool.request()
          .input('userId', sql.UniqueIdentifier, testUserId)
          .input('status', sql.NVarChar(20), userData.subscription_status || 'active')
          .input('autoRenewal', sql.Bit, userData.auto_renewal === null ? 1 : userData.auto_renewal)
          .query(`
            UPDATE Users 
            SET subscription_status = @status,
                auto_renewal = @autoRenewal,
                updated_at = GETDATE()
            WHERE id = @userId
          `);
        console.log('✓ Restored original status');
        
        console.log('\n✅ Cancel operation test PASSED!');
      }
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

checkSubscriptionHistoryTable();
