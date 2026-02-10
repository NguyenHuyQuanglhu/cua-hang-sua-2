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

async function checkSuaBoProduct() {
  try {
    await sql.connect(config);
    console.log('Connected to database\n');

    // Get store ID
    const storeResult = await sql.query`SELECT TOP 1 id FROM Stores WHERE status = 'active'`;
    const storeId = storeResult.recordset[0].id;

    // Check "Sữa bò" product
    console.log('=== Checking "Sữa bò" Product ===\n');
    const productResult = await sql.query`
      SELECT 
        p.id,
        p.name,
        p.price,
        p.cost_price,
        p.unit_id,
        u.name as unit_name,
        p.status,
        p.created_at
      FROM Products p
      LEFT JOIN Units u ON p.unit_id = u.id
      WHERE p.name LIKE '%Sữa bò%' 
        AND p.store_id = ${storeId}
        AND p.status != 'deleted'
      ORDER BY p.created_at DESC
    `;

    if (productResult.recordset.length === 0) {
      console.log('Product "Sữa bò" not found');
      return;
    }

    productResult.recordset.forEach((p: any) => {
      console.log(`Product: ${p.name}`);
      console.log(`  ID: ${p.id}`);
      console.log(`  Price (Giá bán): ${p.price?.toLocaleString() || 'NULL'} VND`);
      console.log(`  Cost Price (Giá nhập): ${p.cost_price?.toLocaleString() || 'NULL'} VND`);
      console.log(`  Unit: ${p.unit_name || 'NULL'}`);
      console.log(`  Status: ${p.status}`);
      console.log(`  Created: ${p.created_at}`);
      console.log('');
    });

    // Check via stored procedure (API simulation)
    console.log('=== Via Stored Procedure (API) ===\n');
    const spResult = await sql.query`EXEC sp_Products_GetByStore @storeId = ${storeId}`;
    const suaBo = spResult.recordset.find((p: any) => p.name.includes('Sữa bò'));

    if (suaBo) {
      console.log(`Product: ${suaBo.name}`);
      console.log(`  Price (Giá bán): ${suaBo.price?.toLocaleString() || 'NULL'} VND`);
      console.log(`  Cost Price (Giá nhập): ${suaBo.costPrice?.toLocaleString() || 'NULL'} VND`);
      console.log(`  Current Stock: ${suaBo.currentStock || 0}`);
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSuaBoProduct();
