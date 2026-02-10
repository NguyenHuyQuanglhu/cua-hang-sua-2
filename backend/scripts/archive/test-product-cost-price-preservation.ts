import sql from 'mssql';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const config: sql.config = {
  server: process.env.DB_SERVER || '',
  database: process.env.DB_NAME || '',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function testCostPricePreservation() {
  try {
    await sql.connect(config);
    console.log('Connected to database\n');

    // Get store ID
    const storeResult = await sql.query`SELECT TOP 1 id FROM Stores WHERE status = 'active'`;
    const storeId = storeResult.recordset[0].id;
    console.log(`Using store ID: ${storeId}\n`);

    // Test 1: Create a product with cost price
    console.log('=== TEST 1: Create Product with Cost Price ===');
    const productId = 'CCCCCCCC-DDDD-EEEE-FFFF-' + Date.now().toString().substring(0, 12).padStart(12, '0');
    const costPrice = 50000;
    const sellingPrice = 75000;
    
    await sql.query`
      INSERT INTO Products (id, store_id, name, price, cost_price, stock_quantity, status, created_at, updated_at)
      VALUES (${productId}, ${storeId}, 'Test Product Cost Price', ${sellingPrice}, ${costPrice}, 10, 'active', GETDATE(), GETDATE())
    `;
    console.log(`✓ Created product with:`);
    console.log(`  Cost Price: ${costPrice.toLocaleString()} VND`);
    console.log(`  Selling Price: ${sellingPrice.toLocaleString()} VND`);

    // Test 2: Fetch product via stored procedure (simulating API call)
    console.log('\n=== TEST 2: Fetch Product via SP (API Simulation) ===');
    const fetchResult = await sql.query`EXEC sp_Products_GetByStore @storeId = ${storeId}`;
    const fetchedProduct = fetchResult.recordset.find((p: any) => p.id === productId);
    
    if (fetchedProduct) {
      console.log(`✓ Product fetched successfully:`);
      console.log(`  Name: ${fetchedProduct.name}`);
      console.log(`  Cost Price: ${fetchedProduct.costPrice?.toLocaleString() || 'NULL'} VND`);
      console.log(`  Selling Price: ${fetchedProduct.price?.toLocaleString() || 'NULL'} VND`);
      console.log(`  Cost Price preserved: ${fetchedProduct.costPrice === costPrice ? 'YES ✓' : 'NO ✗'}`);
    } else {
      console.log('✗ Product not found in fetch result');
    }

    // Test 3: Update product (simulating edit without changing cost price)
    console.log('\n=== TEST 3: Update Product Name Only ===');
    const newName = 'Test Product Cost Price - UPDATED';
    await sql.query`
      UPDATE Products 
      SET name = ${newName}, updated_at = GETDATE()
      WHERE id = ${productId} AND store_id = ${storeId}
    `;
    console.log(`✓ Updated product name to: "${newName}"`);

    // Test 4: Verify cost price is still preserved
    console.log('\n=== TEST 4: Verify Cost Price Still Preserved ===');
    const verifyResult = await sql.query`EXEC sp_Products_GetByStore @storeId = ${storeId}`;
    const verifiedProduct = verifyResult.recordset.find((p: any) => p.id === productId);
    
    if (verifiedProduct) {
      console.log(`✓ Product after update:`);
      console.log(`  Name: ${verifiedProduct.name}`);
      console.log(`  Cost Price: ${verifiedProduct.costPrice?.toLocaleString() || 'NULL'} VND`);
      console.log(`  Selling Price: ${verifiedProduct.price?.toLocaleString() || 'NULL'} VND`);
      console.log(`  Cost Price still preserved: ${verifiedProduct.costPrice === costPrice ? 'YES ✓' : 'NO ✗'}`);
    } else {
      console.log('✗ Product not found in verification');
    }

    // Test 5: Update with new cost price
    console.log('\n=== TEST 5: Update Cost Price ===');
    const newCostPrice = 55000;
    await sql.query`
      UPDATE Products 
      SET cost_price = ${newCostPrice}, updated_at = GETDATE()
      WHERE id = ${productId} AND store_id = ${storeId}
    `;
    console.log(`✓ Updated cost price to: ${newCostPrice.toLocaleString()} VND`);

    const finalResult = await sql.query`EXEC sp_Products_GetByStore @storeId = ${storeId}`;
    const finalProduct = finalResult.recordset.find((p: any) => p.id === productId);
    
    if (finalProduct) {
      console.log(`✓ Product after cost price update:`);
      console.log(`  Cost Price: ${finalProduct.costPrice?.toLocaleString() || 'NULL'} VND`);
      console.log(`  New cost price applied: ${finalProduct.costPrice === newCostPrice ? 'YES ✓' : 'NO ✗'}`);
    }

    // Cleanup
    console.log('\n=== CLEANUP ===');
    await sql.query`DELETE FROM Products WHERE id = ${productId}`;
    console.log('✓ Test product deleted');

    console.log('\n=== ALL TESTS COMPLETED ===');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testCostPricePreservation();
