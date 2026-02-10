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

async function testBackendResponse() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Testing what backend receives from database...\n');
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('✓ Connected\n');

    const testUserId = 'A4660FF2-2C59-4605-A0BF-1B2B836D8B40'; // nhan@lhu.edu.vn

    // Query exactly like backend does
    const userQuery = `
      SELECT 
        ISNULL(max_stores, 999) as max_stores,
        subscription_plan_id,
        subscription_start_date,
        subscription_end_date,
        auto_renewal,
        subscription_status
      FROM Users
      WHERE id = @userId
    `;

    const result = await pool.request()
      .input('userId', sql.UniqueIdentifier, testUserId)
      .query(userQuery);

    const user = result.recordset[0];
    
    console.log('Raw database response:');
    console.log('  auto_renewal value:', user.auto_renewal);
    console.log('  auto_renewal type:', typeof user.auto_renewal);
    console.log('  auto_renewal === 1:', user.auto_renewal === 1);
    console.log('  auto_renewal === true:', user.auto_renewal === true);
    console.log('  auto_renewal === 0:', user.auto_renewal === 0);
    console.log('  auto_renewal === false:', user.auto_renewal === false);
    console.log('  Boolean(auto_renewal):', Boolean(user.auto_renewal));
    console.log('');

    // Test the conversion logic
    const autoRenewal = user?.auto_renewal === null ? true : Boolean(user?.auto_renewal);
    console.log('After conversion (Boolean):');
    console.log('  autoRenewal:', autoRenewal);
    console.log('  type:', typeof autoRenewal);
    console.log('');

    // Test with different values
    console.log('Testing with auto_renewal = 0...');
    await pool.request()
      .input('userId', sql.UniqueIdentifier, testUserId)
      .query(`UPDATE Users SET auto_renewal = 0 WHERE id = @userId`);
    
    const result0 = await pool.request()
      .input('userId', sql.UniqueIdentifier, testUserId)
      .query(userQuery);
    
    const user0 = result0.recordset[0];
    console.log('  Raw value:', user0.auto_renewal, '(type:', typeof user0.auto_renewal + ')');
    console.log('  Boolean():', Boolean(user0.auto_renewal));
    console.log('');

    console.log('Testing with auto_renewal = 1...');
    await pool.request()
      .input('userId', sql.UniqueIdentifier, testUserId)
      .query(`UPDATE Users SET auto_renewal = 1 WHERE id = @userId`);
    
    const result1 = await pool.request()
      .input('userId', sql.UniqueIdentifier, testUserId)
      .query(userQuery);
    
    const user1 = result1.recordset[0];
    console.log('  Raw value:', user1.auto_renewal, '(type:', typeof user1.auto_renewal + ')');
    console.log('  Boolean():', Boolean(user1.auto_renewal));
    console.log('');

    console.log('✅ Test complete!');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

testBackendResponse();
