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

async function fixLatestPurchase() {
  try {
    await sql.connect(config);
    console.log('Connected to database\n');

    const storeId = 'B6E006C7-0115-4C46-9764-6BA61B911964';

    // Get latest purchase by created_at
    const latest = await sql.query`
      SELECT TOP 1 id, order_number, created_at, updated_at
      FROM PurchaseOrders
      WHERE store_id = ${storeId}
      ORDER BY created_at DESC
    `;

    if (latest.recordset.length > 0) {
      const po = latest.recordset[0];
      console.log('Latest purchase order:');
      console.log('  Order:', po.order_number);
      console.log('  Created:', po.created_at);
      console.log('  Updated:', po.updated_at);

      // Update updated_at to now
      await sql.query`
        UPDATE PurchaseOrders
        SET updated_at = GETDATE()
        WHERE id = ${po.id}
      `;

      console.log('\n✓ Updated updated_at to current time');
      console.log('Now refresh the purchases page!');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.close();
  }
}

fixLatestPurchase();
