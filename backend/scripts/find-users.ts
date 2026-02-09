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

async function findUsers() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('✓ Connected\n');

    console.log('Finding all users...\n');
    const result = await pool.request().query(`
      SELECT 
        id,
        email,
        display_name,
        role,
        subscription_plan_id,
        subscription_status,
        auto_renewal,
        subscription_start_date,
        subscription_end_date,
        created_at
      FROM Users
      ORDER BY created_at DESC
    `);

    console.log(`Found ${result.recordset.length} users:\n`);
    
    result.recordset.forEach((user: any, index: number) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Name: ${user.display_name || 'N/A'}`);
      console.log(`   Role: ${user.role || 'N/A'}`);
      console.log(`   Plan: ${user.subscription_plan_id || 'N/A'}`);
      console.log(`   Status: ${user.subscription_status || 'N/A'}`);
      console.log(`   Auto-renewal: ${user.auto_renewal === 1 ? 'ON' : user.auto_renewal === 0 ? 'OFF' : 'NULL'}`);
      console.log(`   Start: ${user.subscription_start_date || 'N/A'}`);
      console.log(`   End: ${user.subscription_end_date || 'N/A'}`);
      console.log('');
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

findUsers();
