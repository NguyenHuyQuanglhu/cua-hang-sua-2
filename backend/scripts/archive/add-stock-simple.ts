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

async function addStockSimple() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Adding stock for DX Decade...\n');
    pool = await sql.connect(config);

    // Find product
    const product = await pool.request().query(`
      SELECT p.id, p.name, p.store_id, p.unit_id, s.name as store_name
      FROM Products p
      LEFT JOIN Stores s ON p.store_id = s.id
      WHERE p.name LIKE '%DX Decade%'
    `);

    if (product.recordset.length === 0) {
      console.log('❌ Product not found');
      return;
    }

    const prod = product.recordset[0];
    console.log(`Found: ${prod.name} at ${prod.store_name}`);
    console.log(`Product ID: ${prod.id}`);
    console.log(`Unit ID: ${prod.unit_id}\n`);

    // Check current inventory
    const current = await pool.request()
      .input('productId', sql.UniqueIdentifier, prod.id)
      .input('storeId', sql.UniqueIdentifier, prod.store_id)
      .query(`
        SELECT Quantity
        FROM ProductInventory
        WHERE ProductId = @productId AND StoreId = @storeId
      `);

    if (current.recordset.length > 0) {
      console.log(`Current stock: ${current.recordset[0].Quantity}\n`);
      
      // Update existing
      await pool.request()
        .input('productId', sql.UniqueIdentifier, prod.id)
        .input('storeId', sql.UniqueIdentifier, prod.store_id)
        .input('quantity', sql.Decimal(18, 4), 100)
        .query(`
          UPDATE ProductInventory
          SET Quantity = Quantity + @quantity,
              UpdatedAt = GETDATE()
          WHERE ProductId = @productId AND StoreId = @storeId
        `);
      console.log('✓ Added 100 units to existing stock');
    } else {
      console.log('No inventory record, creating new...\n');
      
      // Create new
      await pool.request()
        .input('productId', sql.UniqueIdentifier, prod.id)
        .input('storeId', sql.UniqueIdentifier, prod.store_id)
        .input('unitId', sql.UniqueIdentifier, prod.unit_id)
        .input('quantity', sql.Decimal(18, 4), 100)
        .query(`
          INSERT INTO ProductInventory (Id, ProductId, StoreId, UnitId, Quantity, CreatedAt, UpdatedAt)
          VALUES (NEWID(), @productId, @storeId, @unitId, @quantity, GETDATE(), GETDATE())
        `);
      console.log('✓ Created inventory with 100 units');
    }

    // Verify
    const verify = await pool.request()
      .input('productId', sql.UniqueIdentifier, prod.id)
      .input('storeId', sql.UniqueIdentifier, prod.store_id)
      .query(`
        SELECT Quantity
        FROM ProductInventory
        WHERE ProductId = @productId AND StoreId = @storeId
      `);

    console.log(`\n✅ New stock: ${verify.recordset[0].Quantity} units`);
    console.log('You can now sell DX Decade!');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    if (pool) await pool.close();
  }
}

addStockSimple();
