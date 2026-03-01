import sql from 'mssql';
import dotenv from 'dotenv';
import path from 'path';

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
};

async function quickFix() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('🔧 Quick Fix: Auto-Renewal\n');
    
    pool = await sql.connect(config);
    console.log('✅ Connected to database\n');

    // 1. Check if column exists
    console.log('1️⃣ Checking auto_renewal column...');
    const columnCheck = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'auto_renewal'
    `);

    if (columnCheck.recordset.length === 0) {
      console.log('   ⚠️  Column does not exist. Creating...');
      await pool.request().query(`
        ALTER TABLE Users ADD auto_renewal BIT DEFAULT 1
      `);
      console.log('   ✅ Column created\n');
    } else {
      console.log('   ✅ Column exists\n');
    }

    // 2. Fix NULL values
    console.log('2️⃣ Fixing NULL values...');
    const nullFix = await pool.request().query(`
      UPDATE Users 
      SET auto_renewal = 1 
      WHERE auto_renewal IS NULL
    `);
    console.log(`   ✅ Fixed ${nullFix.rowsAffected[0]} NULL values\n`);

    // 3. Enable auto-renewal for all non-basic plans
    console.log('3️⃣ Enabling auto-renewal for Standard/Premium plans...');
    const enableResult = await pool.request().query(`
      UPDATE Users 
      SET auto_renewal = 1 
      WHERE subscription_plan_id IN ('standard', 'premium', 'pro', 'enterprise')
        AND subscription_status = 'active'
        AND auto_renewal = 0
    `);
    console.log(`   ✅ Enabled for ${enableResult.rowsAffected[0]} users\n`);

    // 4. Show summary
    console.log('4️⃣ Summary:');
    const summary = await pool.request().query(`
      SELECT 
        subscription_plan_id,
        subscription_status,
        auto_renewal,
        COUNT(*) as count
      FROM Users
      GROUP BY subscription_plan_id, subscription_status, auto_renewal
      ORDER BY subscription_plan_id, subscription_status, auto_renewal
    `);

    console.log('\n   Users by plan and auto-renewal status:');
    console.log('   ┌─────────────┬──────────┬──────────────┬───────┐');
    console.log('   │ Plan        │ Status   │ Auto-Renewal │ Count │');
    console.log('   ├─────────────┼──────────┼──────────────┼───────┤');
    
    summary.recordset.forEach(row => {
      const plan = (row.subscription_plan_id || 'basic').padEnd(11);
      const status = (row.subscription_status || 'active').padEnd(8);
      const autoRenewal = (row.auto_renewal ? 'ON' : 'OFF').padEnd(12);
      const count = row.count.toString().padStart(5);
      console.log(`   │ ${plan} │ ${status} │ ${autoRenewal} │ ${count} │`);
    });
    
    console.log('   └─────────────┴──────────┴──────────────┴───────┘\n');

    console.log('✅ Quick fix completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Restart your backend server');
    console.log('   2. Clear browser cache (Ctrl+Shift+Delete)');
    console.log('   3. Refresh the subscription page');
    console.log('   4. Try toggling auto-renewal again\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

quickFix()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
