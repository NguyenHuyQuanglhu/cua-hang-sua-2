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

async function assignDefaultUnit() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('Connected successfully!\n');

    // Get the default unit (Hộp - Box)
    const unitResult = await pool.request().query(`
      SELECT TOP 1 id, name 
      FROM Units 
      WHERE name LIKE N'%Hộp%' OR name LIKE N'%Box%'
      ORDER BY name
    `);

    if (unitResult.recordset.length === 0) {
      console.log('⚠ Không tìm thấy đơn vị "Hộp". Lấy đơn vị đầu tiên...');
      const firstUnit = await pool.request().query(`
        SELECT TOP 1 id, name 
        FROM Units 
        WHERE status = 'active'
        ORDER BY name
      `);
      
      if (firstUnit.recordset.length === 0) {
        console.log('❌ Không có đơn vị nào trong hệ thống!');
        return;
      }
      
      var defaultUnit = firstUnit.recordset[0];
    } else {
      var defaultUnit = unitResult.recordset[0];
    }

    console.log(`✓ Sử dụng đơn vị mặc định: ${defaultUnit.name} (${defaultUnit.id})\n`);

    // Find products without unit
    const productsResult = await pool.request().query(`
      SELECT id, name, store_id
      FROM Products
      WHERE unit_id IS NULL AND status != 'deleted'
    `);

    if (productsResult.recordset.length === 0) {
      console.log('✓ Tất cả sản phẩm đều đã có đơn vị!');
      return;
    }

    console.log(`Tìm thấy ${productsResult.recordset.length} sản phẩm chưa có đơn vị.\n`);
    console.log('Bạn có muốn gán đơn vị mặc định cho các sản phẩm này không?');
    console.log('(Nhấn Ctrl+C để hủy, hoặc đợi 5 giây để tiếp tục...)\n');

    // Wait 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('Đang cập nhật...\n');

    let updated = 0;
    for (const product of productsResult.recordset) {
      try {
        await pool.request()
          .input('productId', sql.NVarChar, product.id)
          .input('unitId', sql.NVarChar, defaultUnit.id)
          .query(`
            UPDATE Products 
            SET unit_id = @unitId, updated_at = GETDATE()
            WHERE id = @productId
          `);
        
        console.log(`  ✓ ${product.name}`);
        updated++;
      } catch (error: any) {
        console.log(`  ✗ ${product.name}: ${error.message}`);
      }
    }

    console.log(`\n✓ Đã cập nhật ${updated}/${productsResult.recordset.length} sản phẩm!`);

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

assignDefaultUnit();
