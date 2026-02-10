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

async function testPurchaseAPI() {
  try {
    console.log('Connecting to database...');
    const pool = await sql.connect(config);
    
    // Get latest purchase order
    const result = await pool.request().query(`
      SELECT TOP 1 
        po.id,
        po.orderNumber,
        po.importDate,
        po.supplierId,
        po.totalAmount,
        po.notes,
        po.storeId
      FROM PurchaseOrders po
      ORDER BY po.createdAt DESC
    `);
    
    if (result.recordset.length === 0) {
      console.log('❌ No purchase orders found in database');
      return;
    }
    
    const purchase = result.recordset[0];
    console.log('\n✅ Latest purchase order:');
    console.log('ID:', purchase.id);
    console.log('Order Number:', purchase.orderNumber);
    console.log('Store ID:', purchase.storeId);
    console.log('Import Date:', purchase.importDate);
    console.log('Total Amount:', purchase.totalAmount);
    
    // Get items for this purchase
    const itemsResult = await pool.request()
      .input('purchaseOrderId', sql.UniqueIdentifier, purchase.id)
      .query(`
        SELECT 
          poi.id,
          poi.productId,
          poi.quantity,
          poi.cost,
          poi.unitId,
          p.name as productName
        FROM PurchaseOrderItems poi
        LEFT JOIN Products p ON poi.productId = p.id
        WHERE poi.purchaseOrderId = @purchaseOrderId
      `);
    
    console.log('\n📦 Items:', itemsResult.recordset.length);
    itemsResult.recordset.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.productName} - Qty: ${item.quantity}, Cost: ${item.cost}`);
    });
    
    console.log('\n✅ Test completed successfully!');
    console.log('\nTo test in browser, use this purchase ID:', purchase.id);
    
    await pool.close();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testPurchaseAPI();
