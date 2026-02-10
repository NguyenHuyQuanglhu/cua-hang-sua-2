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

async function addColumns() {
  let pool: sql.ConnectionPool | null = null;
  try {
    pool = await sql.connect(config);
    
    console.log('🔄 Starting Unit Conversion Migration...\n');

    // 1. Add is_base_unit to Units
    console.log('1️⃣  Adding is_base_unit to Units...');
    try {
      await pool.request().query(`
        ALTER TABLE Units ADD is_base_unit BIT DEFAULT 0
      `);
      console.log('   ✅ Added is_base_unit column');
      
      // Set is_base_unit = 1 where base_unit_id IS NULL
      await pool.request().query(`
        UPDATE Units SET is_base_unit = 1 WHERE base_unit_id IS NULL
      `);
      console.log('   ✅ Updated is_base_unit values');
    } catch (err: any) {
      if (err.message.includes('already exists')) {
        console.log('   ⏭️  is_base_unit already exists');
      } else {
        console.error('   ❌ Error:', err.message);
      }
    }

    // 2. Add default_purchase_unit_id to Products
    console.log('\n2️⃣  Adding default_purchase_unit_id to Products...');
    try {
      await pool.request().query(`
        ALTER TABLE Products ADD default_purchase_unit_id VARCHAR(36) NULL
      `);
      console.log('   ✅ Added default_purchase_unit_id column');
      
      // Set default to unit_id
      await pool.request().query(`
        UPDATE Products SET default_purchase_unit_id = unit_id WHERE unit_id IS NOT NULL
      `);
      console.log('   ✅ Set default values');
      
      // Add foreign key
      try {
        await pool.request().query(`
          ALTER TABLE Products
          ADD CONSTRAINT FK_Products_DefaultPurchaseUnit
          FOREIGN KEY (default_purchase_unit_id) REFERENCES Units(id)
        `);
        console.log('   ✅ Added foreign key constraint');
      } catch (fkErr: any) {
        if (fkErr.message.includes('already exists')) {
          console.log('   ⏭️  Foreign key already exists');
        }
      }
    } catch (err: any) {
      if (err.message.includes('already exists')) {
        console.log('   ⏭️  default_purchase_unit_id already exists');
      } else {
        console.error('   ❌ Error:', err.message);
      }
    }

    // 3. Add default_sales_unit_id to Products
    console.log('\n3️⃣  Adding default_sales_unit_id to Products...');
    try {
      await pool.request().query(`
        ALTER TABLE Products ADD default_sales_unit_id VARCHAR(36) NULL
      `);
      console.log('   ✅ Added default_sales_unit_id column');
      
      // Set default to unit_id
      await pool.request().query(`
        UPDATE Products SET default_sales_unit_id = unit_id WHERE unit_id IS NOT NULL
      `);
      console.log('   ✅ Set default values');
      
      // Add foreign key
      try {
        await pool.request().query(`
          ALTER TABLE Products
          ADD CONSTRAINT FK_Products_DefaultSalesUnit
          FOREIGN KEY (default_sales_unit_id) REFERENCES Units(id)
        `);
        console.log('   ✅ Added foreign key constraint');
      } catch (fkErr: any) {
        if (fkErr.message.includes('already exists')) {
          console.log('   ⏭️  Foreign key already exists');
        }
      }
    } catch (err: any) {
      if (err.message.includes('already exists')) {
        console.log('   ⏭️  default_sales_unit_id already exists');
      } else {
        console.error('   ❌ Error:', err.message);
      }
    }

    // 4. Add base_unit_price to PurchaseOrderItems
    console.log('\n4️⃣  Adding base_unit_price to PurchaseOrderItems...');
    try {
      await pool.request().query(`
        ALTER TABLE PurchaseOrderItems ADD base_unit_price DECIMAL(18, 2) NULL
      `);
      console.log('   ✅ Added base_unit_price column');
      
      // Calculate base_unit_price from existing data
      await pool.request().query(`
        UPDATE poi
        SET poi.base_unit_price = 
          CASE 
            WHEN u.conversion_factor IS NOT NULL AND u.conversion_factor > 0 
            THEN poi.cost / u.conversion_factor
            ELSE poi.cost
          END
        FROM PurchaseOrderItems poi
        LEFT JOIN Units u ON poi.unit_id = u.id
        WHERE poi.cost IS NOT NULL
      `);
      console.log('   ✅ Calculated base_unit_price values');
    } catch (err: any) {
      if (err.message.includes('already exists')) {
        console.log('   ⏭️  base_unit_price already exists');
      } else {
        console.error('   ❌ Error:', err.message);
      }
    }

    // Verify
    console.log('\n🔍 Verifying...');
    const unitsCount = await pool.request().query(`
      SELECT COUNT(*) as count FROM Units WHERE conversion_factor IS NOT NULL AND conversion_factor > 0
    `);
    console.log(`   📊 Units with conversion factors: ${unitsCount.recordset[0].count}`);
    
    const productsCount = await pool.request().query(`
      SELECT COUNT(*) as count FROM Products WHERE unit_id IS NOT NULL
    `);
    console.log(`   📊 Products with unit_id: ${productsCount.recordset[0].count}`);
    
    const poiCount = await pool.request().query(`
      SELECT COUNT(*) as count FROM PurchaseOrderItems WHERE base_quantity IS NOT NULL
    `);
    console.log(`   📊 PurchaseOrderItems with base_quantity: ${poiCount.recordset[0].count}`);

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
    process.exit(0);
  }
}

addColumns();
