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

async function fixInventory() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Fixing DX Decade inventory...\n');
    pool = await sql.connect(config);

    // Get product info
    const product = await pool.request().query(`
      SELECT 
        p.id, 
        p.name, 
        p.store_id, 
        p.unit_id,
        u.name as unit_name
      FROM Products p
      LEFT JOIN Units u ON p.unit_id = u.id
      WHERE p.name LIKE '%DX Decade%'
    `);

    const prod = product.recordset[0];
    console.log(`Product: ${prod.name}`);
    console.log(`Default Unit: ${prod.unit_name}`);
    console.log(`Unit ID: ${prod.unit_id}\n`);

    // Check if inventory exists for default unit
    const existing = await pool.request()
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

    if (existing.recordset.length > 0) {
      console.log(`Current inventory: ${existing.recordset[0].Quantity}`);
      
      // Update
      await pool.request()
        .input('productId', sql.UniqueIdentifier, prod.id)
        .input('storeId', sql.UniqueIdentifier, prod.store_id)
        .input('unitId', sql.UniqueIdentifier, prod.unit_id)
        .input('quantity', sql.Decimal(18, 4), 100)
        .query(`
          UPDATE ProductInventory
          SET Quantity = Quantity + @quantity,
              UpdatedAt = GETDATE()
          WHERE ProductId = @productId 
            AND StoreId = @storeId 
            AND UnitId = @unitId
        `);
      
      console.log('✓ Added 100 units to existing inventory');
    } else {
      console.log('No inventory for default unit, creating...');
      
      // Insert
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
      .input('unitId', sql.UniqueIdentifier, prod.unit_id)
      .query(`
        SELECT Quantity
        FROM ProductInventory
        WHERE ProductId = @productId 
          AND StoreId = @storeId 
          AND UnitId = @unitId
      `);

    console.log(`\n✅ New inventory for "${prod.unit_name}": ${verify.recordset[0].Quantity} units`);
    console.log('You can now sell DX Decade!');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    if (pool) await pool.close();
  }
}

fixInventory();
