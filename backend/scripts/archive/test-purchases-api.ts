import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'SmartInventory',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
  },
};

async function testPurchasesAPI() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('Connected successfully!\n');

    // Simulate what the API does
    const storeId = 'B6E006C7-0115-4C46-9764-6BA61B911964'; // Your store ID

    console.log('=== Testing API Query ===\n');
    
    const dataQuery = `
      SELECT 
        po.*, 
        s.name as supplier_name, 
        (SELECT COUNT(*) FROM PurchaseOrderItems WHERE purchase_order_id = po.id) as item_count 
      FROM PurchaseOrders po 
      LEFT JOIN Suppliers s ON po.supplier_id = s.id 
      WHERE po.store_id = @storeId 
      ORDER BY po.updated_at DESC 
      OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY
    `;

    const results = await pool.request()
      .input('storeId', sql.UniqueIdentifier, storeId)
      .query(dataQuery);

    console.log(`Found ${results.recordset.length} purchase orders:\n`);

    for (const po of results.recordset) {
      console.log(`${po.order_number} - ${po.supplier_name || 'No supplier'}`);
      console.log(`  total_amount: ${po.total_amount}`);
      console.log(`  paid_amount: ${po.paid_amount}`);
      console.log(`  remaining_debt: ${po.remaining_debt}`);
      console.log(`  payment_status: ${po.payment_status}\n`);
    }

    console.log('✅ Test completed!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

testPurchasesAPI();
