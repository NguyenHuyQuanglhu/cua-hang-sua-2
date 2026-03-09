import sql from 'mssql';
import * as fs from 'fs';
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
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

async function resetAndVerify() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('═'.repeat(80));
    console.log('🔄 RESET VÀ KIỂM TRA HỆ THỐNG');
    console.log('═'.repeat(80));
    console.log();

    console.log('📡 Đang kết nối database...');
    pool = await sql.connect(config);
    console.log('✓ Kết nối thành công!\n');

    // Step 1: Deploy stored procedures
    console.log('━'.repeat(80));
    console.log('BƯỚC 1: CẬP NHẬT STORED PROCEDURES');
    console.log('━'.repeat(80));
    
    const sqlFilePath = path.join(__dirname, 'stored-procedures', 'products-module.sql');
    console.log(`Đọc file: ${sqlFilePath}`);
    
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    const batches = sqlContent
      .split(/^\s*GO\s*$/gim)
      .map(batch => batch.trim())
      .filter(batch => batch.length > 0);

    console.log(`Tìm thấy ${batches.length} SQL batches\n`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      if (batch.length > 0) {
        try {
          await pool.request().query(batch);
          console.log(`✓ Batch ${i + 1}/${batches.length}`);
        } catch (error: any) {
          console.error(`✗ Lỗi batch ${i + 1}:`, error.message);
        }
      }
    }

    console.log('\n✓ Đã cập nhật stored procedures!\n');

    // Step 2: Get store info
    console.log('━'.repeat(80));
    console.log('BƯỚC 2: KIỂM TRA CỬA HÀNG');
    console.log('━'.repeat(80));
    
    const storeResult = await pool.request().query(`
      SELECT TOP 1 id, name FROM Stores WHERE name LIKE N'%cửa hàng sữa%'
    `);

    if (storeResult.recordset.length === 0) {
      console.log('❌ Không tìm thấy cửa hàng');
      return;
    }

    const storeId = storeResult.recordset[0].id;
    const storeName = storeResult.recordset[0].name;
    console.log(`✓ Cửa hàng: ${storeName}`);
    console.log(`  ID: ${storeId}\n`);

    // Step 3: Check products without unit
    console.log('━'.repeat(80));
    console.log('BƯỚC 3: KIỂM TRA SẢN PHẨM THIẾU ĐƠN VỊ');
    console.log('━'.repeat(80));
    
    const noUnitResult = await pool.request().query(`
      SELECT id, name, unit_id
      FROM Products
      WHERE unit_id IS NULL AND status != 'deleted'
    `);

    if (noUnitResult.recordset.length === 0) {
      console.log('✓ Tất cả sản phẩm đều có đơn vị tính!\n');
    } else {
      console.log(`⚠ Có ${noUnitResult.recordset.length} sản phẩm chưa có đơn vị:\n`);
      noUnitResult.recordset.forEach((p: any, i: number) => {
        console.log(`  ${i + 1}. ${p.name}`);
      });
      console.log();
    }

    // Step 4: Test sp_Products_GetByStore
    console.log('━'.repeat(80));
    console.log('BƯỚC 4: TEST sp_Products_GetByStore');
    console.log('━'.repeat(80));
    
    const spResult = await pool.request()
      .input('storeId', sql.NVarChar, storeId)
      .input('status', sql.NVarChar, null)
      .input('categoryId', sql.NVarChar, null)
      .input('searchTerm', sql.NVarChar, null)
      .execute('sp_Products_GetByStore');

    console.log(`✓ Stored procedure trả về ${spResult.recordset.length} sản phẩm`);
    
    // Check if unitId is returned
    const withUnit = spResult.recordset.filter((p: any) => p.unitId);
    const withoutUnit = spResult.recordset.filter((p: any) => !p.unitId);
    
    console.log(`  - Có unitId: ${withUnit.length}`);
    console.log(`  - Không có unitId: ${withoutUnit.length}\n`);

    if (withoutUnit.length > 0) {
      console.log('⚠ Các sản phẩm không có unitId trong kết quả SP:');
      withoutUnit.forEach((p: any) => {
        console.log(`  - ${p.name}`);
      });
      console.log();
    }

    // Step 5: Test low-stock query
    console.log('━'.repeat(80));
    console.log('BƯỚC 5: TEST LOW-STOCK QUERY');
    console.log('━'.repeat(80));
    
    const threshold = 10;
    const lowStockQuery = `
      SELECT 
        p.id,
        p.name,
        p.unit_id as unitId,
        u.name as unitName,
        ISNULL((SELECT SUM(Quantity) FROM ProductInventory WHERE ProductId = p.id AND StoreId = @storeId), p.stock_quantity) AS currentStock
      FROM Products p
      LEFT JOIN Units u ON p.unit_id = u.id
      WHERE p.store_id = @storeId 
        AND p.status = 'active'
        AND ISNULL((SELECT SUM(Quantity) FROM ProductInventory WHERE ProductId = p.id AND StoreId = @storeId), p.stock_quantity) <= @threshold
      ORDER BY ISNULL((SELECT SUM(Quantity) FROM ProductInventory WHERE ProductId = p.id AND StoreId = @storeId), p.stock_quantity) ASC
    `;

    const lowStockResult = await pool.request()
      .input('storeId', sql.NVarChar, storeId)
      .input('threshold', sql.Int, threshold)
      .query(lowStockQuery);

    console.log(`✓ Tìm thấy ${lowStockResult.recordset.length} sản phẩm tồn kho thấp (≤${threshold})\n`);

    // Check specific products
    const targetProducts = [
      'TH True Milk Nguyên chất 180ml',
      'TH True Milk Nguyên chất 1L',
      'TH True Yogurt Dâu 100g',
      'Vinamilk Ít đường 1L',
      'Vinamilk Optimum Gold 900g',
      'Vinamilk Probi Dâu 100ml'
    ];

    console.log('🔍 Kiểm tra các sản phẩm cụ thể:\n');
    targetProducts.forEach(productName => {
      const found = lowStockResult.recordset.find((p: any) => p.name === productName);
      if (found) {
        const canImport = !!found.unitId;
        const icon = canImport ? '✓' : '❌';
        console.log(`${icon} ${productName}`);
        console.log(`   - unitId: ${found.unitId || 'NULL'}`);
        console.log(`   - unitName: ${found.unitName || 'NULL'}`);
        console.log(`   - currentStock: ${found.currentStock}`);
        console.log(`   - Có thể nhập hàng: ${canImport ? 'CÓ' : 'KHÔNG'}`);
      } else {
        console.log(`❌ ${productName} - KHÔNG TÌM THẤY`);
      }
    });

    // Summary
    console.log('\n');
    console.log('═'.repeat(80));
    console.log('📊 TÓM TẮT');
    console.log('═'.repeat(80));
    
    const allProductsHaveUnit = withoutUnit.length === 0 && noUnitResult.recordset.length === 0;
    const lowStockProductsCanImport = lowStockResult.recordset.every((p: any) => p.unitId);
    
    if (allProductsHaveUnit && lowStockProductsCanImport) {
      console.log('✓ HỆ THỐNG HOẠT ĐỘNG BÌNH THƯỜNG!');
      console.log('  - Tất cả sản phẩm đều có đơn vị tính');
      console.log('  - Stored procedures đã được cập nhật');
      console.log('  - Sản phẩm tồn kho thấp có thể nhập hàng');
      console.log('\n🎯 HÀNH ĐỘNG TIẾP THEO:');
      console.log('  1. Restart backend server: Ctrl+C rồi npm run dev');
      console.log('  2. Hard refresh trình duyệt: Ctrl+Shift+R');
      console.log('  3. Vào trang Nhập hàng nhanh để kiểm tra');
    } else {
      console.log('⚠ CÒN VẤN ĐỀ CẦN KHẮC PHỤC:');
      if (!allProductsHaveUnit) {
        console.log(`  - Có ${noUnitResult.recordset.length + withoutUnit.length} sản phẩm chưa có đơn vị`);
      }
      if (!lowStockProductsCanImport) {
        const cannotImport = lowStockResult.recordset.filter((p: any) => !p.unitId);
        console.log(`  - Có ${cannotImport.length} sản phẩm tồn kho thấp không thể nhập hàng`);
      }
    }

    console.log('═'.repeat(80));

  } catch (error) {
    console.error('\n❌ LỖI:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n✓ Đã đóng kết nối database.');
    }
  }
}

resetAndVerify();
