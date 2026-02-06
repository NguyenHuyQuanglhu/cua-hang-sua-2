import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  server: process.env.DB_SERVER || '',
  database: process.env.DB_NAME || '',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

async function checkPurchaseColumns() {
  try {
    await sql.connect(config);
    console.log('Connected to database');

    // Check columns for the 2 new orders
    const result = await sql.query`
      SELECT * 
      FROM PurchaseOrders 
      WHERE order_number IN ('PN2026010031', 'PN2026010030')
      ORDER BY created_at DESC
    `;

    console.log('\n=== Purchase Orders PN2026010031 & PN2026010030 ===');
    result.recordset.forEach(r => {
      console.log('\nOrder:', r.order_number);
      console.log('  id:', r.id);
      console.log('  store_id:', r.store_id);
      console.log('  supplier_id:', r.supplier_id);
      console.log('  created_at:', r.created_at);
      console.log('  updated_at:', r.updated_at);
      console.log('  created_by:', r.created_by);
      console.log('  paid_amount:', r.paid_amount);
      console.log('  remaining_debt:', r.remaining_debt);
      console.log('  payment_status:', r.payment_status);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.close();
  }
}

checkPurchaseColumns();
