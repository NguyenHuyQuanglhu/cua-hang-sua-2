import sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';

const config: sql.config = {
  server: '118.69.126.49',
  database: 'Data_QuanLyBanHang_Online',
  user: 'userquanlybanhangonline',
  password: '123456789',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

interface Supplier {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

const suppliers: Supplier[] = [
  {
    name: 'Công ty TNHH Sữa Việt Nam (Vinamilk)',
    contactPerson: 'Phòng Kinh Doanh',
    phone: '1900 100 180',
    email: 'cskh@vinamilk.com.vn',
    address: '10 Tân Trào, P. Tân Phú, Q.7, TP. Hồ Chí Minh',
    notes: 'Nhà cung cấp sữa hàng đầu Việt Nam - Vinamilk, TH True Milk, Dalat Milk'
  },
  {
    name: 'Công ty Cổ phần Sữa TH (TH True Milk)',
    contactPerson: 'Bộ phận Phân phối',
    phone: '1900 6936',
    email: 'info@thmilk.vn',
    address: 'Tòa nhà TH, 15 Đặng Văn Ngữ, Đống Đa, Hà Nội',
    notes: 'Sữa tươi sạch 100% organic - TH True Milk, TH True Yogurt'
  },
  {
    name: 'Công ty TNHH Nutifood',
    contactPerson: 'Phòng Bán hàng',
    phone: '1800 6011',
    email: 'cskh@nutifood.com.vn',
    address: '281 Nguyễn Văn Trỗi, P.10, Q. Phú Nhuận, TP. HCM',
    notes: 'Sữa dinh dưỡng - Nuti, Grow Plus, Pedia Plus'
  },
  {
    name: 'Công ty TNHH Friesland Campina Việt Nam',
    contactPerson: 'Bộ phận Kinh doanh',
    phone: '028 3948 8888',
    email: 'consumer.vn@frieslandcampina.com',
    address: '6 Phạm Văn Bạch, P.15, Q. Tân Bình, TP. HCM',
    notes: 'Sữa Dutch Lady, Friso, Frisolac'
  },
  {
    name: 'Công ty TNHH Nestlé Việt Nam',
    contactPerson: 'Phòng Chăm sóc khách hàng',
    phone: '1800 6011',
    email: 'consumer.services@vn.nestle.com',
    address: '364 Cộng Hòa, P.13, Q. Tân Bình, TP. HCM',
    notes: 'Sữa Nestlé, Milo, Bear Brand, NAN'
  },
  {
    name: 'Công ty TNHH Abbott Việt Nam',
    contactPerson: 'Bộ phận Phân phối',
    phone: '1800 6011',
    email: 'abbott.vietnam@abbott.com',
    address: 'Tầng 10, Tòa nhà Vincom Center, 72 Lê Thánh Tôn, Q.1, TP. HCM',
    notes: 'Sữa Abbott - Ensure, Similac, Glucerna, PediaSure'
  },
  {
    name: 'Công ty TNHH Lactalis Việt Nam',
    contactPerson: 'Phòng Kinh doanh',
    phone: '028 3910 0888',
    email: 'contact@lactalis.vn',
    address: 'Lầu 5, Tòa nhà Saigon Trade Center, 37 Tôn Đức Thắng, Q.1, TP. HCM',
    notes: 'Phô mai Président, Galbani, Sữa chua Lactel'
  },
  {
    name: 'Công ty TNHH Bel Việt Nam',
    contactPerson: 'Bộ phận Bán hàng',
    phone: '028 3827 9999',
    email: 'info@belvietnam.com',
    address: 'Lầu 8, Tòa nhà Vincom Center, 72 Lê Thánh Tôn, Q.1, TP. HCM',
    notes: 'Phô mai Con Bò Cười (La Vache Qui Rit), Kiri'
  },
  {
    name: 'Công ty TNHH Mead Johnson Nutrition Việt Nam',
    contactPerson: 'Phòng Chăm sóc khách hàng',
    phone: '1800 6011',
    email: 'vietnam@mjn.com',
    address: 'Lầu 15, Tòa nhà Vincom Center, 72 Lê Thánh Tôn, Q.1, TP. HCM',
    notes: 'Sữa Enfamil, Enfa, Enfagrow'
  },
  {
    name: 'Công ty TNHH Fonterra Việt Nam',
    contactPerson: 'Bộ phận Kinh doanh',
    phone: '028 3910 5555',
    email: 'vietnam@fonterra.com',
    address: 'Lầu 12, Tòa nhà Vincom Center, 72 Lê Thánh Tôn, Q.1, TP. HCM',
    notes: 'Sữa Anchor, Anlene, Anmum'
  }
];

async function createSuppliers() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('Connected successfully!');

    // Get store ID
    const storeResult = await pool.request()
      .query(`SELECT TOP 1 id, name FROM Stores ORDER BY created_at DESC`);
    
    if (storeResult.recordset.length === 0) {
      console.error('No store found! Please create a store first.');
      return;
    }

    const storeId = storeResult.recordset[0].id;
    const storeName = storeResult.recordset[0].name;
    console.log(`\nFound store: ${storeName} (${storeId})`);

    // Check existing suppliers
    const existingResult = await pool.request()
      .input('storeId', sql.NVarChar, storeId)
      .query(`SELECT name FROM Suppliers WHERE store_id = @storeId`);
    
    console.log(`\nExisting suppliers: ${existingResult.recordset.length}`);
    if (existingResult.recordset.length > 0) {
      console.log('Existing suppliers:', existingResult.recordset.map(s => s.name).join(', '));
    }

    // Insert suppliers
    console.log(`\nInserting ${suppliers.length} suppliers...`);
    let insertedCount = 0;

    for (const supplier of suppliers) {
      // Check if supplier already exists
      const checkResult = await pool.request()
        .input('storeId', sql.NVarChar, storeId)
        .input('name', sql.NVarChar, supplier.name)
        .query(`SELECT id FROM Suppliers WHERE store_id = @storeId AND name = @name`);

      if (checkResult.recordset.length > 0) {
        console.log(`  ⏭️  Skipped: ${supplier.name} (already exists)`);
        continue;
      }

      const supplierId = uuidv4();
      await pool.request()
        .input('id', sql.NVarChar, supplierId)
        .input('storeId', sql.NVarChar, storeId)
        .input('name', sql.NVarChar, supplier.name)
        .input('contactPerson', sql.NVarChar, supplier.contactPerson)
        .input('phone', sql.NVarChar, supplier.phone)
        .input('email', sql.NVarChar, supplier.email)
        .input('address', sql.NVarChar, supplier.address)
        .input('notes', sql.NVarChar, supplier.notes)
        .query(`
          INSERT INTO Suppliers (id, store_id, name, contact_person, phone, email, address, notes, created_at)
          VALUES (@id, @storeId, @name, @contactPerson, @phone, @email, @address, @notes, GETDATE())
        `);

      insertedCount++;
      console.log(`  ✅ Created: ${supplier.name}`);
    }

    console.log(`\n✅ Successfully created ${insertedCount} suppliers!`);
    console.log(`📊 Total suppliers in store: ${existingResult.recordset.length + insertedCount}`);

    // Show all suppliers
    const allSuppliersResult = await pool.request()
      .input('storeId', sql.NVarChar, storeId)
      .query(`SELECT name, phone, email FROM Suppliers WHERE store_id = @storeId ORDER BY name`);

    console.log('\n📋 All suppliers in your store:');
    allSuppliersResult.recordset.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.name}`);
      console.log(`     📞 ${s.phone} | 📧 ${s.email}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\nDatabase connection closed.');
    }
  }
}

createSuppliers();
