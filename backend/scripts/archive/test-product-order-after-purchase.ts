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

async function testProductOrderAfterPurchase() {
  try {
    await sql.connect(config);
    console.log('Connected to database\n');

    // Get store ID
    const storeResult = await sql.query`SELECT TOP 1 id FROM Stores WHERE status = 'active'`;
    const storeId = storeResult.recordset[0].id;

    // Get top 3 products before update
    console.log('=== Top 3 Products BEFORE Purchase ===\n');
    const beforeResult = await sql.query`EXEC sp_Products_GetByStore @storeId = ${storeId}`;
    beforeResult.recordset.slice(0, 3).forEach((p: any, i: number) => {
      console.log(`${i + 1}. ${p.name}`);
      console.log(`   Updated: ${p.updatedAt}`);
    });

    // Simulate updating a product (like adding purchase)
    const productToUpdate = beforeResult.recordset[2]; // Get 3rd product
    console.log(`\n=== Simulating Purchase for: ${productToUpdate.name} ===\n`);
    
    await sql.query`
      UPDATE Products 
      SET updated_at = GETDATE()
      WHERE id = ${productToUpdate.id}
    `;
    console.log('✓ Updated product updated_at');

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 100));

    // Get top 3 products after update
    console.log('\n=== Top 3 Products AFTER Purchase ===\n');
    const afterResult = await sql.query`EXEC sp_Products_GetByStore @storeId = ${storeId}`;
    afterResult.recordset.slice(0, 3).forEach((p: any, i: number) => {
      console.log(`${i + 1}. ${p.name}`);
      console.log(`   Updated: ${p.updatedAt}`);
      if (p.id === productToUpdate.id) {
        console.log('   ⭐ THIS PRODUCT MOVED TO TOP!');
      }
    });

    console.log('\n=== TEST COMPLETED ===');
    console.log(`Product "${productToUpdate.name}" should now be at position 1`);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testProductOrderAfterPurchase();
