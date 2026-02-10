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

async function checkLatestProducts() {
  try {
    await sql.connect(config);
    console.log('Connected to database\n');

    // Get store ID
    const storeResult = await sql.query`SELECT TOP 1 id FROM Stores WHERE status = 'active'`;
    const storeId = storeResult.recordset[0].id;

    // Check latest products
    console.log('=== Latest 5 Products ===\n');
    const productResult = await sql.query`
      SELECT TOP 5
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
      WHERE p.store_id = ${storeId}
      ORDER BY p.created_at DESC
    `;

    productResult.recordset.forEach((p: any, index: number) => {
      console.log(`${index + 1}. ${p.name}`);
      console.log(`   Price (Giá bán): ${p.price?.toLocaleString() || 'NULL'} VND`);
      console.log(`   Cost Price (Giá nhập): ${p.cost_price?.toLocaleString() || 'NULL'} VND`);
      console.log(`   Unit: ${p.unit_name || 'NULL'}`);
      console.log(`   Status: ${p.status}`);
      console.log(`   Created: ${p.created_at}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkLatestProducts();
