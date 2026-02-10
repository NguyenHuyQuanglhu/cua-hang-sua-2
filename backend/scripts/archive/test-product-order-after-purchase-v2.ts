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

async function testProductOrderAfterPurchase() {
  try {
    await sql.connect(config);
    console.log('✓ Connected to database\n');

    const storeId = 'B6E006C7-0115-4C46-9764-6BA61B911964';
    
    // Get top 5 products before creating purchase order
    console.log('=== Top 5 Products BEFORE Creating Purchase Order ===\n');
    const beforeResult = await sql.query`EXEC sp_Products_GetByStore @storeId = ${storeId}`;
    
    if (beforeResult.recordset.length === 0) {
      console.log('❌ No products found in store. Please create some products first.');
      return;
    }
    
    beforeResult.recordset.slice(0, 5).forEach((p: any, i: number) => {
      const updatedAt = new Date(p.updatedAt).toLocaleString('vi-VN');
      console.log(`${i + 1}. ${p.name} (updated: ${updatedAt})`);
    });

    // Pick a product to create purchase order for (use 3rd product to see the change)
    const productIndex = Math.min(2, beforeResult.recordset.length - 1);
    const testProduct = beforeResult.recordset[productIndex];
    console.log(`\n📦 Creating purchase order for: ${testProduct.name}\n`);

    // Create a purchase order
    const purchaseOrderId = crypto.randomUUID();
    const orderNumber = `PN${Date.now()}`;
    const now = new Date();

    await sql.query`
      INSERT INTO PurchaseOrders (id, store_id, order_number, import_date, total_amount, created_at, updated_at)
      VALUES (${purchaseOrderId}, ${storeId}, ${orderNumber}, ${now}, 100000, ${now}, ${now})
    `;

    const itemId = crypto.randomUUID();
    await sql.query`
      INSERT INTO PurchaseOrderItems (id, purchase_order_id, product_id, quantity, cost, unit_id)
      VALUES (${itemId}, ${purchaseOrderId}, ${testProduct.id}, 10, 10000, ${testProduct.unitId})
    `;

    // Update product's updated_at (simulating what backend does)
    await sql.query`
      UPDATE Products 
      SET updated_at = GETDATE() 
      WHERE id = ${testProduct.id} AND store_id = ${storeId}
    `;

    console.log('✓ Purchase order created and product updated_at refreshed\n');

    // Get top 5 products after creating purchase order
    console.log('=== Top 5 Products AFTER Creating Purchase Order ===\n');
    const afterResult = await sql.query`EXEC sp_Products_GetByStore @storeId = ${storeId}`;
    afterResult.recordset.slice(0, 5).forEach((p: any, i: number) => {
      const updatedAt = new Date(p.updatedAt).toLocaleString('vi-VN');
      const isTestProduct = p.id === testProduct.id ? ' ⭐ (THIS ONE!)' : '';
      console.log(`${i + 1}. ${p.name} (updated: ${updatedAt})${isTestProduct}`);
    });

    // Verify the test product is now at the top
    const topProduct = afterResult.recordset[0];
    if (topProduct.id === testProduct.id) {
      console.log('\n✅ SUCCESS! Product moved to top after purchase order creation!');
    } else {
      console.log('\n❌ FAILED! Product did not move to top.');
      console.log(`Expected: ${testProduct.name}`);
      console.log(`Got: ${topProduct.name}`);
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await sql.query`DELETE FROM PurchaseOrderItems WHERE purchase_order_id = ${purchaseOrderId}`;
    await sql.query`DELETE FROM PurchaseOrders WHERE id = ${purchaseOrderId}`;
    console.log('✓ Cleanup complete');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.close();
  }
}

testProductOrderAfterPurchase();
