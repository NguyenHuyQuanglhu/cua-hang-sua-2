import sql from 'mssql';

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

async function fixInventoryUnits() {
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

    // Get all ProductInventory records with wrong units
    const inventoryResult = await pool.request()
      .input('storeId', sql.NVarChar, storeId)
      .query(`
        SELECT 
          pi.Id,
          pi.ProductId,
          pi.UnitId as current_unit_id,
          p.unit_id as correct_unit_id,
          p.name as product_name,
          u1.name as current_unit_name,
          u2.name as correct_unit_name,
          pi.Quantity
        FROM ProductInventory pi
        JOIN Products p ON pi.ProductId = p.id
        LEFT JOIN Units u1 ON pi.UnitId = u1.id
        LEFT JOIN Units u2 ON p.unit_id = u2.id
        WHERE pi.StoreId = @storeId
        ORDER BY p.name
      `);

    console.log(`\nFound ${inventoryResult.recordset.length} inventory records`);

    let fixedCount = 0;

    for (const record of inventoryResult.recordset) {
      if (record.current_unit_id !== record.correct_unit_id) {
        // Update to correct unit
        await pool.request()
          .input('id', sql.NVarChar, record.Id)
          .input('unitId', sql.NVarChar, record.correct_unit_id)
          .query(`
            UPDATE ProductInventory 
            SET UnitId = @unitId, UpdatedAt = GETDATE()
            WHERE Id = @id
          `);

        console.log(`  ✅ Fixed: ${record.product_name}`);
        console.log(`     ${record.current_unit_name || 'NULL'} → ${record.correct_unit_name || 'NULL'}`);
        fixedCount++;
      } else {
        console.log(`  ✓ OK: ${record.product_name} - ${record.correct_unit_name || 'NULL'}`);
      }
    }

    console.log(`\n✅ Fixed ${fixedCount} inventory records!`);

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
        LEFT JOIN Units u ON pi.UnitId = u.id
        WHERE pi.StoreId = @storeId AND pi.Quantity > 0
        ORDER BY p.name
      `);

    console.log('\n📊 Current Inventory (with correct units):');
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

fixInventoryUnits();
