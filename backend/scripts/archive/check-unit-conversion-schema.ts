import sql from 'mssql';

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

async function checkSchema() {
  let pool: sql.ConnectionPool | null = null;
  try {
    pool = await sql.connect(config);
    
    console.log('🔍 Checking schema for Unit Conversion Model...\n');

    // Check Units table columns
    console.log('📋 Units table columns:');
    const unitsColumns = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Units'
      ORDER BY ORDINAL_POSITION
    `);
    
    const unitsColNames = unitsColumns.recordset.map((c: any) => c.COLUMN_NAME);
    console.log('  Existing:', unitsColNames.join(', '));
    
    const requiredUnitsColumns = ['base_unit_id', 'conversion_factor', 'is_base_unit'];
    const missingUnitsColumns = requiredUnitsColumns.filter(col => !unitsColNames.includes(col));
    
    if (missingUnitsColumns.length > 0) {
      console.log('  ❌ Missing:', missingUnitsColumns.join(', '));
    } else {
      console.log('  ✅ All required columns exist');
    }

    // Check Products table columns
    console.log('\n📋 Products table columns:');
    const productsColumns = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Products'
      ORDER BY ORDINAL_POSITION
    `);
    
    const productsColNames = productsColumns.recordset.map((c: any) => c.COLUMN_NAME);
    console.log('  Existing:', productsColNames.join(', '));
    
    const requiredProductsColumns = ['unit_id', 'default_purchase_unit_id', 'default_sales_unit_id'];
    const missingProductsColumns = requiredProductsColumns.filter(col => !productsColNames.includes(col));
    
    if (missingProductsColumns.length > 0) {
      console.log('  ❌ Missing:', missingProductsColumns.join(', '));
    } else {
      console.log('  ✅ All required columns exist');
    }

    // Check PurchaseOrderItems table columns
    console.log('\n📋 PurchaseOrderItems table columns:');
    const poiColumns = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'PurchaseOrderItems'
      ORDER BY ORDINAL_POSITION
    `);
    
    const poiColNames = poiColumns.recordset.map((c: any) => c.COLUMN_NAME);
    console.log('  Existing:', poiColNames.join(', '));
    
    const requiredPOIColumns = ['unit_id', 'base_quantity', 'base_unit_price'];
    const missingPOIColumns = requiredPOIColumns.filter(col => !poiColNames.includes(col));
    
    if (missingPOIColumns.length > 0) {
      console.log('  ❌ Missing:', missingPOIColumns.join(', '));
    } else {
      console.log('  ✅ All required columns exist');
    }

    // Summary
    console.log('\n📊 Summary:');
    const totalMissing = missingUnitsColumns.length + missingProductsColumns.length + missingPOIColumns.length;
    
    if (totalMissing === 0) {
      console.log('  ✅ Schema is ready for Unit Conversion Model!');
    } else {
      console.log(`  ⚠️  Need to add ${totalMissing} columns`);
      console.log('  Run migration script to add missing columns');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
    process.exit(0);
  }
}

checkSchema();
