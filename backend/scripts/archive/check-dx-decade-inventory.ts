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

async function checkInventory() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Checking DX Decade inventory...\n');
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
    console.log(`Product: ${prod.name}`);
    console.log(`Store: ${prod.store_name}`);
    console.log(`Product ID: ${prod.id}`);
    console.log(`Store ID: ${prod.store_id}`);
    console.log(`Unit ID: ${prod.unit_id}\n`);

    // Check ProductInventory table
    console.log('=== ProductInventory Table ===');
    const inventory = await pool.request()
      .input('productId', sql.UniqueIdentifier, prod.id)
      .query(`
        SELECT 
          pi.Id,
          pi.ProductId,
          pi.StoreId,
          pi.UnitId,
          pi.Quantity,
          s.name as StoreName,
          u.name as UnitName
        FROM ProductInventory pi
        LEFT JOIN Stores s ON pi.StoreId = s.id
        LEFT JOIN Units u ON pi.UnitId = u.id
        WHERE pi.ProductId = @productId
      `);

    if (inventory.recordset.length > 0) {
      inventory.recordset.forEach((inv: any) => {
        console.log(`Store: ${inv.StoreName}`);
        console.log(`Unit: ${inv.UnitName}`);
        console.log(`Quantity: ${inv.Quantity}`);
        console.log(`Store ID: ${inv.StoreId}`);
        console.log('---');
      });
    } else {
      console.log('❌ No records in ProductInventory');
    }

    // Check if there's an Inventory table (old system)
    console.log('\n=== Checking for Inventory table ===');
    const inventoryTableCheck = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'Inventory'
    `);

    if (inventoryTableCheck.recordset.length > 0) {
      console.log('✓ Inventory table exists, checking data...');
      const oldInventory = await pool.request()
        .input('productId', sql.UniqueIdentifier, prod.id)
        .query(`
          SELECT TOP 5 *
          FROM Inventory
          WHERE ProductId = @productId
        `);
      
      if (oldInventory.recordset.length > 0) {
        console.log('Found records in Inventory table:');
        oldInventory.recordset.forEach((inv: any) => {
          console.log(inv);
        });
      } else {
        console.log('No records in Inventory table');
      }
    } else {
      console.log('Inventory table does not exist');
    }

    // Check stored procedure that backend might use
    console.log('\n=== Checking sp_Inventory_GetAvailable ===');
    const spCheck = await pool.request().query(`
      SELECT ROUTINE_NAME 
      FROM INFORMATION_SCHEMA.ROUTINES 
      WHERE ROUTINE_NAME = 'sp_Inventory_GetAvailable'
    `);

    if (spCheck.recordset.length > 0) {
      console.log('✓ Stored procedure exists');
      try {
        const spResult = await pool.request()
          .input('ProductId', sql.UniqueIdentifier, prod.id)
          .input('StoreId', sql.UniqueIdentifier, prod.store_id)
          .execute('sp_Inventory_GetAvailable');
        
        console.log('SP Result:', spResult.recordset);
      } catch (spError: any) {
        console.log('SP Error:', spError.message);
      }
    } else {
      console.log('Stored procedure does not exist');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    if (pool) await pool.close();
  }
}

checkInventory();
