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

async function addColumns() {
  let pool;
  try {
    pool = await sql.connect(config);
    console.log('Connected to database\n');
    
    // Add subscription_plan_id
    try {
      await pool.request().query(`
        ALTER TABLE Users ADD subscription_plan_id NVARCHAR(50) NULL
      `);
      console.log('✓ Added subscription_plan_id column');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('✓ subscription_plan_id already exists');
      } else {
        throw err;
      }
    }
    
    // Add auto_renewal
    try {
      await pool.request().query(`
        ALTER TABLE Users ADD auto_renewal BIT DEFAULT 1
      `);
      console.log('✓ Added auto_renewal column');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('✓ auto_renewal already exists');
      } else {
        throw err;
      }
    }
    
    // Update existing users
    await pool.request().query(`
      UPDATE Users
      SET subscription_plan_id = CASE
            WHEN max_stores >= 999 THEN 'enterprise'
            WHEN max_stores >= 5 THEN 'pro'
            ELSE 'basic'
          END,
          auto_renewal = 1
      WHERE subscription_plan_id IS NULL
    `);
    console.log('✓ Updated existing users with default values');
    
    console.log('\n✓ All columns added successfully!');
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    if (pool) await pool.close();
  }
}

addColumns();
