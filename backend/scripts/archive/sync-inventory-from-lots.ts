import sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';

const config: sql.config = {
  server: '118.69.126.49',
  database: 'Data_QuanLyBanHang_Online',
  user: 'userquanlybanhangonline',
  password: '123456789',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function syncInventoryFromLots() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('Connected successfully!');

    // Get store ID
    const storeResult = await pool.request()
      .query(`SELECT TOP 1 id, name FROM Stores ORDER BY created_at DESC`);
    
    if (storeResult.recordset.length === 0) {
      console.error('No store found!');
      return;
    }

    const storeId = storeResult.recordset[0].id;
    const storeName = storeResult.recordset[0].name;
    console.log(`\nStore: ${storeName} (${storeId})`);

    // Get all products with their purchase lots
    const lotsResult = await pool.request()
      .input('storeId', sql.NVarChar, storeId)
      .query(`
        SELECT 
          pl.product_id,
          p.name as product_name,
          pl.unit_id,
          u.name as unit_name,
          SUM(pl.remaining_quantity) as total_quantity
        FROM PurchaseLots pl
        JOIN Products p ON pl.product_id = p.id
        LEFT JOIN Units u ON pl.unit_id = u.id
        WHERE pl.store_id = @storeId
        GROUP BY pl.product_id, p.name, pl.unit_id, u.name
        ORDER BY p.name
      `);

    console.log(`\nFound ${lotsResult.recordset.length} products with inventory in PurchaseLots`);

    if (lotsResult.recordset.length === 0) {
      console.log('No purchase lots found. Please create purchase orders first.');
      return;
    }

    let syncedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;

    for (const lot of lotsResult.recordset) {
      // Check if ProductInventory record exists
      const inventoryResult = await pool.request()
        .input('productId', sql.NVarChar, lot.product_id)
        .input('storeId', sql.NVarChar, storeId)
        .query(`
          SELECT Id, Quantity 
          FROM ProductInventory 
          WHERE ProductId = @productId AND StoreId = @storeId
        `);

      if (inventoryResult.recordset.length > 0) {
        // Update existing record
        const currentQty = inventoryResult.recordset[0].Quantity;
        await pool.request()
          .input('productId', sql.NVarChar, lot.product_id)
          .input('storeId', sql.NVarChar, storeId)
          .input('quantity', sql.Decimal(18, 2), lot.total_quantity)
          .query(`
            UPDATE ProductInventory 
            SET Quantity = @quantity, UpdatedAt = GETDATE()
            WHERE ProductId = @productId AND StoreId = @storeId
          `);

        console.log(`  ✅ Updated: ${lot.product_name} - ${currentQty} → ${lot.total_quantity} ${lot.unit_name || 'units'}`);
        updatedCount++;
      } else {
        // Create new record
        const inventoryId = uuidv4();
        await pool.request()
          .input('id', sql.NVarChar, inventoryId)
          .input('productId', sql.NVarChar, lot.product_id)
          .input('storeId', sql.NVarChar, storeId)
          .input('unitId', sql.NVarChar, lot.unit_id)
          .input('quantity', sql.Decimal(18, 2), lot.total_quantity)
          .query(`
            INSERT INTO ProductInventory (Id, ProductId, StoreId, UnitId, Quantity, CreatedAt, UpdatedAt)
            VALUES (@id, @productId, @storeId, @unitId, @quantity, GETDATE(), GETDATE())
          `);

        console.log(`  ✅ Created: ${lot.product_name} - ${lot.total_quantity} ${lot.unit_name || 'units'}`);
        createdCount++;
      }

      syncedCount++;
    }

    console.log(`\n✅ Successfully synced ${syncedCount} products!`);
    console.log(`   Created: ${createdCount}`);
    console.log(`   Updated: ${updatedCount}`);

    // Show summary
    const summaryResult = await pool.request()
      .input('storeId', sql.NVarChar, storeId)
      .query(`
        SELECT 
          p.name as product_name,
          pi.Quantity as quantity,
          u.name as unit_name
        FROM ProductInventory pi
        JOIN Products p ON pi.ProductId = p.id
        LEFT JOIN Units u ON p.unit_id = u.id
        WHERE pi.StoreId = @storeId AND pi.Quantity > 0
        ORDER BY p.name
      `);

    console.log('\n📊 Current Inventory:');
    summaryResult.recordset.forEach((row: any) => {
      console.log(`   ${row.product_name}: ${row.quantity} ${row.unit_name || 'units'}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\nDatabase connection closed.');
    }
  }
}

syncInventoryFromLots();
