import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

async function updateUnitDescriptions() {
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
  
  // Lấy tất cả đơn vị
  const units = await pool.request()
    .input('storeId', storeId)
    .execute('sp_Units_GetByStore');
  
  // Mô tả chi tiết cho từng đơn vị
  const descriptions: { [key: string]: string } = {
    'Hộp': 'Hộp sữa đơn lẻ (180ml, 200ml, 250ml, 1L). VD: 1 hộp TH True Milk 180ml',
    'Chai': 'Chai sữa đơn lẻ (500ml, 1L, 1.5L). VD: 1 chai Vinamilk 1L',
    'Gói': 'Gói sữa chua hoặc sữa bột đơn lẻ. VD: 1 gói sữa chua Vinamilk 100g',
    'Hũ': 'Hũ sữa chua hoặc phô mai đơn lẻ. VD: 1 hũ sữa chua Vinamilk 100g',
    'Kg': 'Kilogram - dùng cho bơ, kem, phô mai khối. VD: 1kg bơ Anchor',
    'Lát': 'Lát phô mai đơn lẻ. VD: 1 lát phô mai Laughing Cow',
    'Que': 'Que phô mai đơn lẻ. VD: 1 que phô mai Babybel',
    
    'Lốc 4 hộp': 'Lốc 4 hộp sữa (4 x 180ml hoặc 4 x 200ml). Khi nhập 1 lốc = tồn kho tăng 4 hộp',
    'Lốc 6 hộp': 'Lốc 6 hộp sữa (6 x 180ml hoặc 6 x 200ml). Khi nhập 1 lốc = tồn kho tăng 6 hộp',
    'Thùng 48 hộp': 'Thùng 48 hộp sữa (48 x 180ml). Khi nhập 1 thùng = tồn kho tăng 48 hộp',
    'Lốc 4 chai': 'Lốc 4 chai sữa (4 x 1L). Khi nhập 1 lốc = tồn kho tăng 4 chai',
    'Thùng 12 chai': 'Thùng 12 chai sữa (12 x 1L). Khi nhập 1 thùng = tồn kho tăng 12 chai',
    'Lốc 4 gói': 'Lốc 4 gói sữa chua (4 x 100g). Khi nhập 1 lốc = tồn kho tăng 4 gói',
    'Thùng 48 gói': 'Thùng 48 gói sữa chua (48 x 100g). Khi nhập 1 thùng = tồn kho tăng 48 gói',
  };
  
  console.log('📝 Đang cập nhật mô tả đơn vị...\n');
  
  for (const unit of units.recordset) {
    const newDescription = descriptions[unit.name];
    
    if (newDescription) {
      await pool.request()
        .input('id', unit.id)
        .input('storeId', storeId)
        .input('name', unit.name)
        .input('description', newDescription)
        .input('baseUnitId', unit.baseUnitId)
        .input('conversionFactor', unit.conversionFactor)
        .execute('sp_Units_Update');
      
      console.log(`✅ ${unit.name}`);
      console.log(`   ${newDescription}\n`);
    }
  }
  
  console.log('\n✅ Hoàn tất cập nhật!\n');
  
  // Hiển thị kết quả
  const updatedUnits = await pool.request()
    .input('storeId', storeId)
    .execute('sp_Units_GetByStore');
  
  console.log('📋 DANH SÁCH ĐƠN VỊ TÍNH SAU KHI CẬP NHẬT:\n');
  
  const baseUnits = updatedUnits.recordset.filter(u => !u.baseUnitId);
  const conversionUnits = updatedUnits.recordset.filter(u => u.baseUnitId);
  
  console.log('🔹 ĐơN VỊ CƠ BẢN (Đơn vị nhỏ nhất - dùng để bán lẻ):');
  baseUnits.forEach((unit, index) => {
    console.log(`\n${index + 1}. ${unit.name}`);
    console.log(`   ${unit.description}`);
  });
  
  console.log('\n\n🔹 ĐƠN VỊ QUY ĐỔI (Dùng để nhập hàng số lượng lớn):');
  conversionUnits.forEach((unit, index) => {
    const baseUnit = baseUnits.find(u => u.id === unit.baseUnitId);
    console.log(`\n${index + 1}. ${unit.name} = ${unit.conversionFactor} ${baseUnit?.name || ''}`);
    console.log(`   ${unit.description}`);
  });
  
  console.log('\n\n💡 CÁCH SỬ DỤNG:');
  console.log('   • Khi NHẬP HÀNG: Chọn đơn vị theo cách nhà cung cấp giao (Thùng, Lốc, hoặc đơn lẻ)');
  console.log('   • Khi BÁN HÀNG: Chọn đơn vị cơ bản (Hộp, Chai, Gói...)');
  console.log('   • Hệ thống tự động quy đổi: Nhập 1 Thùng 48 hộp = Tồn kho tăng 48 Hộp');
  
  await pool.close();
}

updateUnitDescriptions().catch(console.error);
