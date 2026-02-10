import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

async function check() {
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
  const storeId = '59B9720A-FA71-4736-863B-7E0BFD4BBD07';
  
  // Get products from SP
  const result = await pool.request()
    .input('storeId', storeId)
    .execute('sp_Products_GetByStore');
  
  const recordsets = result.recordsets as any[];
  console.log('Recordsets count:', recordsets.length);
  
  if (recordsets[0] && recordsets[0].length > 0) {
    console.log('\nFirst product record:');
    console.log(JSON.stringify(recordsets[0][0], null, 2));
    console.log('\nColumn names:', Object.keys(recordsets[0][0]));
  }
  
  // Also check raw data from Products table
  const rawProducts = await pool.request()
    .input('storeId', storeId)
    .query('SELECT TOP 1 id, name, stock_quantity, cost_price, selling_price, unit_id FROM Products WHERE store_id = @storeId');
  
  console.log('\nRaw product from table:');
  console.log(JSON.stringify(rawProducts.recordset[0], null, 2));
  
  // Check if unit_id column exists
  const columns = await pool.request()
    .query(`SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Products' AND COLUMN_NAME LIKE '%unit%'`);
  
  console.log('\nUnit-related columns in Products table:');
  console.log(columns.recordset);
  
  await pool.close();
}

check().catch(console.error);
