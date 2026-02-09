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

async function checkColumns() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Checking Customers table columns...\n');
    pool = await sql.connect(config);

    const columns = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Customers'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('Customers table columns:');
    columns.recordset.forEach((col: any) => {
      console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    if (pool) await pool.close();
  }
}

checkColumns();
