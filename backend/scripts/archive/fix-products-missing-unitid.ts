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

async function fixProductsMissingUnitId() {
  try {
    await sql.connect(config);
    console.log('Connected to database\n');

    // Get store ID
    const storeResult = await sql.query`SELECT TOP 1 id FROM Stores WHERE status = 'active'`;
    const storeId = storeResult.recordset[0].id;
    console.log(`Using store ID: ${storeId}\n`);

    // Find products without unitId
    console.log('=== Finding Products Without Unit ID ===\n');
    const productsResult = await sql.query`
      SELECT id, name, unit_id
      FROM Products
      WHERE store_id = ${storeId} 
        AND status != 'deleted'
        AND unit_id IS NULL
    `;

    console.log(`Found ${productsResult.recordset.length} products without unit_id\n`);

    if (productsResult.recordset.length === 0) {
      console.log('✓ All products have unit_id');
      return;
    }

    // Get a default unit (Chai)
    const unitResult = await sql.query`
      SELECT TOP 1 id, name
      FROM Units
      WHERE store_id = ${storeId}
      ORDER BY name
    `;

    if (unitResult.recordset.length === 0) {
      console.log('✗ No units found in database. Please create units first.');
      return;
    }

    const defaultUnit = unitResult.recordset[0];
    console.log(`Using default unit: ${defaultUnit.name} (${defaultUnit.id})\n`);

    // Update products
    console.log('=== Updating Products ===\n');
    for (const product of productsResult.recordset) {
      await sql.query`
        UPDATE Products
        SET unit_id = ${defaultUnit.id}, updated_at = GETDATE()
        WHERE id = ${product.id}
      `;
      console.log(`✓ Updated "${product.name}" with unit "${defaultUnit.name}"`);
    }

    console.log(`\n✓ Updated ${productsResult.recordset.length} products`);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixProductsMissingUnitId();
