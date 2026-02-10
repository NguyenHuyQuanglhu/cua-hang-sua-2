import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

import { getConnection } from '../src/db/connection';

/**
 * Script to sync product inventory from Products table to ProductInventory table
 * Uses actual database structure: UnitId and Quantity
 */

async function syncProductInventory() {
  console.log('Starting product inventory sync...\n');

  try {
    const pool = await getConnection();

    // Get all products
    const products = await pool.request().query(`
      SELECT 
        p.Id as ProductId,
        p.store_id as StoreId,
        p.unit_id as UnitId,
        p.stock_quantity as StockQuantity
      FROM Products p
    `);

    console.log(`Found ${products.recordset.length} products\n`);

    let syncedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const product of products.recordset) {
      const stockQty = product.StockQuantity || 0;
      const unitId = product.UnitId;

      if (!unitId) {
        console.log(`⚠️  Skipping product ${product.ProductId} - no unit_id`);
        skippedCount++;
        continue;
      }

      // Check if inventory record already exists
      const existing = await pool.request()
        .input('productId', product.ProductId)
        .input('storeId', product.StoreId)
        .input('unitId', unitId)
        .query(`
          SELECT Id FROM ProductInventory 
          WHERE ProductId = @productId AND StoreId = @storeId AND UnitId = @unitId
        `);

      if (existing.recordset.length > 0) {
        // Update existing record
        await pool.request()
          .input('productId', product.ProductId)
          .input('storeId', product.StoreId)
          .input('unitId', unitId)
          .input('quantity', stockQty)
          .query(`
            UPDATE ProductInventory 
            SET Quantity = @quantity,
                UpdatedAt = GETDATE()
            WHERE ProductId = @productId AND StoreId = @storeId AND UnitId = @unitId
          `);
        updatedCount++;
      } else {
        // Insert new record
        await pool.request()
          .input('id', crypto.randomUUID())
          .input('productId', product.ProductId)
          .input('storeId', product.StoreId)
          .input('unitId', unitId)
          .input('quantity', stockQty)
          .query(`
            INSERT INTO ProductInventory 
            (Id, ProductId, StoreId, UnitId, Quantity, CreatedAt, UpdatedAt)
            VALUES 
            (@id, @productId, @storeId, @unitId, @quantity, GETDATE(), GETDATE())
          `);
        createdCount++;
      }
      
      syncedCount++;
      
      if (syncedCount % 10 === 0) {
        console.log(`Processed ${syncedCount}/${products.recordset.length} products...`);
      }
    }

    console.log(`\n✅ Sync completed!`);
    console.log(`   - Total: ${syncedCount} products synced`);
    console.log(`   - Created: ${createdCount} new records`);
    console.log(`   - Updated: ${updatedCount} existing records`);
    console.log(`   - Skipped: ${skippedCount} products (no unit_id)`);

  } catch (error) {
    console.error('❌ Sync failed:', error);
    throw error;
  }
}

// Run sync
syncProductInventory()
  .then(() => {
    console.log('\nScript completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
