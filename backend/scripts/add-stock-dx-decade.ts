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

async function addStockForProduct(productName: string, quantityToAdd: number = 100) {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log(`Adding stock for "${productName}"...\n`);
    pool = await sql.connect(config);

    // Find product
    const product = await pool.request()
      .input('productName', sql.NVarChar, `%${productName}%`)
      .query(`
        SELECT p.id, p.name, p.store_id, p.unit_id, s.name as store_name
        FROM Products p
        LEFT JOIN Stores s ON p.store_id = s.id
        WHERE p.name LIKE @productName
      `);

    if (product.recordset.length === 0) {
      console.log('❌ Product not found');
      return;
    }

    const prod = product.recordset[0];
    console.log(`Found: ${prod.name} at ${prod.store_name}`);
    console.log(`Product ID: ${prod.id}`);
    console.log(`Unit ID: ${prod.unit_id}\n`);

    if (!prod.unit_id) {
      console.log('❌ Product does not have a unit_id. Please assign a unit first.');
      return;
    }

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
        .input('quantity', sql.Decimal(18, 4), quantityToAdd)
        .query(`
          UPDATE ProductInventory
          SET Quantity = Quantity + @quantity,
              UpdatedAt = GETDATE()
          WHERE ProductId = @productId AND StoreId = @storeId
        `);
      console.log(`✓ Added ${quantityToAdd} units to existing stock`);
    } else {
      console.log('No inventory record, creating new...\n');
      
      // Create new
      await pool.request()
        .input('productId', sql.UniqueIdentifier, prod.id)
        .input('storeId', sql.UniqueIdentifier, prod.store_id)
        .input('unitId', sql.UniqueIdentifier, prod.unit_id)
        .input('quantity', sql.Decimal(18, 4), quantityToAdd)
        .query(`
          INSERT INTO ProductInventory (Id, ProductId, StoreId, UnitId, Quantity, CreatedAt, UpdatedAt)
          VALUES (NEWID(), @productId, @storeId, @unitId, @quantity, GETDATE(), GETDATE())
        `);
      console.log(`✓ Created inventory with ${quantityToAdd} units`);
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
    console.log(`You can now sell ${prod.name}!`);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    if (pool) await pool.close();
  }
}

// Run with product name from command line or default to DX Decade
const productName = process.argv[2] || 'DX Decade';
const quantity = parseInt(process.argv[3]) || 100;

addStockForProduct(productName, quantity);
