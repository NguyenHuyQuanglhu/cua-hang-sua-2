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

async function assignUnitsToProducts() {
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

    // Get units
    const unitsResult = await pool.request()
      .input('storeId', sql.NVarChar, storeId)
      .query(`SELECT id, name FROM Units WHERE store_id = @storeId ORDER BY name`);

    console.log(`\nFound ${unitsResult.recordset.length} units:`);
    unitsResult.recordset.forEach((u: any) => {
      console.log(`  - ${u.name} (${u.id})`);
    });

    if (unitsResult.recordset.length === 0) {
      console.log('\n❌ No units found! Please create units first.');
      return;
    }

    // Find default unit (Hộp, Chai, Gói, or first unit)
    let defaultUnit = unitsResult.recordset.find((u: any) => 
      u.name === 'Hộp' || u.name === 'Chai' || u.name === 'Gói' || u.name === 'Cái'
    );
    
    if (!defaultUnit) {
      defaultUnit = unitsResult.recordset[0];
    }

    console.log(`\nDefault unit: ${defaultUnit.name} (${defaultUnit.id})`);

    // Get products without unit_id
    const productsResult = await pool.request()
      .input('storeId', sql.NVarChar, storeId)
      .query(`
        SELECT id, name, unit_id
        FROM Products
        WHERE store_id = @storeId AND unit_id IS NULL
        ORDER BY name
      `);

    console.log(`\nFound ${productsResult.recordset.length} products without unit_id`);

    if (productsResult.recordset.length === 0) {
      console.log('✅ All products already have units assigned!');
      return;
    }

    // Update products with default unit
    let updatedCount = 0;
    for (const product of productsResult.recordset) {
      await pool.request()
        .input('productId', sql.NVarChar, product.id)
        .input('unitId', sql.NVarChar, defaultUnit.id)
        .query(`UPDATE Products SET unit_id = @unitId WHERE id = @productId`);

      console.log(`  ✅ ${product.name} → ${defaultUnit.name}`);
      updatedCount++;
    }

    console.log(`\n✅ Successfully assigned unit to ${updatedCount} products!`);

    // Show summary
    const summaryResult = await pool.request()
      .input('storeId', sql.NVarChar, storeId)
      .query(`
        SELECT 
          u.name as unit_name,
          COUNT(p.id) as product_count
        FROM Products p
        LEFT JOIN Units u ON p.unit_id = u.id
        WHERE p.store_id = @storeId
        GROUP BY u.name
        ORDER BY product_count DESC
      `);

    console.log('\n📊 Products by Unit:');
    summaryResult.recordset.forEach((row: any) => {
      console.log(`   ${row.unit_name || 'No unit'}: ${row.product_count} products`);
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

assignUnitsToProducts();
