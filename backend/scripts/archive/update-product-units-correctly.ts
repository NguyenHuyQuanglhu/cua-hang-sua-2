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

// Map product keywords to correct units
const productUnitMap: Record<string, string> = {
  'Bơ': 'Hộp',
  'Phô mai': 'Hộp',
  'Kem tươi': 'Hộp',
  'Sữa chua ăn': 'Hũ',
  'Yogurt': 'Hũ',
  'Sữa chua uống': 'Chai',
  'Sữa tươi': 'Chai',
  'Sữa đặc': 'Hộp',
  'Sữa đậu nành': 'Chai',
  'Sữa bột': 'Hộp',
  'Sữa bò': 'Chai',
  'Milk': 'Chai',
};

async function updateProductUnitsCorrectly() {
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

    // Get all units
    const unitsResult = await pool.request()
      .input('storeId', sql.NVarChar, storeId)
      .query(`SELECT id, name FROM Units WHERE store_id = @storeId`);

    const unitsMap = new Map<string, string>();
    unitsResult.recordset.forEach((u: any) => {
      unitsMap.set(u.name, u.id);
    });

    console.log(`\nAvailable units: ${Array.from(unitsMap.keys()).join(', ')}`);

    // Get all products
    const productsResult = await pool.request()
      .input('storeId', sql.NVarChar, storeId)
      .query(`
        SELECT id, name, unit_id
        FROM Products
        WHERE store_id = @storeId
        ORDER BY name
      `);

    console.log(`\nFound ${productsResult.recordset.length} products`);

    let updatedCount = 0;

    for (const product of productsResult.recordset) {
      let correctUnitName = 'Chai'; // Default

      // Find matching unit based on product name
      for (const [keyword, unitName] of Object.entries(productUnitMap)) {
        if (product.name.includes(keyword)) {
          correctUnitName = unitName;
          break;
        }
      }

      const correctUnitId = unitsMap.get(correctUnitName);
      
      if (!correctUnitId) {
        console.log(`  ⚠️  Unit "${correctUnitName}" not found for ${product.name}`);
        continue;
      }

      if (product.unit_id !== correctUnitId) {
        // Update product unit
        await pool.request()
          .input('productId', sql.NVarChar, product.id)
          .input('unitId', sql.NVarChar, correctUnitId)
          .query(`UPDATE Products SET unit_id = @unitId WHERE id = @productId`);

        console.log(`  ✅ ${product.name} → ${correctUnitName}`);
        updatedCount++;
      } else {
        console.log(`  ✓ ${product.name} - ${correctUnitName} (already correct)`);
      }
    }

    console.log(`\n✅ Updated ${updatedCount} products!`);

    // Now sync inventory units
    console.log('\n🔄 Syncing inventory units...');
    
    await pool.request()
      .input('storeId', sql.NVarChar, storeId)
      .query(`
        UPDATE pi
        SET pi.UnitId = p.unit_id, pi.UpdatedAt = GETDATE()
        FROM ProductInventory pi
        JOIN Products p ON pi.ProductId = p.id
        WHERE pi.StoreId = @storeId
      `);

    console.log('✅ Inventory units synced!');

    // Show summary
    const summaryResult = await pool.request()
      .input('storeId', sql.NVarChar, storeId)
      .query(`
        SELECT 
          p.name as product_name,
          u.name as unit_name,
          pi.Quantity as quantity
        FROM Products p
        LEFT JOIN Units u ON p.unit_id = u.id
        LEFT JOIN ProductInventory pi ON p.id = pi.ProductId AND pi.StoreId = @storeId
        WHERE p.store_id = @storeId
        ORDER BY p.name
      `);

    console.log('\n📊 Products with correct units:');
    summaryResult.recordset.forEach((row: any) => {
      const qty = row.quantity || 0;
      console.log(`   ${row.product_name}: ${row.unit_name} (Tồn: ${qty})`);
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

updateProductUnitsCorrectly();
