import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'SmartInventory',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
  },
};

async function syncInventory() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('Connected successfully!');

    // Get all products
    const productsResult = await pool.request().query(`
      SELECT id, name, store_id FROM Products WHERE status != 'deleted'
    `);

    console.log(`\nFound ${productsResult.recordset.length} products`);

    for (const product of productsResult.recordset) {
      const productId = product.id;
      const storeId = product.store_id;
      const productName = product.name;

      // Calculate total inventory from PurchaseLots
      const lotsResult = await pool.request()
        .input('productId', sql.NVarChar, productId)
        .input('storeId', sql.NVarChar, storeId)
        .query(`
          SELECT 
            unit_id,
            SUM(remaining_quantity) as total_quantity
          FROM PurchaseLots
          WHERE product_id = @productId AND store_id = @storeId
          GROUP BY unit_id
        `);

      if (lotsResult.recordset.length === 0) {
        console.log(`  ${productName}: No purchase lots found`);
        continue;
      }

      // Update or create ProductInventory for each unit
      for (const lot of lotsResult.recordset) {
        const unitId = lot.unit_id;
        const quantity = lot.total_quantity;

        // Check if inventory exists
        const inventoryResult = await pool.request()
          .input('productId', sql.NVarChar, productId)
          .input('storeId', sql.NVarChar, storeId)
          .input('unitId', sql.NVarChar, unitId)
          .query(`
            SELECT Id, Quantity FROM ProductInventory
            WHERE ProductId = @productId AND StoreId = @storeId AND UnitId = @unitId
          `);

        if (inventoryResult.recordset.length > 0) {
          // Update existing
          const currentQty = inventoryResult.recordset[0].Quantity;
          if (currentQty !== quantity) {
            await pool.request()
              .input('id', sql.NVarChar, inventoryResult.recordset[0].Id)
              .input('quantity', sql.Int, quantity)
              .query(`
                UPDATE ProductInventory
                SET Quantity = @quantity, UpdatedAt = GETDATE()
                WHERE Id = @id
              `);
            console.log(`  ${productName}: Updated inventory from ${currentQty} to ${quantity}`);
          } else {
            console.log(`  ${productName}: Inventory already correct (${quantity})`);
          }
        } else {
          // Create new
          await pool.request()
            .input('id', sql.NVarChar, crypto.randomUUID())
            .input('productId', sql.NVarChar, productId)
            .input('storeId', sql.NVarChar, storeId)
            .input('unitId', sql.NVarChar, unitId)
            .input('quantity', sql.Int, quantity)
            .query(`
              INSERT INTO ProductInventory (Id, ProductId, StoreId, UnitId, Quantity, CreatedAt, UpdatedAt)
              VALUES (@id, @productId, @storeId, @unitId, @quantity, GETDATE(), GETDATE())
            `);
          console.log(`  ${productName}: Created new inventory record with quantity ${quantity}`);
        }
      }
    }

    console.log('\n✅ Inventory sync completed successfully!');
  } catch (error) {
    console.error('❌ Error syncing inventory:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

syncInventory();
