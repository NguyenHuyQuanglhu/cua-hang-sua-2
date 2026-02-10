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
  
  // Get store ID
  const storeResult = await pool.request().query("SELECT TOP 1 id FROM Stores");
  const storeId = storeResult.recordset[0]?.id;
  console.log('Store ID:', storeId);
  
  // Check Sales data
  const sales = await pool.request()
    .input('storeId', storeId)
    .query('SELECT TOP 5 id, invoice_number, final_amount, total_amount, customer_id, status FROM Sales WHERE store_id = @storeId ORDER BY created_at DESC');
  console.log('\nSales data:');
  console.log(JSON.stringify(sales.recordset, null, 2));
  
  // Check Customers with sales
  const customerSales = await pool.request()
    .input('storeId', storeId)
    .query(`
      SELECT c.id, c.full_name, 
             ISNULL(SUM(s.final_amount), 0) as totalSales
      FROM Customers c
      LEFT JOIN Sales s ON c.id = s.customer_id AND s.store_id = @storeId
      WHERE c.store_id = @storeId
      GROUP BY c.id, c.full_name
      ORDER BY totalSales DESC
    `);
  console.log('\nCustomer Sales:');
  console.log(JSON.stringify(customerSales.recordset.slice(0, 5), null, 2));
  
  // Check Payments
  const payments = await pool.request()
    .input('storeId', storeId)
    .query('SELECT TOP 5 * FROM Payments WHERE store_id = @storeId');
  console.log('\nPayments:');
  console.log(JSON.stringify(payments.recordset, null, 2));
  
  await pool.close();
}

check().catch(console.error);
