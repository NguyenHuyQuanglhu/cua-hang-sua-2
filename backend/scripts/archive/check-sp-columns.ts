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
  
  // Call stored procedure
  const result = await pool.request()
    .input('storeId', storeId)
    .execute('sp_Sales_GetByStore');
  
  const recordsets = result.recordsets as any[];
  console.log('Recordset 0 (total):', recordsets[0]);
  console.log('\nRecordset 1 (sales) - first record:');
  if (recordsets[1] && recordsets[1].length > 0) {
    console.log(JSON.stringify(recordsets[1][0], null, 2));
    console.log('\nColumn names:', Object.keys(recordsets[1][0]));
  }
  
  await pool.close();
}

check().catch(console.error);
