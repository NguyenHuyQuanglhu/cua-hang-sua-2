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

const missingProducts = [
  'TH True Milk Nguyên chất 180ml',
  'TH True Milk Nguyên chất 1L',
  'TH True Yogurt Dâu 100g',
  'Vinamilk Ít đường 1L',
  'Vinamilk Optimum Gold 900g',
  'Vinamilk Probi Dâu 100ml'
];

async function checkMissingProducts() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('Connected successfully!\n');

    console.log('🔍 Kiểm tra các sản phẩm bị thiếu:\n');

    for (const productName of missingProducts) {
      console.log(`\n📦 ${productName}`);
      console.log('─'.repeat(60));

      // Search for product
      const result = await pool.request()
        .input('productName', sql.NVarChar, `%${productName}%`)
        .query(`
          SELECT 
            p.id,
            p.name,
            p.sku,
            p.store_id,
            s.name as store_name,
            p.category_id,
            c.name as category_name,
            p.unit_id,
            u.name as unit_name,
            p.status,
            p.stock_quantity,
            p.price,
            p.cost_price
          FROM Products p
          LEFT JOIN Stores s ON p.store_id = s.id
          LEFT JOIN Categories c ON p.category_id = c.id
          LEFT JOIN Units u ON p.unit_id = u.id
          WHERE p.name LIKE @productName
          ORDER BY p.name
        `);

      if (result.recordset.length === 0) {
        console.log('❌ KHÔNG TÌM THẤY trong database');
        console.log('   → Sản phẩm này chưa được tạo');
      } else {
        result.recordset.forEach((product: any) => {
          console.log(`✓ Tìm thấy: ${product.name}`);
          console.log(`   - ID: ${product.id}`);
          console.log(`   - Cửa hàng: ${product.store_name || 'N/A'}`);
          console.log(`   - Danh mục: ${product.category_name || 'N/A'}`);
          console.log(`   - Đơn vị: ${product.unit_name || '❌ CHƯA CÓ'}`);
          console.log(`   - Trạng thái: ${product.status}`);
          console.log(`   - Tồn kho: ${product.stock_quantity || 0}`);
          console.log(`   - Giá bán: ${product.price || 0}`);
          console.log(`   - Giá nhập: ${product.cost_price || 0}`);
          
          // Check why it might not appear
          const issues = [];
          if (!product.unit_id) issues.push('Chưa có đơn vị tính');
          if (product.status !== 'active') issues.push(`Trạng thái: ${product.status}`);
          if (!product.store_id) issues.push('Chưa có cửa hàng');
          
          if (issues.length > 0) {
            console.log(`   ⚠ Vấn đề: ${issues.join(', ')}`);
          }
        });
      }
    }

    // Check all products without unit_id
    console.log('\n\n📊 Tổng quan các sản phẩm chưa có đơn vị:');
    console.log('═'.repeat(60));
    
    const noUnitResult = await pool.request().query(`
      SELECT 
        p.id,
        p.name,
        p.store_id,
        s.name as store_name,
        p.status
      FROM Products p
      LEFT JOIN Stores s ON p.store_id = s.id
      WHERE p.unit_id IS NULL AND p.status != 'deleted'
      ORDER BY s.name, p.name
    `);

    if (noUnitResult.recordset.length === 0) {
      console.log('✓ Tất cả sản phẩm đều có đơn vị tính');
    } else {
      console.log(`⚠ Có ${noUnitResult.recordset.length} sản phẩm chưa có đơn vị:\n`);
      noUnitResult.recordset.forEach((p: any, index: number) => {
        console.log(`${index + 1}. ${p.name} (${p.store_name || 'N/A'}) - ${p.status}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n\nDatabase connection closed.');
    }
  }
}

checkMissingProducts();
