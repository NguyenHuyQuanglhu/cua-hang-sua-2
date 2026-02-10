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
  
  // Get customers
  const customers = await pool.request()
    .input('storeId', storeId)
    .execute('sp_Customers_GetByStore');
  
  console.log('Customers from SP:');
  const custRecords = (customers.recordsets as any[])[0] || [];
  custRecords.slice(0, 3).forEach((c: any) => {
    console.log(`  ID: ${c.id || c.Id}`);
    console.log(`  Name: ${c.full_name || c.fullName || c.name}`);
    console.log('');
  });
  
  // Get sales
  const sales = await pool.request()
    .input('storeId', storeId)
    .execute('sp_Sales_GetByStore');
  
  console.log('\nSales from SP (with customerId):');
  const salesRecords = (sales.recordsets as any[])[1] || [];
  const salesWithCustomer = salesRecords.filter((s: any) => s.customerId);
  salesWithCustomer.slice(0, 3).forEach((s: any) => {
    console.log(`  Invoice: ${s.invoiceNumber}`);
    console.log(`  CustomerId: ${s.customerId}`);
    console.log(`  CustomerName: ${s.customerName}`);
    console.log(`  FinalAmount: ${s.finalAmount}`);
    console.log('');
  });
  
  // Check if customer IDs match
  const customerIds = new Set(custRecords.map((c: any) => (c.id || c.Id)?.toLowerCase()));
  const saleCustomerIds = new Set(salesWithCustomer.map((s: any) => s.customerId?.toLowerCase()));
  
  console.log('\nCustomer IDs from Customers table:', customerIds.size);
  console.log('Unique Customer IDs from Sales:', saleCustomerIds.size);
  
  // Find matches
  let matches = 0;
  saleCustomerIds.forEach(id => {
    if (customerIds.has(id)) matches++;
  });
  console.log('Matching IDs:', matches);
  
  await pool.close();
}

check().catch(console.error);
