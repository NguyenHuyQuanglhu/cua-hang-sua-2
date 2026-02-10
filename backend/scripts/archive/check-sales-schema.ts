import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

async function checkSchema() {
  const config: sql.config = {
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'SmartInventory',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    options: { 
      encrypt: process.env.DB_ENCRYPT === 'true', 
      trustServerCertificate: true 
    }
  };
  
  const pool = await sql.connect(config);
  
  // Check Sales table
  const salesResult = await pool.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'Sales'
    ORDER BY ORDINAL_POSITION
  `);
  console.log('Sales table columns:');
  salesResult.recordset.forEach((r: any) => console.log('  ' + r.COLUMN_NAME + ' (' + r.DATA_TYPE + ')'));
  
  // Check SalesItems table
  const itemsResult = await pool.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'SalesItems'
    ORDER BY ORDINAL_POSITION
  `);
  console.log('\nSalesItems table columns:');
  itemsResult.recordset.forEach((r: any) => console.log('  ' + r.COLUMN_NAME + ' (' + r.DATA_TYPE + ')'));
  
  await pool.close();
}

checkSchema().catch(console.error);
