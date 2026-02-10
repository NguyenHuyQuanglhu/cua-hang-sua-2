import sql from 'mssql';

const config = {
  server: '118.69.126.49',
  database: 'Data_QuanLyBanHang_Online',
  user: 'userquanlybanhangonline',
  password: '123456789',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function getPurchaseId() {
  try {
    console.log('Connecting to database...');
    const pool = await sql.connect(config);
    
    // Get latest purchase order for milk store
    const result = await pool.request().query(`
      SELECT TOP 5
        po.id,
        po.order_number,
        po.import_date,
        po.total_amount,
        po.created_at,
        s.name as store_name,
        COUNT(poi.id) as item_count
      FROM PurchaseOrders po
      LEFT JOIN Stores s ON po.store_id = s.id
      LEFT JOIN PurchaseOrderItems poi ON po.id = poi.purchase_order_id
      WHERE s.name LIKE N'%sữa%'
      GROUP BY po.id, po.order_number, po.import_date, po.total_amount, po.created_at, s.name
      ORDER BY po.created_at DESC
    `);
    
    if (result.recordset.length === 0) {
      console.log('❌ No purchase orders found for milk store');
      return;
    }
    
    console.log('\n📦 Latest purchase orders for milk store:');
    result.recordset.forEach((po, i) => {
      console.log(`\n${i + 1}. ${po.order_number}`);
      console.log(`   ID: ${po.id}`);
      console.log(`   Store: ${po.store_name}`);
      console.log(`   Date: ${new Date(po.import_date).toLocaleDateString()}`);
      console.log(`   Amount: ${po.total_amount.toLocaleString()}đ`);
      console.log(`   Items: ${po.item_count}`);
    });
    
    console.log('\n✅ Use one of these IDs to test the edit dialog');
    
    await pool.close();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

getPurchaseId();
