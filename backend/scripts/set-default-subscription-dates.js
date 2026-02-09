/**
 * Set default subscription dates for existing users
 */

const sql = require('mssql');

const config = {
  server: '118.69.126.49',
  database: 'Data_quanlybanhang_online',
  user: 'userquanlybanhangonline',
  password: '123456789',
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

async function setDefaultDates() {
  let pool;
  
  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('✓ Connected successfully!\n');
    
    // Get users without subscription dates
    const usersWithoutDates = await pool.request().query(`
      SELECT id, email, max_stores, subscription_plan_id
      FROM Users
      WHERE subscription_end_date IS NULL
    `);
    
    console.log(`Found ${usersWithoutDates.recordset.length} users without subscription dates\n`);
    
    if (usersWithoutDates.recordset.length === 0) {
      console.log('All users already have subscription dates!');
      return;
    }
    
    // Set dates for each user
    for (const user of usersWithoutDates.recordset) {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1); // Add 1 month
      
      // Determine plan based on max_stores
      let planId = 'basic';
      if (user.max_stores >= 999) {
        planId = 'enterprise';
      } else if (user.max_stores >= 5) {
        planId = 'pro';
      }
      
      await pool.request()
        .input('userId', sql.NVarChar, user.id)
        .input('planId', sql.NVarChar, planId)
        .input('startDate', sql.DateTime, now)
        .input('endDate', sql.DateTime, endDate)
        .query(`
          UPDATE Users
          SET subscription_plan_id = @planId,
              subscription_start_date = @startDate,
              subscription_end_date = @endDate,
              subscription_status = 'active',
              auto_renewal = 1,
              updated_at = GETDATE()
          WHERE id = @userId
        `);
      
      console.log(`✓ Updated user ${user.email}:`);
      console.log(`  Plan: ${planId}`);
      console.log(`  Start: ${now.toLocaleDateString('vi-VN')}`);
      console.log(`  End: ${endDate.toLocaleDateString('vi-VN')}`);
      console.log('');
    }
    
    console.log(`\n✓ Updated ${usersWithoutDates.recordset.length} users successfully!`);
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
    
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

setDefaultDates()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Failed:', err);
    process.exit(1);
  });
