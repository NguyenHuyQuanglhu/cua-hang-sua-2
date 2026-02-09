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

async function checkUnits() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Checking DX Decade units...\n');
    pool = await sql.connect(config);

    // Get product info
    const product = await pool.request().query(`
      SELECT 
        p.id, 
        p.name, 
        p.store_id, 
        p.unit_id,
        p.stock_quantity,
        u.name as default_unit_name
      FROM Products p
      LEFT JOIN Units u ON p.unit_id = u.id
      WHERE p.name LIKE '%DX Decade%'
    `);

    if (product.recordset.length === 0) {
      console.log('❌ Product not found');
      return;
    }

    const prod = product.recordset[0];
    console.log('=== Product Info ===');
    console.log(`Name: ${prod.name}`);
    console.log(`Product ID: ${prod.id}`);
    console.log(`Store ID: ${prod.store_id}`);
    console.log(`Default Unit ID: ${prod.unit_id}`);
    console.log(`Default Unit Name: ${prod.default_unit_name}`);
    console.log(`Stock Quantity (Products table): ${prod.stock_quantity}\n`);

    // Get all inventory records
    console.log('=== ProductInventory Records ===');
    const inventory = await pool.request()
      .input('productId', sql.UniqueIdentifier, prod.id)
      .input('storeId', sql.UniqueIdentifier, prod.store_id)
      .query(`
        SELECT 
          pi.Id,
          pi.ProductId,
          pi.StoreId,
          pi.UnitId,
          pi.Quantity,
          u.name as UnitName,
          u.base_unit_id,
          u.conversion_factor
        FROM ProductInventory pi
        LEFT JOIN Units u ON pi.UnitId = u.id
        WHERE pi.ProductId = @productId AND pi.StoreId = @storeId
      `);

    if (inventory.recordset.length === 0) {
      console.log('❌ No inventory records found!');
    } else {
      inventory.recordset.forEach((inv: any, idx: number) => {
        console.log(`\nRecord ${idx + 1}:`);
        console.log(`  Unit ID: ${inv.UnitId}`);
        console.log(`  Unit Name: ${inv.UnitName}`);
        console.log(`  Quantity: ${inv.Quantity}`);
        console.log(`  Base Unit ID: ${inv.base_unit_id || 'NULL (this IS base unit)'}`);
        console.log(`  Conversion Factor: ${inv.conversion_factor || 'NULL'}`);
        
        if (inv.UnitId === prod.unit_id) {
          console.log('  ⭐ THIS IS THE DEFAULT UNIT');
        }
      });
    }

    // Check if default unit has inventory
    console.log('\n=== Checking Default Unit Inventory ===');
    const defaultUnitInv = await pool.request()
      .input('productId', sql.UniqueIdentifier, prod.id)
      .input('storeId', sql.UniqueIdentifier, prod.store_id)
      .input('unitId', sql.UniqueIdentifier, prod.unit_id)
      .query(`
        SELECT Quantity
        FROM ProductInventory
        WHERE ProductId = @productId 
          AND StoreId = @storeId 
          AND UnitId = @unitId
      `);

    if (defaultUnitInv.recordset.length === 0) {
      console.log(`❌ No inventory for default unit "${prod.default_unit_name}"`);
      console.log('\n💡 SOLUTION: Need to add inventory for the default unit OR change product default unit');
    } else {
      console.log(`✓ Default unit has ${defaultUnitInv.recordset[0].Quantity} units`);
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    if (pool) await pool.close();
  }
}

checkUnits();
