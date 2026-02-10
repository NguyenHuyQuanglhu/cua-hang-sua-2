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

async function testDeleteFunctionality() {
  try {
    await sql.connect(config);
    console.log('Connected to database\n');

    // Get store ID
    const storeResult = await sql.query`SELECT TOP 1 id FROM Stores WHERE status = 'active'`;
    const storeId = storeResult.recordset[0].id;
    console.log(`Using store ID: ${storeId}\n`);

    // Test 1: Create a test customer
    console.log('=== TEST 1: Create Test Customer ===');
    const customerId = 'AAAAAAAA-BBBB-CCCC-DDDD-' + Date.now().toString().substring(0, 12).padStart(12, '0');
    await sql.query`
      INSERT INTO Customers (id, store_id, full_name, phone, status, created_at, updated_at)
      VALUES (${customerId}, ${storeId}, 'Test Customer Delete', '0123456789', 'active', GETDATE(), GETDATE())
    `;
    console.log(`✓ Created test customer: ${customerId}`);

    // Test 2: Verify customer appears in GetByStore
    console.log('\n=== TEST 2: Verify Customer Appears ===');
    const beforeDelete = await sql.query`EXEC sp_Customers_GetByStore @storeId = ${storeId}`;
    const customerBefore = beforeDelete.recordset.find((c: any) => c.id === customerId);
    console.log(`✓ Customer found in list: ${customerBefore ? 'YES' : 'NO'}`);
    if (customerBefore) {
      console.log(`  Name: ${customerBefore.name}, Status: ${customerBefore.status}`);
    }

    // Test 3: Delete the customer
    console.log('\n=== TEST 3: Delete Customer ===');
    const deleteResult = await sql.query`EXEC sp_Customers_Delete @id = ${customerId}, @storeId = ${storeId}`;
    console.log(`✓ Delete executed, affected rows: ${deleteResult.recordset[0].AffectedRows}`);

    // Test 4: Verify customer does NOT appear in GetByStore
    console.log('\n=== TEST 4: Verify Customer Hidden After Delete ===');
    const afterDelete = await sql.query`EXEC sp_Customers_GetByStore @storeId = ${storeId}`;
    const customerAfter = afterDelete.recordset.find((c: any) => c.id === customerId);
    console.log(`✓ Customer found in list: ${customerAfter ? 'NO - FAILED!' : 'NO - SUCCESS!'}`);

    // Test 5: Verify customer still exists in database with status='deleted'
    console.log('\n=== TEST 5: Verify Soft Delete (status=deleted) ===');
    const directQuery = await sql.query`SELECT id, full_name, status FROM Customers WHERE id = ${customerId}`;
    if (directQuery.recordset.length > 0) {
      const customer = directQuery.recordset[0];
      console.log(`✓ Customer still exists in database`);
      console.log(`  Name: ${customer.full_name}`);
      console.log(`  Status: ${customer.status}`);
      console.log(`  Soft delete working: ${customer.status === 'deleted' ? 'YES ✓' : 'NO ✗'}`);
    } else {
      console.log('✗ Customer was hard deleted (not found in database)');
    }

    // Test 6: Test Products delete
    console.log('\n=== TEST 6: Test Products Delete ===');
    const productId = 'BBBBBBBB-CCCC-DDDD-EEEE-' + Date.now().toString().substring(0, 12).padStart(12, '0');
    await sql.query`
      INSERT INTO Products (id, store_id, name, price, cost_price, stock_quantity, status, created_at, updated_at)
      VALUES (${productId}, ${storeId}, 'Test Product Delete', 100, 50, 10, 'active', GETDATE(), GETDATE())
    `;
    console.log(`✓ Created test product: ${productId}`);

    const beforeProductDelete = await sql.query`EXEC sp_Products_GetByStore @storeId = ${storeId}`;
    const productBefore = beforeProductDelete.recordset.find((p: any) => p.id === productId);
    console.log(`✓ Product found in list: ${productBefore ? 'YES' : 'NO'}`);

    await sql.query`EXEC sp_Products_Delete @id = ${productId}, @storeId = ${storeId}`;
    console.log(`✓ Product deleted`);

    const afterProductDelete = await sql.query`EXEC sp_Products_GetByStore @storeId = ${storeId}`;
    const productAfter = afterProductDelete.recordset.find((p: any) => p.id === productId);
    console.log(`✓ Product hidden after delete: ${!productAfter ? 'YES ✓' : 'NO ✗'}`);

    console.log('\n=== ALL TESTS COMPLETED ===');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testDeleteFunctionality();
