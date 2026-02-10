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

async function deleteOrder() {
  try {
    await sql.connect(config);
    const storeId = 'B6E006C7-0115-4C46-9764-6BA61B911964';
    
    // Get order ID
    const order = await sql.query`
      SELECT id FROM PurchaseOrders 
      WHERE order_number = 'PN2026010008' AND store_id = ${storeId}
    `;
    
    if (order.recordset.length === 0) {
      console.log('Order PN2026010008 not found');
      return;
    }
    
    const orderId = order.recordset[0].id;
    console.log(`Found order: ${orderId}`);
    
    // Check if any lots have been used
    const usedLots = await sql.query`
      SELECT COUNT(*) as count 
      FROM PurchaseLots 
      WHERE purchase_order_id = ${orderId} 
        AND remaining_quantity < quantity
    `;
    
    if (usedLots.recordset[0].count > 0) {
      console.log('❌ Cannot delete: Some inventory from this order has been used');
      return;
    }
    
    // Get lots to update inventory
    const lots = await sql.query`
      SELECT product_id, quantity 
      FROM PurchaseLots 
      WHERE purchase_order_id = ${orderId}
    `;
    
    console.log(`Found ${lots.recordset.length} lots to process`);
    
    // Update inventory
    for (const lot of lots.recordset) {
      await sql.query`
        UPDATE ProductInventory 
        SET Quantity = Quantity - ${lot.quantity}, UpdatedAt = GETDATE() 
        WHERE ProductId = ${lot.product_id} AND StoreId = ${storeId}
      `;
      console.log(`✓ Updated inventory for product ${lot.product_id}`);
    }
    
    // Delete lots
    await sql.query`DELETE FROM PurchaseLots WHERE purchase_order_id = ${orderId}`;
    console.log('✓ Deleted purchase lots');
    
    // Delete items
    await sql.query`DELETE FROM PurchaseOrderItems WHERE purchase_order_id = ${orderId}`;
    console.log('✓ Deleted purchase order items');
    
    // Delete order
    await sql.query`DELETE FROM PurchaseOrders WHERE id = ${orderId}`;
    console.log('✓ Deleted purchase order');
    
    console.log('\n✅ Successfully deleted order PN2026010008');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.close();
  }
}

deleteOrder();
