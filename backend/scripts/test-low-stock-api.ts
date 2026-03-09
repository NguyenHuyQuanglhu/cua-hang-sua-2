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

async function testLowStockAPI() {
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
    const storeName = storeResult.recordset[0].name;
    console.log(`✓ Cửa hàng: ${storeName} (${storeId})\n`);

    // Test the low-stock query (same as API)
    const threshold = 10;
    console.log(`📡 Testing low-stock query with threshold=${threshold}...\n`);
    
    const lowStockQuery = `
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.price,
        p.cost_price as costPrice,
        p.stock_quantity as stockQuantity,
        p.unit_id as unitId,
        u.name as unitName,
        c.name as categoryName,
        p.category_id as categoryId,
        ISNULL((SELECT SUM(Quantity) FROM ProductInventory WHERE ProductId = p.id AND StoreId = @storeId), p.stock_quantity) AS currentStock
      FROM Products p
      LEFT JOIN Units u ON p.unit_id = u.id
      LEFT JOIN Categories c ON p.category_id = c.id
      WHERE p.store_id = @storeId 
        AND p.status = 'active'
        AND ISNULL((SELECT SUM(Quantity) FROM ProductInventory WHERE ProductId = p.id AND StoreId = @storeId), p.stock_quantity) <= @threshold
      ORDER BY ISNULL((SELECT SUM(Quantity) FROM ProductInventory WHERE ProductId = p.id AND StoreId = @storeId), p.stock_quantity) ASC, p.name ASC
    `;

    const result = await pool.request()
      .input('storeId', sql.NVarChar, storeId)
      .input('threshold', sql.Int, threshold)
      .query(lowStockQuery);

    console.log(`✓ Tìm thấy ${result.recordset.length} sản phẩm tồn kho thấp\n`);

    // Check the missing products
    const missingProducts = [
      'TH True Milk Nguyên chất 180ml',
      'TH True Milk Nguyên chất 1L',
      'TH True Yogurt Dâu 100g',
      'Vinamilk Ít đường 1L',
      'Vinamilk Optimum Gold 900g',
      'Vinamilk Probi Dâu 100ml'
    ];

    console.log('🔍 Kiểm tra các sản phẩm trong kết quả:\n');
    
    missingProducts.forEach(productName => {
      const found = result.recordset.find((p: any) => p.name === productName);
      if (found) {
        console.log(`✓ ${productName}`);
        console.log(`   - unitId: ${found.unitId || '❌ NULL'}`);
        console.log(`   - unitName: ${found.unitName || '❌ NULL'}`);
        console.log(`   - currentStock: ${found.currentStock}`);
        console.log(`   - Can import? ${found.unitId ? '✓ YES' : '❌ NO (missing unitId)'}`);
      } else {
        console.log(`❌ ${productName} - NOT IN RESULTS`);
      }
    });

    // Show all products with their unitId status
    console.log('\n\n📋 Tất cả sản phẩm tồn kho thấp:');
    console.log('═'.repeat(80));
    result.recordset.forEach((p: any, index: number) => {
      const hasUnit = !!p.unitId;
      const icon = hasUnit ? '✓' : '❌';
      console.log(`${icon} ${index + 1}. ${p.name}`);
      console.log(`   - unitId: ${p.unitId || 'NULL'}`);
      console.log(`   - unitName: ${p.unitName || 'NULL'}`);
      console.log(`   - currentStock: ${p.currentStock}`);
      console.log(`   - categoryName: ${p.categoryName || 'N/A'}`);
    });

    // Count products without unitId
    const withoutUnit = result.recordset.filter((p: any) => !p.unitId);
    if (withoutUnit.length > 0) {
      console.log(`\n\n⚠ CÓ ${withoutUnit.length} SẢN PHẨM KHÔNG THỂ NHẬP HÀNG (thiếu unitId):`);
      withoutUnit.forEach((p: any) => {
        console.log(`   - ${p.name}`);
      });
    } else {
      console.log('\n\n✓ TẤT CẢ SẢN PHẨM ĐỀU CÓ ĐƠN VỊ TÍNH!');
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

testLowStockAPI();
