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

async function checkBoPresidentUpdates() {
  try {
    await sql.connect(config);
    const storeId = 'B6E006C7-0115-4C46-9764-6BA61B911964';
    
    // Find the purchase order with "Bơ Président"
    const result = await sql.query`
      SELECT po.id, po.order_number, po.created_at, po.updated_at,
             poi.product_id, p.name as product_name
      FROM PurchaseOrders po
      JOIN PurchaseOrderItems poi ON po.id = poi.purchase_order_id
      JOIN Products p ON poi.product_id = p.id
      WHERE po.store_id = ${storeId}
        AND p.name LIKE '%Bơ Président%'
      ORDER BY po.updated_at DESC
    `;
    
    console.log('Purchase Orders with "Bơ Président":');
    result.recordset.forEach((r: any) => {
      const created = new Date(r.created_at).toLocaleString('vi-VN');
      const updated = new Date(r.updated_at).toLocaleString('vi-VN');
      console.log(`\nOrder: ${r.order_number}`);
      console.log(`Product: ${r.product_name}`);
      console.log(`Created: ${created}`);
      console.log(`Updated: ${updated}`);
      console.log(`Time diff: ${Math.floor((new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()) / 1000)} seconds`);
    });
    
    // Check if there's something updating this order
    console.log('\n\n=== Checking for triggers or automated updates ===');
    const triggers = await sql.query`
      SELECT 
        t.name as trigger_name,
        OBJECT_NAME(t.parent_id) as table_name,
        t.is_disabled
      FROM sys.triggers t
      WHERE OBJECT_NAME(t.parent_id) IN ('PurchaseOrders', 'PurchaseOrderItems')
    `;
    
    if (triggers.recordset.length > 0) {
      console.log('Found triggers:');
      triggers.recordset.forEach((t: any) => {
        console.log(`- ${t.trigger_name} on ${t.table_name} (disabled: ${t.is_disabled})`);
      });
    } else {
      console.log('No triggers found on PurchaseOrders or PurchaseOrderItems');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.close();
  }
}

checkBoPresidentUpdates();
