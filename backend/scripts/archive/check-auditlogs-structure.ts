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

async function checkAuditLogsStructure() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('✓ Connected\n');

    console.log('Checking AuditLogs table structure...\n');
    const result = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'AuditLogs'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('Columns in AuditLogs:');
    result.recordset.forEach((col: any) => {
      console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE}${col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : ''} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Check if 'details' column exists
    const hasDetails = result.recordset.some((col: any) => col.COLUMN_NAME === 'details');
    
    if (!hasDetails) {
      console.log('\n⚠️  WARNING: "details" column is missing!');
      console.log('The backend code tries to insert into "details" column.');
      console.log('This is likely causing the 500 error.\n');
      
      console.log('Adding "details" column...');
      await pool.request().query(`
        ALTER TABLE AuditLogs
        ADD details NVARCHAR(MAX) NULL
      `);
      console.log('✓ "details" column added successfully!');
    } else {
      console.log('\n✓ "details" column exists');
    }

    // Test insert
    console.log('\nTesting insert into AuditLogs...');
    const testUserId = 'A4660FF2-2C59-4605-A0BF-1B2B836D8B40'; // nhan@lhu.edu.vn
    
    await pool.request()
      .input('userId', sql.UniqueIdentifier, testUserId)
      .input('details', sql.NVarChar(sql.MAX), JSON.stringify({ test: true, timestamp: new Date().toISOString() }))
      .query(`
        INSERT INTO AuditLogs (id, user_id, action, entity_type, entity_id, details, created_at)
        VALUES (NEWID(), @userId, 'test_action', 'test', @userId, @details, GETDATE())
      `);
    
    console.log('✓ Test insert successful!');
    
    // Clean up test record
    await pool.request().query(`
      DELETE FROM AuditLogs WHERE action = 'test_action' AND entity_type = 'test'
    `);
    console.log('✓ Test record cleaned up');

    console.log('\n✅ AuditLogs table is ready!');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

checkAuditLogsStructure();
