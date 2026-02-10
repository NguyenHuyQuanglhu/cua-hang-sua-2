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

async function checkInventoryTable() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Checking Inventory table schema...\n');
    pool = await sql.connect(config);

    // Get schema
    const columns = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Inventory'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('Inventory table columns:');
    columns.recordset.forEach((col: any) => {
      console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });

    // Get sample data
    console.log('\n=== Sample data (first 5 rows) ===');
    const sample = await pool.request().query(`
      SELECT TOP 5 *
      FROM Inventory
    `);

    if (sample.recordset.length > 0) {
      sample.recordset.forEach((row: any, idx: number) => {
        console.log(`\nRow ${idx + 1}:`);
        Object.keys(row).forEach(key => {
          console.log(`  ${key}: ${row[key]}`);
        });
      });
    } else {
      console.log('No data in Inventory table');
    }

    // Check for DX Decade
    console.log('\n=== Searching for DX Decade in Inventory ===');
    const dxDecade = await pool.request().query(`
      SELECT i.*, p.name as ProductName
      FROM Inventory i
      LEFT JOIN Products p ON i.product_id = p.id
      WHERE p.name LIKE '%DX Decade%'
    `);

    if (dxDecade.recordset.length > 0) {
      console.log('Found DX Decade in Inventory:');
      dxDecade.recordset.forEach((row: any) => {
        console.log(row);
      });
    } else {
      console.log('❌ DX Decade not found in Inventory table');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    if (pool) await pool.close();
  }
}

checkInventoryTable();
