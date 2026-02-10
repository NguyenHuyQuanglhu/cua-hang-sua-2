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

async function checkOrder() {
  try {
    await sql.connect(config);
    const storeId = 'B6E006C7-0115-4C46-9764-6BA61B911964';
    
    // Get the order details
    const order = await sql.query`
      SELECT * FROM PurchaseOrders 
      WHERE order_number = 'PN2026010008' AND store_id = ${storeId}
    `;
    
    if (order.recordset.length === 0) {
      console.log('Order PN2026010008 not found');
      return;
    }
    
    const po = order.recordset[0];
    console.log('=== Purchase Order PN2026010008 ===');
    console.log(`ID: ${po.id}`);
    console.log(`Created: ${new Date(po.created_at).toLocaleString('vi-VN')}`);
    console.log(`Updated: ${new Date(po.updated_at).toLocaleString('vi-VN')}`);
    console.log(`Import Date: ${new Date(po.import_date).toLocaleString('vi-VN')}`);
    console.log(`Total: ${po.total_amount}`);
    console.log(`Notes: ${po.notes || 'N/A'}`);
    
    // Get items
    const items = await sql.query`
      SELECT poi.*, p.name as product_name
      FROM PurchaseOrderItems poi
      JOIN Products p ON poi.product_id = p.id
      WHERE poi.purchase_order_id = ${po.id}
    `;
    
    console.log('\n=== Items ===');
    items.recordset.forEach((item: any, i: number) => {
      console.log(`${i + 1}. ${item.product_name} - Qty: ${item.quantity}, Cost: ${item.cost}`);
    });
    
    // Check if this order is being updated by something
    console.log('\n=== Checking update history ===');
    console.log(`Time between created and updated: ${Math.floor((new Date(po.updated_at).getTime() - new Date(po.created_at).getTime()) / 1000)} seconds`);
    
    if (new Date(po.updated_at).getTime() > new Date(po.created_at).getTime() + 1000) {
      console.log('⚠️ This order has been UPDATED after creation!');
      console.log('Something is updating this order\'s updated_at field.');
    } else {
      console.log('✓ This order has NOT been updated after creation.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.close();
  }
}

checkOrder();
