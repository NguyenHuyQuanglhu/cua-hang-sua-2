import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  server: process.env.DB_SERVER || '',
  database: process.env.DB_NAME || '',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

async function fixAndDebug() {
  try {
    await sql.connect(config);
    console.log('Connected to database\n');

    const storeId = 'B6E006C7-0115-4C46-9764-6BA61B911964'; // cửa hàng sữa

    // 1. Check what API query returns
    console.log('=== SIMULATING API QUERY ===');
    const apiQuery = `
      SELECT 
        po.*, 
        s.name as supplier_name, 
        (SELECT COUNT(*) FROM PurchaseOrderItems WHERE purchase_order_id = po.id) as item_count 
      FROM PurchaseOrders po 
      LEFT JOIN Suppliers s ON po.supplier_id = s.id 
      WHERE po.store_id = @storeId 
      ORDER BY po.updated_at DESC 
      OFFSET 0 ROWS 
      FETCH NEXT 20 ROWS ONLY
    `;
    
    const request1 = new sql.Request();
    request1.input('storeId', sql.UniqueIdentifier, storeId);
    const apiResult = await request1.query(apiQuery);
    
    console.log(`Total records returned: ${apiResult.recordset.length}`);
    console.log('\nFirst 5 order numbers:');
    apiResult.recordset.slice(0, 5).forEach((r, i) => {
      console.log(`  ${i+1}. ${r.order_number} - ${r.supplier_name} - Updated: ${r.updated_at}`);
    });

    // 2. Check if the 2 missing orders exist
    console.log('\n=== CHECKING MISSING ORDERS ===');
    const checkQuery = `
      SELECT order_number, updated_at, created_at
      FROM PurchaseOrders 
      WHERE order_number IN ('PN2026010031', 'PN2026010030')
      AND store_id = @storeId
    `;
    
    const request2 = new sql.Request();
    request2.input('storeId', sql.UniqueIdentifier, storeId);
    const checkResult = await request2.query(checkQuery);
    
    if (checkResult.recordset.length === 0) {
      console.log('❌ Orders PN2026010031 and PN2026010030 NOT FOUND in this store!');
    } else {
      console.log('✓ Found orders:');
      checkResult.recordset.forEach(r => {
        console.log(`  ${r.order_number}: created=${r.created_at}, updated=${r.updated_at}`);
      });
    }

    // 3. Check all orders sorted by updated_at
    console.log('\n=== ALL ORDERS SORTED BY UPDATED_AT DESC ===');
    const allQuery = `
      SELECT TOP 10 order_number, updated_at, created_at
      FROM PurchaseOrders 
      WHERE store_id = @storeId
      ORDER BY updated_at DESC
    `;
    
    const request3 = new sql.Request();
    request3.input('storeId', sql.UniqueIdentifier, storeId);
    const allResult = await request3.query(allQuery);
    
    allResult.recordset.forEach((r, i) => {
      console.log(`  ${i+1}. ${r.order_number} - Updated: ${r.updated_at}`);
    });

    // 4. Fix: Update updated_at for the 2 missing orders to NOW
    console.log('\n=== FIXING UPDATED_AT ===');
    const fixQuery = `
      UPDATE PurchaseOrders 
      SET updated_at = GETDATE()
      WHERE order_number IN ('PN2026010031', 'PN2026010030')
      AND store_id = @storeId
    `;
    
    const request4 = new sql.Request();
    request4.input('storeId', sql.UniqueIdentifier, storeId);
    const fixResult = await request4.query(fixQuery);
    
    console.log(`✓ Updated ${fixResult.rowsAffected[0]} records`);

    // 5. Verify fix
    console.log('\n=== VERIFYING FIX ===');
    const verifyQuery = `
      SELECT TOP 5 order_number, updated_at
      FROM PurchaseOrders 
      WHERE store_id = @storeId
      ORDER BY updated_at DESC
    `;
    
    const request5 = new sql.Request();
    request5.input('storeId', sql.UniqueIdentifier, storeId);
    const verifyResult = await request5.query(verifyQuery);
    
    console.log('Top 5 orders after fix:');
    verifyResult.recordset.forEach((r, i) => {
      console.log(`  ${i+1}. ${r.order_number} - Updated: ${r.updated_at}`);
    });

    console.log('\n✅ DONE! Now refresh the purchases page.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.close();
  }
}

fixAndDebug();
