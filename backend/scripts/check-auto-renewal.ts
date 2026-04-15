import sql from 'mssql';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const config: sql.config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'master',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

async function checkAutoRenewal() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('🔌 Connecting to database...');
    pool = await sql.connect(config);
    console.log('✅ Connected successfully\n');

    // Check if auto_renewal column exists
    console.log('📋 Checking auto_renewal column...');
    const columnCheck = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'auto_renewal'
    `);

    if (columnCheck.recordset.length === 0) {
      console.log('❌ Column auto_renewal does not exist!');
      console.log('🔧 Creating auto_renewal column...');
      
      await pool.request().query(`
        ALTER TABLE Users 
        ADD auto_renewal BIT DEFAULT 1
      `);
      
      console.log('✅ Column created successfully\n');
    } else {
      console.log('✅ Column exists:');
      console.log(columnCheck.recordset[0]);
      console.log('');
    }

    // Check current users and their auto_renewal status
    console.log('👥 Checking users auto_renewal status...');
    const users = await pool.request().query(`
      SELECT 
        id,
        username,
        email,
        subscription_plan_id,
        subscription_status,
        auto_renewal,
        subscription_start_date,
        subscription_end_date
      FROM Users
      ORDER BY created_at DESC
    `);

    console.log(`Found ${users.recordset.length} users:\n`);
    
    users.recordset.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.email})`);
      console.log(`   Plan: ${user.subscription_plan_id || 'basic'}`);
      console.log(`   Status: ${user.subscription_status || 'active'}`);
      console.log(`   Auto-renewal: ${user.auto_renewal === null ? 'NULL' : user.auto_renewal ? 'ON' : 'OFF'}`);
      if (user.subscription_start_date) {
        console.log(`   Start: ${new Date(user.subscription_start_date).toLocaleDateString('vi-VN')}`);
      }
      if (user.subscription_end_date) {
        console.log(`   End: ${new Date(user.subscription_end_date).toLocaleDateString('vi-VN')}`);
      }
      console.log('');
    });

    // Fix NULL auto_renewal values
    console.log('🔧 Fixing NULL auto_renewal values...');
    const updateResult = await pool.request().query(`
      UPDATE Users 
      SET auto_renewal = 1 
      WHERE auto_renewal IS NULL
    `);
    
    console.log(`✅ Updated ${updateResult.rowsAffected[0]} users with NULL auto_renewal\n`);

    // Check subscription history
    console.log('📜 Checking subscription history...');
    const history = await pool.request().query(`
      SELECT TOP 10
        sh.id,
        u.username,
        sh.plan_id,
        sh.amount,
        sh.payment_method,
        sh.status,
        sh.auto_renewal,
        sh.start_date,
        sh.end_date,
        sh.created_at
      FROM SubscriptionHistory sh
      INNER JOIN Users u ON sh.user_id = u.id
      ORDER BY sh.created_at DESC
    `);

    if (history.recordset.length > 0) {
      console.log(`Found ${history.recordset.length} recent subscription records:\n`);
      history.recordset.forEach((record, index) => {
        console.log(`${index + 1}. ${record.username} - ${record.plan_id}`);
        console.log(`   Amount: ${record.amount?.toLocaleString('vi-VN')} VND`);
        console.log(`   Method: ${record.payment_method}`);
        console.log(`   Status: ${record.status}`);
        console.log(`   Auto-renewal: ${record.auto_renewal ? 'ON' : 'OFF'}`);
        console.log(`   Date: ${new Date(record.created_at).toLocaleString('vi-VN')}`);
        console.log('');
      });
    } else {
      console.log('No subscription history found\n');
    }

    console.log('✅ Check completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the check
checkAutoRenewal()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
