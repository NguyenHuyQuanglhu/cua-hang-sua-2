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

async function checkProductUnitId() {
  try {
    await sql.connect(config);
    console.log('Connected to database\n');

    // Get store ID
    const storeResult = await sql.query`SELECT TOP 1 id FROM Stores WHERE status = 'active'`;
    const storeId = storeResult.recordset[0].id;
    console.log(`Using store ID: ${storeId}\n`);

    // Check products with their unitId
    console.log('=== Products and their Unit IDs ===\n');
    const productsResult = await sql.query`
      SELECT TOP 10
        p.id,
        p.name,
        p.unit_id,
        u.name as unit_name
      FROM Products p
      LEFT JOIN Units u ON p.unit_id = u.id
      WHERE p.store_id = ${storeId} AND p.status != 'deleted'
      ORDER BY p.created_at DESC
    `;

    productsResult.recordset.forEach((p: any) => {
      console.log(`Product: ${p.name}`);
      console.log(`  unit_id: ${p.unit_id || 'NULL'}`);
      console.log(`  unit_name: ${p.unit_name || 'NULL'}`);
      console.log('');
    });

    // Check via stored procedure
    console.log('=== Via Stored Procedure ===\n');
    const spResult = await sql.query`EXEC sp_Products_GetByStore @storeId = ${storeId}`;
    
    const firstProduct = spResult.recordset[0];
    if (firstProduct) {
      console.log(`First product: ${firstProduct.name}`);
      console.log(`  unitId: ${firstProduct.unitId || 'NULL'}`);
      console.log(`  categoryId: ${firstProduct.categoryId || 'NULL'}`);
      console.log(`  status: ${firstProduct.status || 'NULL'}`);
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkProductUnitId();
