import sql from 'mssql';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const config: sql.config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'MilkStoreDB',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

const targetProducts = [
  'TH True Milk Nguyên chất 180ml',
  'TH True Milk Nguyên chất 1L',
  'TH True Yogurt Dâu 100g',
  'Vinamilk Ít đường 1L',
  'Vinamilk Optimum Gold 900g',
  'Vinamilk Probi Dâu 100ml'
];

async function checkProductSuppliers() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('Connected successfully!\n');

    // Get store ID
    const storeResult = await pool.request().query(`
      SELECT TOP 1 id, name FROM Stores WHERE name LIKE N'%cửa hàng sữa%'
    `);

    if (storeResult.recordset.length === 0) {
      console.log('❌ Không tìm thấy cửa hàng');
      return;
    }

    const storeId = storeResult.recordset[0].id;
    console.log(`✓ Cửa hàng: ${storeResult.recordset[0].name}\n`);

    // Check if there's a ProductSuppliers table
    const tableCheck = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'ProductSuppliers'
    `);

    const hasProductSuppliersTable = tableCheck.recordset.length > 0;
    console.log(`ProductSuppliers table exists: ${hasProductSuppliersTable ? 'YES' : 'NO'}\n`);

    // Get all suppliers
    console.log('📋 Danh sách nhà cung cấp:\n');
    const suppliersResult = await pool.request()
      .input('storeId', sql.NVarChar, storeId)
      .query(`
        SELECT id, name, contact_person, phone, email
        FROM Suppliers
        WHERE store_id = @storeId
        ORDER BY name
      `);

    if (suppliersResult.recordset.length === 0) {
      console.log('❌ Không có nhà cung cấp nào!\n');
    } else {
      suppliersResult.recordset.forEach((s: any, i: number) => {
        console.log(`${i + 1}. ${s.name}`);
        console.log(`   ID: ${s.id}`);
        if (s.contact_person) console.log(`   Người liên hệ: ${s.contact_person}`);
        if (s.phone) console.log(`   SĐT: ${s.phone}`);
      });
      console.log();
    }

    // Check target products
    console.log('🔍 Kiểm tra các sản phẩm:\n');
    
    for (const productName of targetProducts) {
      const productResult = await pool.request()
        .input('storeId', sql.NVarChar, storeId)
        .input('productName', sql.NVarChar, productName)
        .query(`
          SELECT id, name, unit_id, status
          FROM Products
          WHERE store_id = @storeId AND name = @productName
        `);

      if (productResult.recordset.length === 0) {
        console.log(`❌ ${productName} - KHÔNG TÌM THẤY`);
        continue;
      }

      const product = productResult.recordset[0];
      console.log(`📦 ${productName}`);
      console.log(`   ID: ${product.id}`);
      console.log(`   Unit ID: ${product.unit_id || 'NULL'}`);
      console.log(`   Status: ${product.status}`);

      if (hasProductSuppliersTable) {
        // Check if product has suppliers
        const psResult = await pool.request()
          .input('productId', sql.NVarChar, product.id)
          .query(`
            SELECT ps.supplier_id, s.name as supplier_name
            FROM ProductSuppliers ps
            LEFT JOIN Suppliers s ON ps.supplier_id = s.id
            WHERE ps.product_id = @productId
          `);

        if (psResult.recordset.length === 0) {
          console.log(`   ⚠ Chưa có nhà cung cấp`);
        } else {
          console.log(`   ✓ Nhà cung cấp:`);
          psResult.recordset.forEach((ps: any) => {
            console.log(`     - ${ps.supplier_name || 'Unknown'} (${ps.supplier_id})`);
          });
        }
      }

      // Check purchase history
      const purchaseResult = await pool.request()
        .input('productId', sql.NVarChar, product.id)
        .input('storeId', sql.NVarChar, storeId)
        .query(`
          SELECT TOP 1 po.supplier_id, s.name as supplier_name, po.import_date
          FROM PurchaseOrderItems poi
          JOIN PurchaseOrders po ON poi.purchase_order_id = po.id
          LEFT JOIN Suppliers s ON po.supplier_id = s.id
          WHERE poi.product_id = @productId AND po.store_id = @storeId
          ORDER BY po.import_date DESC
        `);

      if (purchaseResult.recordset.length > 0) {
        const lastPurchase = purchaseResult.recordset[0];
        console.log(`   📅 Lần nhập gần nhất: ${new Date(lastPurchase.import_date).toLocaleDateString('vi-VN')}`);
        console.log(`      Từ: ${lastPurchase.supplier_name || 'Unknown'}`);
      } else {
        console.log(`   ⚠ Chưa từng nhập hàng`);
      }

      console.log();
    }

    // Summary
    console.log('═'.repeat(80));
    console.log('💡 GIẢI PHÁP:\n');
    
    if (suppliersResult.recordset.length === 0) {
      console.log('1. Tạo nhà cung cấp mới:');
      console.log('   - Vào trang Nhà cung cấp');
      console.log('   - Thêm nhà cung cấp (ví dụ: TH True Milk, Vinamilk)');
      console.log();
    }

    if (hasProductSuppliersTable) {
      console.log('2. Liên kết sản phẩm với nhà cung cấp:');
      console.log('   - Vào trang Sản phẩm');
      console.log('   - Chỉnh sửa từng sản phẩm');
      console.log('   - Chọn nhà cung cấp');
      console.log();
    }

    console.log('3. Hoặc nhập hàng trực tiếp:');
    console.log('   - Vào Nhập hàng → Tạo đơn nhập mới');
    console.log('   - Chọn nhà cung cấp');
    console.log('   - Chọn sản phẩm và nhập');
    console.log('   - Hệ thống sẽ tự động liên kết');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\nDatabase connection closed.');
    }
  }
}

checkProductSuppliers();
