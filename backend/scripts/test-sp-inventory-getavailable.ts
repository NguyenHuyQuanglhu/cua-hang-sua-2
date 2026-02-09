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

async function testSP() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Testing sp_Inventory_GetAvailable...\n');
    pool = await sql.connect(config);

    // Get DX Decade info
    const product = await pool.request().query(`
      SELECT p.id, p.name, p.store_id, p.unit_id, s.name as store_name, u.name as unit_name
      FROM Products p
      LEFT JOIN Stores s ON p.store_id = s.id
      LEFT JOIN Units u ON p.unit_id = u.id
      WHERE p.name LIKE '%DX Decade%'
    `);

    if (product.recordset.length === 0) {
      console.log('❌ Product not found');
      return;
    }

    const prod = product.recordset[0];
    console.log(`Product: ${prod.name}`);
    console.log(`Store: ${prod.store_name}`);
    console.log(`Unit: ${prod.unit_name}`);
    console.log(`Product ID: ${prod.id}`);
    console.log(`Store ID: ${prod.store_id}`);
    console.log(`Unit ID: ${prod.unit_id}\n`);

    // Check if SP exists
    const spCheck = await pool.request().query(`
      SELECT ROUTINE_NAME, CREATED, LAST_ALTERED
      FROM INFORMATION_SCHEMA.ROUTINES 
      WHERE ROUTINE_NAME = 'sp_Inventory_GetAvailable'
    `);

    if (spCheck.recordset.length === 0) {
      console.log('❌ Stored procedure sp_Inventory_GetAvailable does NOT exist!');
      console.log('You need to deploy it first.');
      return;
    }

    console.log('✓ Stored procedure exists');
    console.log(`  Created: ${spCheck.recordset[0].CREATED}`);
    console.log(`  Last altered: ${spCheck.recordset[0].LAST_ALTERED}\n`);

    // Test the SP
    console.log('=== Testing SP with DX Decade ===');
    const result = await pool.request()
      .input('productId', sql.NVarChar(36), prod.id)
      .input('storeId', sql.NVarChar(36), prod.store_id)
      .input('unitId', sql.NVarChar(36), prod.unit_id)
      .execute('sp_Inventory_GetAvailable');

    console.log('SP Result:');
    if (result.recordset.length > 0) {
      const row = result.recordset[0];
      console.log(`  Product: ${row.productName}`);
      console.log(`  Unit: ${row.unitName}`);
      console.log(`  Available Quantity: ${row.availableQuantity}`);
      
      if (row.availableQuantity === 0) {
        console.log('\n⚠️  SP returns 0 quantity!');
        console.log('Checking ProductInventory directly...\n');
        
        const directCheck = await pool.request()
          .input('productId', sql.UniqueIdentifier, prod.id)
          .input('storeId', sql.UniqueIdentifier, prod.store_id)
          .query(`
            SELECT 
              pi.Quantity,
              pi.UnitId,
              u.name as UnitName,
              u.base_unit_id,
              u.conversion_factor
            FROM ProductInventory pi
            LEFT JOIN Units u ON pi.UnitId = u.id
            WHERE pi.ProductId = @productId AND pi.StoreId = @storeId
          `);
        
        if (directCheck.recordset.length > 0) {
          console.log('Direct ProductInventory query:');
          directCheck.recordset.forEach((inv: any) => {
            console.log(`  Unit: ${inv.UnitName}`);
            console.log(`  Quantity: ${inv.Quantity}`);
            console.log(`  Base Unit ID: ${inv.base_unit_id || 'NULL (this IS the base unit)'}`);
            console.log(`  Conversion Factor: ${inv.conversion_factor || 'NULL'}`);
            console.log('---');
          });
        }
      } else {
        console.log('\n✅ SP returns correct quantity!');
      }
    } else {
      console.log('❌ No result from SP');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.precedingErrors) {
      error.precedingErrors.forEach((err: any) => {
        console.error('  -', err.message);
      });
    }
  } finally {
    if (pool) await pool.close();
  }
}

testSP();
