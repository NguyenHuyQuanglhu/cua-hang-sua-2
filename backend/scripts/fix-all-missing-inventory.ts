import sql from 'mssql';

const config = {
  server: '118.69.126.49',
  database: 'Data_quanlybanhang_online',
  user: 'userquanlybanhangonline',
  password: '123456789',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function fixAllMissingInventory() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Finding products with missing inventory for default unit...\n');
    pool = await sql.connect(config);

    // Find all products that have a unit_id but no inventory for that unit
    const productsWithoutInventory = await pool.request().query(`
      SELECT 
        p.id,
        p.name,
        p.store_id,
        p.unit_id,
        p.stock_quantity,
        u.name as unit_name,
        s.name as store_name
      FROM Products p
      LEFT JOIN Units u ON p.unit_id = u.id
      LEFT JOIN Stores s ON p.store_id = s.id
      LEFT JOIN ProductInventory pi ON p.id = pi.ProductId 
        AND p.store_id = pi.StoreId 
        AND p.unit_id = pi.UnitId
      WHERE p.unit_id IS NOT NULL
        AND pi.Id IS NULL
      ORDER BY p.name
    `);

    const products = productsWithoutInventory.recordset;

    if (products.length === 0) {
      console.log('✅ All products have inventory for their default unit!');
      return;
    }

    console.log(`Found ${products.length} products without inventory:\n`);

    let fixed = 0;
    let skipped = 0;

    for (const prod of products) {
      console.log(`\n${fixed + skipped + 1}. ${prod.name} (${prod.store_name})`);
      console.log(`   Unit: ${prod.unit_name}`);
      console.log(`   Stock in Products table: ${prod.stock_quantity}`);

      // Use stock_quantity from Products table, or default to 100 if 0
      const initialStock = prod.stock_quantity > 0 ? prod.stock_quantity : 100;

      try {
        // Create inventory record
        await pool.request()
          .input('productId', sql.UniqueIdentifier, prod.id)
          .input('storeId', sql.UniqueIdentifier, prod.store_id)
          .input('unitId', sql.UniqueIdentifier, prod.unit_id)
          .input('quantity', sql.Decimal(18, 4), initialStock)
          .query(`
            INSERT INTO ProductInventory (Id, ProductId, StoreId, UnitId, Quantity, CreatedAt, UpdatedAt)
            VALUES (NEWID(), @productId, @storeId, @unitId, @quantity, GETDATE(), GETDATE())
          `);

        console.log(`   ✓ Created inventory with ${initialStock} units`);
        fixed++;
      } catch (error: any) {
        console.log(`   ❌ Failed: ${error.message}`);
        skipped++;
      }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`✅ Fixed: ${fixed} products`);
    if (skipped > 0) {
      console.log(`⚠️  Skipped: ${skipped} products`);
    }
    console.log(`${'='.repeat(50)}`);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    if (pool) await pool.close();
  }
}

fixAllMissingInventory();
