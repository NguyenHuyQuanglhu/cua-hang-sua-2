/**
 * Script to test inventory check
 */

import sql from 'mssql';

const config: sql.config = {
  user: process.env.DB_USER || 'userquanlybanhangonline',
  password: process.env.DB_PASSWORD || '123456789',
  server: process.env.DB_SERVER || '118.69.126.49',
  database: process.env.DB_NAME || 'Data_QuanLyBanHang_Online',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function testInventoryCheck() {
  try {
    console.log('Connecting to database...');
    const pool = await sql.connect(config);

    // Find Sữa bò product
    console.log('\n=== Finding Sữa bò product ===');
    const products = await pool.request()
      .query(`
        SELECT TOP 5
          p.id,
          p.name,
          p.store_id,
          p.unit_id,
          p.stock_quantity,
          u.name as unit_name
        FROM Products p
        LEFT JOIN Units u ON p.unit_id = u.id
        WHERE p.status = 'active'
        ORDER BY p.updated_at DESC
      `);

    console.log('Recent products:');
    products.recordset.forEach((p: any) => {
      console.log(`  - ${p.name}: ${p.stock_quantity} (unit: ${p.unit_name})`);
    });

    const product = products.recordset.find((p: any) => p.name.includes('Sữa'));
    if (!product) {
      console.log('No milk product found');
      await pool.close();
      return;
    }

    console.log(`\nTesting with product: ${product.name}`);
    console.log(`Product ID: ${product.id}`);
    console.log(`Store ID: ${product.store_id}`);
    console.log(`Unit ID: ${product.unit_id}`);

    // Get all units for this store
    console.log('\n=== All units in store ===');
    const units = await pool.request()
      .input('storeId', sql.NVarChar, product.store_id)
      .query(`
        SELECT 
          id,
          name,
          base_unit_id,
          conversion_factor
        FROM Units
        WHERE store_id = @storeId
        ORDER BY name
      `);

    console.log('Units:');
    units.recordset.forEach((u: any) => {
      console.log(`  - ${u.name} (${u.id}): base=${u.base_unit_id || 'BASE'}, factor=${u.conversion_factor || 1}`);
    });

    // Check ProductInventory
    console.log('\n=== ProductInventory for this product ===');
    const inventory = await pool.request()
      .input('productId', sql.NVarChar, product.id)
      .query(`
        SELECT 
          pi.UnitId,
          u.name as unit_name,
          pi.Quantity,
          u.base_unit_id,
          u.conversion_factor
        FROM ProductInventory pi
        LEFT JOIN Units u ON pi.UnitId = u.id
        WHERE pi.ProductId = @productId
      `);

    console.log('Inventory records:');
    inventory.recordset.forEach((inv: any) => {
      console.log(`  - ${inv.Quantity} ${inv.unit_name} (factor: ${inv.conversion_factor || 1})`);
    });

    // Test sp_Inventory_GetAvailable with different units
    console.log('\n=== Testing sp_Inventory_GetAvailable ===');
    
    for (const unit of units.recordset.slice(0, 3)) {
      const result = await pool.request()
        .input('productId', sql.NVarChar, product.id)
        .input('storeId', sql.NVarChar, product.store_id)
        .input('unitId', sql.NVarChar, unit.id)
        .execute('sp_Inventory_GetAvailable');

      if (result.recordset.length > 0) {
        const r = result.recordset[0];
        console.log(`  Unit "${unit.name}": ${r.availableQuantity} available`);
      } else {
        console.log(`  Unit "${unit.name}": No result`);
      }
    }

    await pool.close();
    console.log('\n✓ Done!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testInventoryCheck();
