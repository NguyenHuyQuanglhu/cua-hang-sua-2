import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

async function checkCategories() {
  const config: sql.config = {
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'SmartInventory',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    options: { 
      encrypt: process.env.DB_ENCRYPT === 'true', 
      trustServerCertificate: true 
    }
  };
  
  console.log('🔌 Connecting to database...');
  const pool = await sql.connect(config);
  
  // Lấy tất cả danh mục và cửa hàng
  const result = await pool.request()
    .query(`
      SELECT 
        c.id,
        c.name AS categoryName,
        c.store_id,
        s.name AS storeName
      FROM Categories c
      LEFT JOIN Stores s ON c.store_id = s.id
      ORDER BY s.name, c.name
    `);
  
  console.log('\n📋 DANH MỤC THEO CỬA HÀNG:\n');
  
  // Group by store
  const byStore = new Map<string, any[]>();
  
  result.recordset.forEach(row => {
    const storeName = row.storeName || 'Không có cửa hàng';
    if (!byStore.has(storeName)) {
      byStore.set(storeName, []);
    }
    byStore.get(storeName)!.push(row);
  });
  
  byStore.forEach((categories, storeName) => {
    console.log(`\n🏪 ${storeName}:`);
    categories.forEach((cat, index) => {
      console.log(`   ${index + 1}. ${cat.categoryName} (ID: ${cat.id})`);
    });
  });
  
  // Kiểm tra xem có danh mục nào bị duplicate không
  console.log('\n\n🔍 KIỂM TRA DUPLICATE:\n');
  
  const categoryNames = new Map<string, string[]>();
  result.recordset.forEach(row => {
    if (!categoryNames.has(row.categoryName)) {
      categoryNames.set(row.categoryName, []);
    }
    categoryNames.get(row.categoryName)!.push(row.storeName);
  });
  
  categoryNames.forEach((stores, catName) => {
    if (stores.length > 1) {
      console.log(`⚠️  "${catName}" xuất hiện ở ${stores.length} cửa hàng: ${stores.join(', ')}`);
    }
  });
  
  await pool.close();
}

checkCategories().catch(console.error);
