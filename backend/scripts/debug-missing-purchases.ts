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

async function debugMissingPurchases() {
  try {
    await sql.connect(config);
    console.log('Connected to database');

    // Check the 2 missing orders
    const orders = await sql.query`
      SELECT 
        po.*,
        s.name as supplier_name
      FROM PurchaseOrders po
      LEFT JOIN Suppliers s ON po.supplier_id = s.id
      WHERE po.order_number IN ('PN2026010031', 'PN2026010030')
    `;

    console.log('\n=== Missing Orders ===');
    orders.recordset.forEach(o => {
      console.log('\nOrder:', o.order_number);
      console.log('  ID:', o.id);
      console.log('  Store ID:', o.store_id);
      console.log('  Supplier:', o.supplier_name);
      console.log('  Total:', o.total_amount);
      console.log('  Created:', o.created_at);
      console.log('  Updated:', o.updated_at);
    });

    // Check all stores
    const stores = await sql.query`SELECT id, name FROM Stores`;
    console.log('\n=== All Stores ===');
    stores.recordset.forEach(s => {
      console.log(`  ${s.id}: ${s.name}`);
    });

    // Check what the API would return for each store
    for (const store of stores.recordset) {
      const result = await sql.query`
        SELECT COUNT(*) as count
        FROM PurchaseOrders
        WHERE store_id = ${store.id}
      `;
      console.log(`\nStore "${store.name}" has ${result.recordset[0].count} purchase orders`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.close();
  }
}

debugMissingPurchases();
