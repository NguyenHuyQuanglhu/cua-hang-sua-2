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

async function checkLatestPurchase() {
  try {
    await sql.connect(config);
    console.log('Connected to database');

    // Get latest purchase order
    const result = await sql.query`
      SELECT TOP 5 
        id, 
        order_number, 
        supplier_id,
        import_date,
        total_amount,
        paid_amount,
        remaining_debt,
        payment_status,
        created_at
      FROM PurchaseOrders 
      ORDER BY created_at DESC
    `;

    console.log('\n=== Latest 5 Purchase Orders ===');
    console.log(JSON.stringify(result.recordset, null, 2));

    // Get supplier names
    if (result.recordset.length > 0) {
      const supplierIds = result.recordset
        .map(r => r.supplier_id)
        .filter(id => id);
      
      if (supplierIds.length > 0) {
        const suppliers = await sql.query`
          SELECT id, name FROM Suppliers WHERE id IN (${supplierIds.join("','")})
        `;
        console.log('\n=== Suppliers ===');
        console.log(JSON.stringify(suppliers.recordset, null, 2));
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.close();
  }
}

checkLatestPurchase();
