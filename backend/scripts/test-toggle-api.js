/**
 * Test toggle auto-renewal API directly
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
  },
};

async function testToggle() {
  let pool;
  try {
    pool = await sql.connect(config);
    
    // Get first user
    const user = await pool.request().query(`
      SELECT TOP 1 id, email, auto_renewal
      FROM Users
      WHERE subscription_end_date IS NOT NULL
    `);
    
    if (user.recordset.length === 0) {
      console.log('No users found');
      return;
    }
    
    const u = user.recordset[0];
    console.log('Testing with user:', u.email);
    console.log('Current auto_renewal:', u.auto_renewal);
    
    // Toggle it
    const newValue = u.auto_renewal ? 0 : 1;
    console.log('\nToggling to:', newValue);
    
    await pool.request()
      .input('userId', sql.NVarChar, u.id)
      .input('autoRenewal', sql.Bit, newValue)
      .query(`
        UPDATE Users 
        SET auto_renewal = @autoRenewal, 
            updated_at = GETDATE() 
        WHERE id = @userId
      `);
    
    console.log('✓ Updated successfully');
    
    // Verify
    const verify = await pool.request()
      .input('userId', sql.NVarChar, u.id)
      .query(`SELECT auto_renewal FROM Users WHERE id = @userId`);
    
    console.log('New value:', verify.recordset[0].auto_renewal);
    
    // Toggle back
    await pool.request()
      .input('userId', sql.NVarChar, u.id)
      .input('autoRenewal', sql.Bit, u.auto_renewal)
      .query(`
        UPDATE Users 
        SET auto_renewal = @autoRenewal 
        WHERE id = @userId
      `);
    
    console.log('✓ Toggled back to original value');
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    if (pool) await pool.close();
  }
}

testToggle();
