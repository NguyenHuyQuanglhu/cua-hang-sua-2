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

async function checkProductsWithoutUnit() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('Connected successfully!\n');

    // Find products without unit_id
    const result = await pool.request().query(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.store_id,
        s.name as store_name,
        p.category_id,
        c.name as category_name,
        p.unit_id,
        p.status,
        p.stock_quantity
      FROM Products p
      LEFT JOIN Stores s ON p.store_id = s.id
      LEFT JOIN Categories c ON p.category_id = c.id
      WHERE p.unit_id IS NULL 
        AND p.status != 'deleted'
      ORDER BY s.name, p.name
    `);

    if (result.recordset.length === 0) {
      console.log('✓ Tất cả sản phẩm đều đã có đơn vị tính!');
      return;
    }

    console.log(`⚠ Tìm thấy ${result.recordset.length} sản phẩm chưa có đơn vị tính:\n`);
    
    // Group by store
    const byStore = result.recordset.reduce((acc: any, product: any) => {
      const storeName = product.store_name || 'Unknown Store';
      if (!acc[storeName]) {
        acc[storeName] = [];
      }
      acc[storeName].push(product);
      return acc;
    }, {});

    for (const [storeName, products] of Object.entries(byStore)) {
      console.log(`\n📍 ${storeName}:`);
      (products as any[]).forEach((p, index) => {
        console.log(`  ${index + 1}. ${p.name}`);
        console.log(`     - SKU: ${p.sku || 'N/A'}`);
        console.log(`     - Danh mục: ${p.category_name || 'N/A'}`);
        console.log(`     - Trạng thái: ${p.status}`);
        console.log(`     - Tồn kho: ${p.stock_quantity || 0}`);
        console.log(`     - ID: ${p.id}`);
      });
    }

    console.log('\n\n💡 Để cập nhật đơn vị cho các sản phẩm này:');
    console.log('   1. Vào trang Sản phẩm');
    console.log('   2. Chỉnh sửa từng sản phẩm');
    console.log('   3. Chọn đơn vị tính phù hợp (Hộp, Thùng, Cái, v.v.)');
    console.log('   4. Lưu lại\n');

    // Get available units
    const unitsResult = await pool.request().query(`
      SELECT id, name, base_unit_id, conversion_factor
      FROM Units
      WHERE status = 'active'
      ORDER BY name
    `);

    console.log('📋 Các đơn vị tính có sẵn:');
    unitsResult.recordset.forEach((unit: any, index: number) => {
      const conversionInfo = unit.base_unit_id 
        ? ` (quy đổi: ${unit.conversion_factor} đơn vị cơ bản)`
        : ' (đơn vị cơ bản)';
      console.log(`   ${index + 1}. ${unit.name}${conversionInfo}`);
      console.log(`      ID: ${unit.id}`);
    });

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

checkProductsWithoutUnit();
