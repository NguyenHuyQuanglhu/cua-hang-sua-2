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

async function testProductUpdate() {
  try {
    await sql.connect(config);
    console.log('Connected to database\n');

    // Get store ID
    const storeResult = await sql.query`SELECT TOP 1 id FROM Stores WHERE status = 'active'`;
    const storeId = storeResult.recordset[0].id;
    console.log(`Using store ID: ${storeId}\n`);

    // Get a product to test
    const productResult = await sql.query`
      SELECT TOP 1 id, name, unit_id, price, cost_price
      FROM Products
      WHERE store_id = ${storeId} AND status != 'deleted'
    `;

    if (productResult.recordset.length === 0) {
      console.log('No products found');
      return;
    }

    const product = productResult.recordset[0];
    console.log('=== Original Product ===');
    console.log(`Name: ${product.name}`);
    console.log(`Unit ID: ${product.unit_id}`);
    console.log(`Price: ${product.price}`);
    console.log(`Cost Price: ${product.cost_price}\n`);

    // Get another unit to test update
    const unitsResult = await sql.query`
      SELECT id, name
      FROM Units
      WHERE store_id = ${storeId}
      ORDER BY name
    `;

    const newUnit = unitsResult.recordset.find((u: any) => u.id !== product.unit_id);
    if (!newUnit) {
      console.log('Not enough units to test');
      return;
    }

    console.log(`=== Testing Update to Unit: ${newUnit.name} ===\n`);

    // Update product using stored procedure
    const updateResult = await sql.query`
      EXEC sp_Products_Update
        @id = ${product.id},
        @storeId = ${storeId},
        @name = 'Test Update Product',
        @unitId = ${newUnit.id},
        @price = 99000,
        @costPrice = 55000
    `;

    console.log('✓ Update executed\n');

    // Verify update
    const verifyResult = await sql.query`
      SELECT id, name, unit_id, price, cost_price
      FROM Products
      WHERE id = ${product.id}
    `;

    const updated = verifyResult.recordset[0];
    console.log('=== Updated Product ===');
    console.log(`Name: ${updated.name} ${updated.name === 'Test Update Product' ? '✓' : '✗'}`);
    console.log(`Unit ID: ${updated.unit_id} ${updated.unit_id === newUnit.id ? '✓' : '✗'}`);
    console.log(`Price: ${updated.price} ${updated.price === 99000 ? '✓' : '✗'}`);
    console.log(`Cost Price: ${updated.cost_price} ${updated.cost_price === 55000 ? '✓' : '✗'}\n`);

    // Restore original values
    await sql.query`
      UPDATE Products
      SET name = ${product.name},
          unit_id = ${product.unit_id},
          price = ${product.price},
          cost_price = ${product.cost_price}
      WHERE id = ${product.id}
    `;
    console.log('✓ Restored original values');

    console.log('\n=== TEST COMPLETED ===');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testProductUpdate();
