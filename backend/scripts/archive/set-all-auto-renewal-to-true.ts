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

async function setAllAutoRenewalToTrue() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Setting all users auto_renewal to 1 (enabled)...\n');
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('✓ Connected\n');

    // Update all users
    const result = await pool.request().query(`
      UPDATE Users
      SET auto_renewal = 1,
          updated_at = GETDATE()
      WHERE auto_renewal IS NULL OR auto_renewal = 0
    `);

    console.log(`✓ Updated ${result.rowsAffected[0]} users\n`);

    // Verify
    const verify = await pool.request().query(`
      SELECT 
        email,
        display_name,
        auto_renewal,
        subscription_plan_id,
        subscription_status
      FROM Users
      ORDER BY email
    `);

    console.log('All users:');
    verify.recordset.forEach((user: any) => {
      console.log(`  ${user.email}: auto_renewal = ${user.auto_renewal ? 'ON' : 'OFF'} (${user.subscription_plan_id || 'no plan'})`);
    });

    console.log('\n✅ All users now have auto_renewal enabled!');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

setAllAutoRenewalToTrue();
