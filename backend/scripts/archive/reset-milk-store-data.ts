import sql from 'mssql';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

async function resetMilkStoreData() {
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
  
  console.log(`\n✅ Tìm thấy cửa hàng: ${storeName} (${storeId})`);
  
  // ============================================
  // BƯỚC 1: XÓA DANH MỤC CŨ
  // ============================================
  console.log('\n🗑️  BƯỚC 1: Xóa danh mục cũ...');
  
  const oldCategories = await pool.request()
    .input('storeId', storeId)
    .query('SELECT id, name FROM Categories WHERE store_id = @storeId');
  
  console.log(`   Tìm thấy ${oldCategories.recordset.length} danh mục cũ`);
  
  for (const cat of oldCategories.recordset) {
    await pool.request()
      .input('id', cat.id)
      .input('storeId', storeId)
      .execute('sp_Categories_Delete');
    console.log(`   ✅ Đã xóa: ${cat.name}`);
  }
  
  // ============================================
  // BƯỚC 2: TẠO DANH MỤC MỚI
  // ============================================
  console.log('\n📦 BƯỚC 2: Tạo danh mục mới...');
  
  const categories = [
    { name: 'Sữa tươi', description: 'Sữa tươi các loại (nguyên kem, ít béo, không đường)' },
    { name: 'Sữa chua', description: 'Sữa chua uống, sữa chua ăn' },
    { name: 'Sữa đặc', description: 'Sữa đặc có đường, không đường' },
    { name: 'Sữa bột', description: 'Sữa bột cho trẻ em và người lớn' },
    { name: 'Sữa hạt', description: 'Sữa đậu nành, sữa hạnh nhân, sữa yến mạch' },
    { name: 'Phô mai', description: 'Phô mai lát, phô mai que, phô mai hộp' },
    { name: 'Bơ sữa', description: 'Bơ động vật, bơ thực vật' },
    { name: 'Kem', description: 'Kem tươi, kem đánh, kem ăn' },
  ];
  
  const createdCategories: any[] = [];
  
  for (const category of categories) {
    const newId = crypto.randomUUID().toUpperCase();
    
    const result = await pool.request()
      .input('id', newId)
      .input('storeId', storeId)
      .input('name', category.name)
      .input('description', category.description)
      .execute('sp_Categories_Create');
    
    createdCategories.push({ id: newId, ...category });
    console.log(`   ✅ Đã tạo: ${category.name}`);
  }
  
  // ============================================
  // BƯỚC 3: XÓA ĐƠN VỊ TÍNH CŨ
  // ============================================
  console.log('\n🗑️  BƯỚC 3: Xóa đơn vị tính cũ...');
  
  const oldUnits = await pool.request()
    .input('storeId', storeId)
    .query('SELECT id, name FROM Units WHERE store_id = @storeId');
  
  console.log(`   Tìm thấy ${oldUnits.recordset.length} đơn vị tính cũ`);
  
  for (const unit of oldUnits.recordset) {
    await pool.request()
      .input('id', unit.id)
      .input('storeId', storeId)
      .execute('sp_Units_Delete');
    console.log(`   ✅ Đã xóa: ${unit.name}`);
  }
  
  // ============================================
  // BƯỚC 4: TẠO ĐƠN VỊ TÍNH MỚI
  // ============================================
  console.log('\n⚖️  BƯỚC 4: Tạo đơn vị tính mới...');
  
  // Đơn vị cơ bản
  const baseUnits = [
    { name: 'Hộp', description: 'Hộp đơn (180ml, 200ml, 250ml...)' },
    { name: 'Chai', description: 'Chai đơn (500ml, 1L...)' },
    { name: 'Gói', description: 'Gói đơn (sữa chua, sữa bột...)' },
    { name: 'Hũ', description: 'Hũ đơn (sữa chua, phô mai...)' },
    { name: 'Lát', description: 'Lát phô mai' },
    { name: 'Que', description: 'Que phô mai' },
    { name: 'Kg', description: 'Kilogram (bơ, kem...)' },
  ];
  
  const createdBaseUnits: any[] = [];
  
  for (const unit of baseUnits) {
    const newId = crypto.randomUUID().toUpperCase();
    
    await pool.request()
      .input('id', newId)
      .input('storeId', storeId)
      .input('name', unit.name)
      .input('description', unit.description)
      .execute('sp_Units_Create');
    
    createdBaseUnits.push({ id: newId, ...unit });
    console.log(`   ✅ Đã tạo đơn vị cơ bản: ${unit.name}`);
  }
  
  // Đơn vị quy đổi
  const conversionUnits = [
    { 
      name: 'Lốc 4 hộp', 
      description: 'Lốc 4 hộp sữa',
      baseUnitName: 'Hộp',
      conversionFactor: 4
    },
    { 
      name: 'Lốc 6 hộp', 
      description: 'Lốc 6 hộp sữa',
      baseUnitName: 'Hộp',
      conversionFactor: 6
    },
    { 
      name: 'Thùng 48 hộp', 
      description: 'Thùng 48 hộp sữa',
      baseUnitName: 'Hộp',
      conversionFactor: 48
    },
    { 
      name: 'Lốc 4 chai', 
      description: 'Lốc 4 chai sữa',
      baseUnitName: 'Chai',
      conversionFactor: 4
    },
    { 
      name: 'Thùng 12 chai', 
      description: 'Thùng 12 chai sữa',
      baseUnitName: 'Chai',
      conversionFactor: 12
    },
    { 
      name: 'Lốc 4 gói', 
      description: 'Lốc 4 gói sữa chua',
      baseUnitName: 'Gói',
      conversionFactor: 4
    },
    { 
      name: 'Thùng 48 gói', 
      description: 'Thùng 48 gói sữa chua',
      baseUnitName: 'Gói',
      conversionFactor: 48
    },
  ];
  
  for (const unit of conversionUnits) {
    const newId = crypto.randomUUID().toUpperCase();
    const baseUnit = createdBaseUnits.find(u => u.name === unit.baseUnitName);
    
    if (!baseUnit) {
      console.log(`   ⚠️  Không tìm thấy đơn vị cơ bản: ${unit.baseUnitName}`);
      continue;
    }
    
    await pool.request()
      .input('id', newId)
      .input('storeId', storeId)
      .input('name', unit.name)
      .input('description', unit.description)
      .input('baseUnitId', baseUnit.id)
      .input('conversionFactor', unit.conversionFactor)
      .execute('sp_Units_Create');
    
    console.log(`   ✅ Đã tạo đơn vị quy đổi: ${unit.name} = ${unit.conversionFactor} ${unit.baseUnitName}`);
  }
  
  // ============================================
  // TỔNG KẾT
  // ============================================
  console.log('\n\n✅ HOÀN TẤT!\n');
  
  console.log('📋 DANH MỤC MỚI:');
  const finalCategories = await pool.request()
    .input('storeId', storeId)
    .execute('sp_Categories_GetByStore');
  
  finalCategories.recordset.forEach((cat, index) => {
    console.log(`   ${index + 1}. ${cat.name} - ${cat.description}`);
  });
  
  console.log('\n⚖️  ĐƠN VỊ TÍNH MỚI:');
  const finalUnits = await pool.request()
    .input('storeId', storeId)
    .execute('sp_Units_GetByStore');
  
  // Group by base unit
  const baseUnitsList = finalUnits.recordset.filter(u => !u.baseUnitId);
  const conversionUnitsList = finalUnits.recordset.filter(u => u.baseUnitId);
  
  console.log('\n   Đơn vị cơ bản:');
  baseUnitsList.forEach((unit, index) => {
    console.log(`   ${index + 1}. ${unit.name} - ${unit.description || ''}`);
  });
  
  console.log('\n   Đơn vị quy đổi:');
  conversionUnitsList.forEach((unit, index) => {
    const baseUnit = baseUnitsList.find(u => u.id === unit.baseUnitId);
    console.log(`   ${index + 1}. ${unit.name} = ${unit.conversionFactor} ${baseUnit?.name || ''}`);
  });
  
  await pool.close();
}

resetMilkStoreData().catch(console.error);
