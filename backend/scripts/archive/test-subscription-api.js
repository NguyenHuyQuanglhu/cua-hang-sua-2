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
  },
};

async function testAPI() {
  let pool;
  try {
    pool = await sql.connect(config);
    
    // Get first user
    const user = await pool.request().query(`
      SELECT TOP 1
        id,
        email,
        max_stores,
        subscription_plan_id,
        subscription_start_date,
        subscription_end_date,
        auto_renewal,
        subscription_status
      FROM Users
      WHERE subscription_end_date IS NOT NULL
    `);
    
    if (user.recordset.length === 0) {
      console.log('No users with subscription dates found');
      return;
    }
    
    const u = user.recordset[0];
    console.log('User:', u.email);
    console.log('Plan:', u.subscription_plan_id);
    console.log('Max Stores:', u.max_stores);
    console.log('Start Date:', u.subscription_start_date);
    console.log('End Date:', u.subscription_end_date);
    console.log('Auto Renewal:', u.auto_renewal);
    console.log('Status:', u.subscription_status);
    
    // Calculate days remaining
    const now = new Date();
    const end = new Date(u.subscription_end_date);
    const diffTime = end.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    console.log('\nCalculated:');
    console.log('Days Remaining:', daysRemaining);
    console.log('Is Expired:', daysRemaining < 0);
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    if (pool) await pool.close();
  }
}

testAPI();
