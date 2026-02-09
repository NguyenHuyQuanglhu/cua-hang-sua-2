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

async function checkUsersTriggers() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('✓ Connected\n');

    // Check for triggers on Users table
    console.log('Checking triggers on Users table...');
    const triggers = await pool.request().query(`
      SELECT 
        t.name AS trigger_name,
        t.is_disabled,
        OBJECT_DEFINITION(t.object_id) AS trigger_definition
      FROM sys.triggers t
      INNER JOIN sys.tables tab ON t.parent_id = tab.object_id
      WHERE tab.name = 'Users'
    `);

    if (triggers.recordset.length === 0) {
      console.log('✓ No triggers found on Users table\n');
    } else {
      console.log(`Found ${triggers.recordset.length} trigger(s):\n`);
      triggers.recordset.forEach((trigger: any) => {
        console.log(`Trigger: ${trigger.trigger_name} (${trigger.is_disabled ? 'DISABLED' : 'ENABLED'})`);
        console.log('Definition:');
        console.log(trigger.trigger_definition);
        console.log('\n---\n');
      });
    }

    // Check for constraints
    console.log('Checking constraints on auto_renewal column...');
    const constraints = await pool.request().query(`
      SELECT 
        con.name AS constraint_name,
        con.type_desc AS constraint_type,
        con.definition
      FROM sys.check_constraints con
      INNER JOIN sys.columns col ON con.parent_object_id = col.object_id 
        AND con.parent_column_id = col.column_id
      WHERE col.object_id = OBJECT_ID('Users')
      AND col.name = 'auto_renewal'
    `);

    if (constraints.recordset.length === 0) {
      console.log('✓ No check constraints on auto_renewal column\n');
    } else {
      console.log(`Found ${constraints.recordset.length} constraint(s):\n`);
      constraints.recordset.forEach((con: any) => {
        console.log(`Constraint: ${con.constraint_name} (${con.constraint_type})`);
        console.log(`Definition: ${con.definition}`);
        console.log('');
      });
    }

    // Try direct update with explicit value
    console.log('Testing direct UPDATE with explicit value...');
    const testUserId = 'A4660FF2-2C59-4605-A0BF-1B2B836D8B40';
    
    // First, check current value
    const before = await pool.request()
      .input('userId', sql.UniqueIdentifier, testUserId)
      .query(`SELECT auto_renewal FROM Users WHERE id = @userId`);
    console.log(`Before: auto_renewal = ${before.recordset[0].auto_renewal}`);

    // Update to 1
    await pool.request()
      .input('userId', sql.UniqueIdentifier, testUserId)
      .query(`UPDATE Users SET auto_renewal = 1 WHERE id = @userId`);
    
    // Check after
    const after = await pool.request()
      .input('userId', sql.UniqueIdentifier, testUserId)
      .query(`SELECT auto_renewal FROM Users WHERE id = @userId`);
    console.log(`After UPDATE to 1: auto_renewal = ${after.recordset[0].auto_renewal}`);

    // Update to 0
    await pool.request()
      .input('userId', sql.UniqueIdentifier, testUserId)
      .query(`UPDATE Users SET auto_renewal = 0 WHERE id = @userId`);
    
    // Check after
    const after2 = await pool.request()
      .input('userId', sql.UniqueIdentifier, testUserId)
      .query(`SELECT auto_renewal FROM Users WHERE id = @userId`);
    console.log(`After UPDATE to 0: auto_renewal = ${after2.recordset[0].auto_renewal}`);

    // Restore to 1
    await pool.request()
      .input('userId', sql.UniqueIdentifier, testUserId)
      .query(`UPDATE Users SET auto_renewal = 1 WHERE id = @userId`);
    console.log('✓ Restored to 1');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

checkUsersTriggers();
