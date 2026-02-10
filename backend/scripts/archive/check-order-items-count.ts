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

async function checkOrderItemsCount() {
  try {
    await sql.connect(config);
    const storeId = 'B6E006C7-0115-4C46-9764-6BA61B911964';
    
    // Get top 5 orders with their item counts
    const result = await sql.query`
      SELECT 
        po.order_number,
        COUNT(poi.id) as item_count,
        SUM(poi.quantity) as total_quantity
      FROM PurchaseOrders po
      LEFT JOIN PurchaseOrderItems poi ON po.id = poi.purchase_order_id
      WHERE po.store_id = ${storeId}
      GROUP BY po.order_number, po.updated_at
      ORDER BY po.updated_at DESC
    `;
    
    console.log('Top Purchase Orders with Item Counts:');
    console.log('');
    
    result.recordset.slice(0, 10).forEach((r: any, i: number) => {
      console.log(`${i + 1}. ${r.order_number}`);
      console.log(`   Số loại SP: ${r.item_count}`);
      console.log(`   Tổng số lượng: ${r.total_quantity}`);
      console.log('');
    });
    
    // Check a specific order in detail
    console.log('\n=== Chi tiết đơn PN2026010027 ===');
    const orderDetail = await sql.query`
      SELECT 
        poi.id,
        p.name as product_name,
        poi.quantity,
        poi.cost
      FROM PurchaseOrders po
      JOIN PurchaseOrderItems poi ON po.id = poi.purchase_order_id
      JOIN Products p ON poi.product_id = p.id
      WHERE po.order_number = 'PN2026010027' AND po.store_id = ${storeId}
    `;
    
    if (orderDetail.recordset.length > 0) {
      orderDetail.recordset.forEach((item: any, i: number) => {
        console.log(`${i + 1}. ${item.product_name} - SL: ${item.quantity}, Giá: ${item.cost}`);
      });
      console.log(`\nTổng: ${orderDetail.recordset.length} loại sản phẩm`);
    } else {
      console.log('Không tìm thấy đơn PN2026010027');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.close();
  }
}

checkOrderItemsCount();
