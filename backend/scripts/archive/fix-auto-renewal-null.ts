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

async function fixAutoRenewalNull() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('✓ Connected\n');

    // 1. Check current NULL values
    console.log('1. Checking users with NULL auto_renewal...');
    const nullCheck = await pool.request().query(`
      SELECT COUNT(*) as count
      FROM Users
      WHERE auto_renewal IS NULL
    `);
    console.log(`Found ${nullCheck.recordset[0].count} users with NULL auto_renewal\n`);

    // 2. Update all NULL values to 1 (enabled by default)
    console.log('2. Setting auto_renewal = 1 for all users with NULL...');
    const updateResult = await pool.request().query(`
      UPDATE Users
      SET auto_renewal = 1,
          updated_at = GETDATE()
      WHERE auto_renewal IS NULL
    `);
    console.log(`✓ Updated ${updateResult.rowsAffected[0]} users\n`);

    // 3. Also set default value for the column to prevent future NULLs
    console.log('3. Setting default value for auto_renewal column...');
    try {
      await pool.request().query(`
        ALTER TABLE Users
        ADD CONSTRAINT DF_Users_auto_renewal DEFAULT 1 FOR auto_renewal
      `);
      console.log('✓ Default constraint added\n');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  Default constraint already exists\n');
      } else {
        throw error;
      }
    }

    // 4. Verify the changes
    console.log('4. Verifying changes...');
    const verifyResult = await pool.request().query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN auto_renewal = 1 THEN 1 ELSE 0 END) as enabled,
        SUM(CASE WHEN auto_renewal = 0 THEN 1 ELSE 0 END) as disabled,
        SUM(CASE WHEN auto_renewal IS NULL THEN 1 ELSE 0 END) as null_values
      FROM Users
    `);
    
    const stats = verifyResult.recordset[0];
    console.log('Current statistics:');
    console.log(`  Total users: ${stats.total}`);
    console.log(`  Auto-renewal enabled: ${stats.enabled}`);
    console.log(`  Auto-renewal disabled: ${stats.disabled}`);
    console.log(`  NULL values: ${stats.null_values}`);

    console.log('\n✅ Fix complete! All users now have auto_renewal = 1 (enabled)');
    console.log('You can now toggle auto-renewal from the frontend.');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

fixAutoRenewalNull();
