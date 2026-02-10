import sql from 'mssql';

const config: sql.config = {
  server: '118.69.126.49',
  database: 'Data_QuanLyBanHang_Online',
  user: 'userquanlybanhangonline',
  password: '123456789',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function checkColumns() {
  let pool: sql.ConnectionPool | null = null;
  try {
    pool = await sql.connect(config);
    
    const result = await sql.query`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Products'
      ORDER BY ORDINAL_POSITION
    `;
    
    console.log('Products table columns:');
    result.recordset.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
    process.exit(0);
  }
}

checkColumns();
