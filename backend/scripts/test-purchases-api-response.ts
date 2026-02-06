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

async function testPurchasesAPI() {
  try {
    await sql.connect(config);
    console.log('Connected to database');

    // Get first store ID
    const storeResult = await sql.query`SELECT TOP 1 id FROM Stores`;
    if (storeResult.recordset.length === 0) {
      console.log('No stores found');
      return;
    }
    const storeId = storeResult.recordset[0].id;
    console.log('Using store ID:', storeId);

    const pageSize = 1000;
    const offset = 0;

    const dataQuery = `
      SELECT 
        po.*, 
        s.name as supplier_name, 
        (SELECT COUNT(*) FROM PurchaseOrderItems WHERE purchase_order_id = po.id) as item_count 
      FROM PurchaseOrders po 
      LEFT JOIN Suppliers s ON po.supplier_id = s.id 
      WHERE po.store_id = @storeId 
      ORDER BY po.updated_at DESC 
      OFFSET @offset ROWS 
      FETCH NEXT @pageSize ROWS ONLY
    `;

    const result = await sql.query`
      SELECT 
        po.*, 
        s.name as supplier_name, 
        (SELECT COUNT(*) FROM PurchaseOrderItems WHERE purchase_order_id = po.id) as item_count 
      FROM PurchaseOrders po 
      LEFT JOIN Suppliers s ON po.supplier_id = s.id 
      WHERE po.store_id = ${storeId}
      ORDER BY po.updated_at DESC 
      OFFSET ${offset} ROWS 
      FETCH NEXT ${pageSize} ROWS ONLY
    `;

    console.log('\n=== API Response Simulation ===');
    console.log('Total records:', result.recordset.length);
    console.log('\nFirst 3 records:');
    console.log(JSON.stringify(result.recordset.slice(0, 3), null, 2));

    // Check if payment columns exist
    if (result.recordset.length > 0) {
      const firstRecord = result.recordset[0];
      console.log('\n=== Checking payment columns ===');
      console.log('Has paid_amount:', 'paid_amount' in firstRecord);
      console.log('Has remaining_debt:', 'remaining_debt' in firstRecord);
      console.log('Has payment_status:', 'payment_status' in firstRecord);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.close();
  }
}

testPurchasesAPI();
