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

async function testProductsAPI() {
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

    // Call stored procedure like the API does
    console.log('📡 Gọi sp_Products_GetByStore...\n');
    
    const result = await pool.request()
      .input('storeId', sql.NVarChar, storeId)
      .input('status', sql.NVarChar, null)
      .input('categoryId', sql.NVarChar, null)
      .input('searchTerm', sql.NVarChar, null)
      .execute('sp_Products_GetByStore');

    console.log(`✓ Tìm thấy ${result.recordset.length} sản phẩm\n`);

    // Check for the missing products
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
        console.log(`   - status: ${found.status}`);
        console.log(`   - currentStock: ${found.currentStock}`);
      } else {
        console.log(`❌ ${productName} - KHÔNG CÓ TRONG KẾT QUẢ`);
      }
    });

    // Show sample of what's returned
    console.log('\n\n📋 Mẫu 5 sản phẩm đầu tiên:');
    console.log('═'.repeat(80));
    result.recordset.slice(0, 5).forEach((p: any, index: number) => {
      console.log(`\n${index + 1}. ${p.name}`);
      console.log(`   - ID: ${p.id}`);
      console.log(`   - unitId: ${p.unitId || '❌ NULL'}`);
      console.log(`   - categoryName: ${p.categoryName || 'N/A'}`);
      console.log(`   - status: ${p.status}`);
      console.log(`   - currentStock: ${p.currentStock}`);
      console.log(`   - costPrice: ${p.costPrice}`);
    });

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

testProductsAPI();
