import sql from 'mssql';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

async function createSampleProducts() {
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
  
  // Tìm cửa hàng sữa
  const store = await pool.request()
    .query("SELECT id, name FROM Stores WHERE name LIKE N'%sữa%' ORDER BY created_at DESC");
  
  if (store.recordset.length === 0) {
    console.log('❌ Không tìm thấy cửa hàng sữa!');
    await pool.close();
    return;
  }
  
  const storeId = store.recordset[0].id;
  const storeName = store.recordset[0].name;
  
  console.log(`\n✅ Cửa hàng: ${storeName}\n`);
  
  // Lấy danh mục
  const categories = await pool.request()
    .input('storeId', storeId)
    .execute('sp_Categories_GetByStore');
  
  const categoryMap = new Map();
  categories.recordset.forEach(cat => {
    categoryMap.set(cat.name, cat.id);
  });
  
  // Lấy đơn vị
  const units = await pool.request()
    .input('storeId', storeId)
    .execute('sp_Units_GetByStore');
  
  const unitMap = new Map();
  units.recordset.forEach(unit => {
    unitMap.set(unit.name, unit.id);
  });
  
  // Xóa sản phẩm cũ
  console.log('🗑️  Xóa sản phẩm cũ...');
  const oldProducts = await pool.request()
    .input('storeId', storeId)
    .execute('sp_Products_GetByStore');
  
  for (const product of oldProducts.recordset) {
    await pool.request()
      .input('id', product.id)
      .input('storeId', storeId)
      .execute('sp_Products_Delete');
  }
  console.log(`   Đã xóa ${oldProducts.recordset.length} sản phẩm cũ\n`);
  
  // Danh sách sản phẩm mẫu
  const products = [
    // Sữa tươi
    {
      name: 'TH True Milk Nguyên chất 180ml',
      category: 'Sữa tươi',
      unit: 'Hộp',
      costPrice: 6000,
      price: 8000,
      sku: 'TH180',
      description: 'Sữa tươi tiệt trùng nguyên chất TH True Milk hộp 180ml'
    },
    {
      name: 'TH True Milk Nguyên chất 1L',
      category: 'Sữa tươi',
      unit: 'Hộp',
      costPrice: 28000,
      price: 35000,
      sku: 'TH1000',
      description: 'Sữa tươi tiệt trùng nguyên chất TH True Milk hộp 1L'
    },
    {
      name: 'Vinamilk 100% Sữa tươi 1L',
      category: 'Sữa tươi',
      unit: 'Chai',
      costPrice: 28000,
      price: 35000,
      sku: 'VNM1000',
      description: 'Sữa tươi tiệt trùng Vinamilk 100% chai 1L'
    },
    {
      name: 'Vinamilk Ít đường 1L',
      category: 'Sữa tươi',
      unit: 'Chai',
      costPrice: 26000,
      price: 33000,
      sku: 'VNMIT1000',
      description: 'Sữa tươi tiệt trùng ít đường Vinamilk chai 1L'
    },
    {
      name: 'Dalat Milk Tươi nguyên chất 1L',
      category: 'Sữa tươi',
      unit: 'Hộp',
      costPrice: 32000,
      price: 40000,
      sku: 'DLM1000',
      description: 'Sữa tươi Đà Lạt nguyên chất hộp 1L'
    },
    
    // Sữa chua
    {
      name: 'Vinamilk Sữa chua uống 100g',
      category: 'Sữa chua',
      unit: 'Gói',
      costPrice: 3500,
      price: 5000,
      sku: 'VNMSC100',
      description: 'Sữa chua uống Vinamilk gói 100g'
    },
    {
      name: 'Vinamilk Sữa chua ăn 100g',
      category: 'Sữa chua',
      unit: 'Hũ',
      costPrice: 4000,
      price: 6000,
      sku: 'VNMSCA100',
      description: 'Sữa chua ăn Vinamilk hũ 100g'
    },
    {
      name: 'TH True Yogurt Dâu 100g',
      category: 'Sữa chua',
      unit: 'Hũ',
      costPrice: 5000,
      price: 7000,
      sku: 'THYOG100',
      description: 'Sữa chua ăn TH True Yogurt vị dâu 100g'
    },
    {
      name: 'Vinamilk Probi Dâu 100ml',
      category: 'Sữa chua',
      unit: 'Chai',
      costPrice: 6000,
      price: 8500,
      sku: 'PROBI100',
      description: 'Sữa chua uống Probi vị dâu 100ml'
    },
    
    // Sữa đặc
    {
      name: 'Ông Thọ Sữa đặc có đường 380g',
      category: 'Sữa đặc',
      unit: 'Hộp',
      costPrice: 18000,
      price: 24000,
      sku: 'OT380',
      description: 'Sữa đặc có đường Ông Thọ lon 380g'
    },
    {
      name: 'Vinamilk Sữa đặc có đường 380g',
      category: 'Sữa đặc',
      unit: 'Hộp',
      costPrice: 16000,
      price: 22000,
      sku: 'VNMSD380',
      description: 'Sữa đặc có đường Vinamilk lon 380g'
    },
    
    // Sữa bột
    {
      name: 'Vinamilk Optimum Gold 900g',
      category: 'Sữa bột',
      unit: 'Hộp',
      costPrice: 280000,
      price: 350000,
      sku: 'OPTGOLD900',
      description: 'Sữa bột Vinamilk Optimum Gold lon 900g'
    },
    {
      name: 'TH True Milk Sữa bột 400g',
      category: 'Sữa bột',
      unit: 'Hộp',
      costPrice: 120000,
      price: 150000,
      sku: 'THBOT400',
      description: 'Sữa bột TH True Milk lon 400g'
    },
    
    // Sữa hạt
    {
      name: 'Vinamilk Sữa đậu nành 1L',
      category: 'Sữa hạt',
      unit: 'Hộp',
      costPrice: 18000,
      price: 24000,
      sku: 'VNMDN1000',
      description: 'Sữa đậu nành Vinamilk hộp 1L'
    },
    {
      name: 'Vinasoy Sữa đậu nành 1L',
      category: 'Sữa hạt',
      unit: 'Hộp',
      costPrice: 16000,
      price: 22000,
      sku: 'VSOY1000',
      description: 'Sữa đậu nành Vinasoy hộp 1L'
    },
    
    // Phô mai
    {
      name: 'Phô mai Con Bò Cười 8 miếng',
      category: 'Phô mai',
      unit: 'Hộp',
      costPrice: 35000,
      price: 45000,
      sku: 'BOCUOI8',
      description: 'Phô mai Con Bò Cười hộp 8 miếng'
    },
    {
      name: 'Phô mai Laughing Cow 16 miếng',
      category: 'Phô mai',
      unit: 'Hộp',
      costPrice: 65000,
      price: 85000,
      sku: 'LCOW16',
      description: 'Phô mai Laughing Cow hộp 16 miếng'
    },
    {
      name: 'Phô mai lát Anchor 250g',
      category: 'Phô mai',
      unit: 'Hộp',
      costPrice: 55000,
      price: 70000,
      sku: 'ANCHOR250',
      description: 'Phô mai lát Anchor gói 250g'
    },
    
    // Bơ sữa
    {
      name: 'Bơ Anchor 227g',
      category: 'Bơ sữa',
      unit: 'Hộp',
      costPrice: 65000,
      price: 85000,
      sku: 'BOANCHOR227',
      description: 'Bơ lạt Anchor hộp 227g'
    },
    {
      name: 'Bơ Président 200g',
      category: 'Bơ sữa',
      unit: 'Hộp',
      costPrice: 55000,
      price: 72000,
      sku: 'BOPRES200',
      description: 'Bơ lạt Président hộp 200g'
    },
    
    // Kem
    {
      name: 'Kem tươi Anchor 250ml',
      category: 'Kem',
      unit: 'Hộp',
      costPrice: 45000,
      price: 60000,
      sku: 'KEMANCHOR250',
      description: 'Kem tươi Anchor hộp 250ml'
    },
    {
      name: 'Kem tươi Elle & Vire 200ml',
      category: 'Kem',
      unit: 'Hộp',
      costPrice: 38000,
      price: 50000,
      sku: 'KEMEV200',
      description: 'Kem tươi Elle & Vire hộp 200ml'
    },
  ];
  
  console.log('📦 Đang tạo sản phẩm mẫu...\n');
  
  let successCount = 0;
  
  for (const product of products) {
    try {
      const categoryId = categoryMap.get(product.category);
      const unitId = unitMap.get(product.unit);
      
      if (!categoryId) {
        console.log(`   ⚠️  Bỏ qua "${product.name}" - Không tìm thấy danh mục "${product.category}"`);
        continue;
      }
      
      if (!unitId) {
        console.log(`   ⚠️  Bỏ qua "${product.name}" - Không tìm thấy đơn vị "${product.unit}"`);
        continue;
      }
      
      const newId = crypto.randomUUID().toUpperCase();
      
      await pool.request()
        .input('id', newId)
        .input('storeId', storeId)
        .input('categoryId', categoryId)
        .input('name', product.name)
        .input('description', product.description)
        .input('price', product.price)
        .input('costPrice', product.costPrice)
        .input('sku', product.sku)
        .input('unitId', unitId)
        .input('stockQuantity', 0)
        .input('images', null)
        .input('status', 'active')
        .execute('sp_Products_Create');
      
      successCount++;
      console.log(`   ✅ ${product.name}`);
      console.log(`      Danh mục: ${product.category} | Đơn vị: ${product.unit}`);
      console.log(`      Giá nhập: ${product.costPrice.toLocaleString('vi-VN')}đ | Giá bán: ${product.price.toLocaleString('vi-VN')}đ\n`);
      
    } catch (error) {
      console.error(`   ❌ Lỗi khi tạo "${product.name}":`, error);
    }
  }
  
  console.log(`\n✅ Đã tạo ${successCount}/${products.length} sản phẩm thành công!\n`);
  
  // Hiển thị tổng kết
  const finalProducts = await pool.request()
    .input('storeId', storeId)
    .execute('sp_Products_GetByStore');
  
  console.log('📋 TỔNG KẾT SẢN PHẨM THEO DANH MỤC:\n');
  
  const byCategory = new Map<string, any[]>();
  
  finalProducts.recordset.forEach(product => {
    const catName = product.categoryName || 'Chưa phân loại';
    if (!byCategory.has(catName)) {
      byCategory.set(catName, []);
    }
    byCategory.get(catName)!.push(product);
  });
  
  byCategory.forEach((products, categoryName) => {
    console.log(`\n📁 ${categoryName} (${products.length} sản phẩm):`);
    products.forEach((p, index) => {
      console.log(`   ${index + 1}. ${p.name} - ${p.costPrice?.toLocaleString('vi-VN')}đ / ${p.price?.toLocaleString('vi-VN')}đ`);
    });
  });
  
  console.log('\n\n💡 HƯỚNG DẪN SỬ DỤNG:');
  console.log('   1. Vào trang "Sản phẩm" để xem danh sách');
  console.log('   2. Vào "Nhập hàng" để tạo đơn nhập hàng');
  console.log('   3. Chọn sản phẩm và đơn vị (Lốc/Thùng để nhập số lượng lớn)');
  console.log('   4. Hệ thống tự động quy đổi về đơn vị cơ bản');
  
  await pool.close();
}

createSampleProducts().catch(console.error);
