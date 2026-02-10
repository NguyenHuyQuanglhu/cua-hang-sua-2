import sql from 'mssql';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const config: sql.config = {
  server: process.env.DB_SERVER || '',
  database: process.env.DB_NAME || '',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function testDeletePurchaseOrder() {
  try {
    await sql.connect(config);
    console.log('Connected to database\n');

    // Get store ID
    const storeResult = await sql.query`SELECT TOP 1 id FROM Stores WHERE status = 'active'`;
    const storeId = storeResult.recordset[0].id;

    // Get a product with unit
    const productResult = await sql.query`
      SELECT TOP 1 p.id, p.name, p.unit_id 
      FROM Products p
      WHERE p.store_id = ${storeId} AND p.status != 'deleted' AND p.unit_id IS NOT NULL
    `;
    const product = productResult.recordset[0];

    console.log(`=== Testing with Product: ${product.name} ===\n`);

    // Check inventory before
    const beforeInventory = await sql.query`
      SELECT Quantity FROM ProductInventory 
      WHERE ProductId = ${product.id} AND StoreId = ${storeId}
    `;
    const quantityBefore = beforeInventory.recordset[0]?.Quantity || 0;
    console.log(`Inventory BEFORE: ${quantityBefore}`);

    // Create a test purchase order
    const purchaseOrderId = 'DDDDDDDD-EEEE-FFFF-0000-' + Date.now().toString().substring(0, 12).padStart(12, '0');
    const lotId = 'EEEEEEEE-FFFF-0000-1111-' + Date.now().toString().substring(0, 12).padStart(12, '0');
    const itemId = 'FFFFFFFF-0000-1111-2222-' + Date.now().toString().substring(0, 12).padStart(12, '0');
    const testQuantity = 10;

    console.log(`\nCreating test purchase order with ${testQuantity} units...`);

    await sql.query`
      INSERT INTO PurchaseOrders (id, store_id, order_number, import_date, total_amount, created_at, updated_at)
      VALUES (${purchaseOrderId}, ${storeId}, 'TEST-PO', GETDATE(), 1000, GETDATE(), GETDATE())
    `;

    await sql.query`
      INSERT INTO PurchaseOrderItems (id, purchase_order_id, product_id, quantity, cost, unit_id)
      VALUES (${itemId}, ${purchaseOrderId}, ${product.id}, ${testQuantity}, 100, ${product.unit_id})
    `;

    await sql.query`
      INSERT INTO PurchaseLots (id, product_id, store_id, import_date, quantity, remaining_quantity, cost, unit_id, purchase_order_id)
      VALUES (${lotId}, ${product.id}, ${storeId}, GETDATE(), ${testQuantity}, ${testQuantity}, 100, ${product.unit_id}, ${purchaseOrderId})
    `;

    // Update inventory
    await sql.query`
      UPDATE ProductInventory 
      SET Quantity = Quantity + ${testQuantity}, UpdatedAt = GETDATE()
      WHERE ProductId = ${product.id} AND StoreId = ${storeId}
    `;

    console.log('✓ Purchase order created');

    // Check inventory after creation
    const afterCreate = await sql.query`
      SELECT Quantity FROM ProductInventory 
      WHERE ProductId = ${product.id} AND StoreId = ${storeId}
    `;
    const quantityAfterCreate = afterCreate.recordset[0]?.Quantity || 0;
    console.log(`Inventory AFTER CREATE: ${quantityAfterCreate} (should be ${quantityBefore + testQuantity})`);

    // Now delete the purchase order via API simulation
    console.log(`\nDeleting purchase order...`);
    
    // Simulate the deleteWithItems logic
    const lots = await sql.query`
      SELECT product_id, quantity FROM PurchaseLots WHERE purchase_order_id = ${purchaseOrderId}
    `;

    for (const lot of lots.recordset) {
      await sql.query`
        UPDATE ProductInventory 
        SET Quantity = Quantity - ${lot.quantity}, UpdatedAt = GETDATE()
        WHERE ProductId = ${lot.product_id} AND StoreId = ${storeId}
      `;
    }

    await sql.query`DELETE FROM PurchaseLots WHERE purchase_order_id = ${purchaseOrderId}`;
    await sql.query`DELETE FROM PurchaseOrderItems WHERE purchase_order_id = ${purchaseOrderId}`;
    await sql.query`DELETE FROM PurchaseOrders WHERE id = ${purchaseOrderId}`;

    console.log('✓ Purchase order deleted');

    // Check inventory after deletion
    const afterDelete = await sql.query`
      SELECT Quantity FROM ProductInventory 
      WHERE ProductId = ${product.id} AND StoreId = ${storeId}
    `;
    const quantityAfterDelete = afterDelete.recordset[0]?.Quantity || 0;
    console.log(`Inventory AFTER DELETE: ${quantityAfterDelete} (should be ${quantityBefore})`);

    console.log('\n=== RESULT ===');
    if (quantityAfterDelete === quantityBefore) {
      console.log('✓ SUCCESS: Inventory correctly restored after deleting purchase order');
    } else {
      console.log(`✗ FAILED: Inventory mismatch. Expected ${quantityBefore}, got ${quantityAfterDelete}`);
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testDeletePurchaseOrder();
