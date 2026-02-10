import sql from 'mssql';

const config = {
  server: '118.69.126.49',
  database: 'Data_QuanLyBanHang_Online',
  user: 'userquanlybanhangonline',
  password: '123456789',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function checkSchema() {
  try {
    console.log('Connecting to database...');
    const pool = await sql.connect(config);
    
    // Check PurchaseOrders table schema
    const result = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'PurchaseOrders'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('\n📋 PurchaseOrders table columns:');
    result.recordset.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE}${col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : ''}) ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Check if table has any data
    const countResult = await pool.request().query(`
      SELECT COUNT(*) as total FROM PurchaseOrders
    `);
    console.log(`\n📊 Total purchase orders: ${countResult.recordset[0].total}`);
    
    // Get sample data
    if (countResult.recordset[0].total > 0) {
      const sampleResult = await pool.request().query(`
        SELECT TOP 1 * FROM PurchaseOrders
      `);
      console.log('\n📦 Sample purchase order:');
      console.log(sampleResult.recordset[0]);
    }
    
    await pool.close();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkSchema();
