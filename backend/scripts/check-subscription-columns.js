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

async function checkColumns() {
  let pool;
  try {
    pool = await sql.connect(config);
    
    const result = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Users'
      AND COLUMN_NAME LIKE '%subscription%'
      ORDER BY COLUMN_NAME
    `);
    
    console.log('Subscription columns in Users table:');
    console.table(result.recordset);
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    if (pool) await pool.close();
  }
}

checkColumns();
