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
  
  // Check Products table stock
  const products = await pool.request()
    .input('storeId', storeId)
    .query(`
      SELECT TOP 5 
        id, name, stock_quantity, unit_id
      FROM Products 
      WHERE store_id = @storeId AND status = 'active'
    `);
  
  console.log('Products stock_quantity:');
  products.recordset.forEach((p: any) => {
    console.log(`  ${p.name}: stock_quantity=${p.stock_quantity}, unit_id=${p.unit_id}`);
  });
  
  // Check ProductInventory table
  const inventory = await pool.request()
    .input('storeId', storeId)
    .query(`
      SELECT TOP 10 
        pi.ProductId, p.name, pi.UnitId, pi.Quantity, u.name as unitName
      FROM ProductInventory pi
      JOIN Products p ON pi.ProductId = p.id
      LEFT JOIN Units u ON pi.UnitId = u.id
      WHERE pi.StoreId = @storeId
    `);
  
  console.log('\nProductInventory:');
  if (inventory.recordset.length === 0) {
    console.log('  (empty - no records)');
  } else {
    inventory.recordset.forEach((i: any) => {
      console.log(`  ${i.name}: Quantity=${i.Quantity}, UnitId=${i.UnitId}, UnitName=${i.unitName}`);
    });
  }
  
  await pool.close();
}

check().catch(console.error);
