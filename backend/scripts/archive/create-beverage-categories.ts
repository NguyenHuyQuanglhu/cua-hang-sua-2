import sql from 'mssql';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

async function createCategories() {
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
  
  // Lấy danh sách cửa hàng
  const stores = await pool.request()
    .query('SELECT id, name FROM Stores ORDER BY created_at DESC');
  
  if (stores.recordset.length === 0) {
    console.log('❌ Không tìm thấy cửa hàng nào!');
    await pool.close();
    return;
  }
  
  console.log('\n📋 Danh sách cửa hàng:');
  stores.recordset.forEach((store, index) => {
    console.log(`${index + 1}. ${store.name} (${store.id})`);
  });
  
  // Sử dụng cửa hàng đầu tiên (mới nhất)
  const storeId = stores.recordset[0].id;
  const storeName = stores.recordset[0].name;
  
  console.log(`\n✅ Sử dụng cửa hàng: ${storeName}`);
  
  // Danh mục theo đơn vị đóng gói
  const categories = [
    {
      name: 'Bán lẻ (Chai/Lon)',
      description: 'Sản phẩm bán lẻ theo chai, lon, hộp đơn lẻ'
    },
    {
      name: 'Lốc (6 chai/lon)',
      description: 'Sản phẩm đóng gói theo lốc 6 chai hoặc 6 lon'
    },
    {
      name: 'Thùng (24 chai/lon)',
      description: 'Sản phẩm đóng gói theo thùng 24 chai hoặc 24 lon'
    },
    {
      name: 'Hộp (Carton)',
      description: 'Sản phẩm đóng hộp carton, hộp giấy'
    },
    {
      name: 'Bình/Can lớn',
      description: 'Sản phẩm đóng bình lớn, can 5L, 10L, 20L'
    },
    {
      name: 'Túi/Gói',
      description: 'Sản phẩm đóng túi, gói nhỏ'
    }
  ];
  
  console.log('\n📦 Đang tạo danh mục...\n');
  
  for (const category of categories) {
    try {
      // Kiểm tra xem danh mục đã tồn tại chưa
      const existing = await pool.request()
        .input('storeId', storeId)
        .input('name', category.name)
        .query('SELECT id FROM Categories WHERE store_id = @storeId AND name = @name');
      
      if (existing.recordset.length > 0) {
        console.log(`⏭️  Bỏ qua: "${category.name}" (đã tồn tại)`);
        continue;
      }
      
      // Tạo danh mục mới
      const newId = crypto.randomUUID().toUpperCase();
      
      const result = await pool.request()
        .input('id', newId)
        .input('storeId', storeId)
        .input('name', category.name)
        .input('description', category.description)
        .execute('sp_Categories_Create');
      
      console.log(`✅ Đã tạo: "${category.name}"`);
    } catch (error) {
      console.error(`❌ Lỗi khi tạo "${category.name}":`, error);
    }
  }
  
  console.log('\n✅ Hoàn tất tạo danh mục!');
  
  // Hiển thị danh sách danh mục đã tạo
  const allCategories = await pool.request()
    .input('storeId', storeId)
    .execute('sp_Categories_GetByStore');
  
  console.log('\n📋 Danh sách danh mục hiện tại:');
  allCategories.recordset.forEach((cat, index) => {
    console.log(`${index + 1}. ${cat.name} - ${cat.description || 'Không có mô tả'}`);
  });
  
  await pool.close();
}

createCategories().catch(console.error);
