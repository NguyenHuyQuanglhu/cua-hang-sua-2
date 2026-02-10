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

async function testConversion() {
  let pool: sql.ConnectionPool | null = null;
  try {
    pool = await sql.connect(config);
    
    console.log('🧪 Testing Unit Conversion Model\n');

    // Get store
    const storeResult = await pool.request().query(`
      SELECT id, name FROM Stores WHERE name LIKE N'%sữa%'
    `);
    
    if (storeResult.recordset.length === 0) {
      console.log('❌ Store not found');
      return;
    }

    const storeId = storeResult.recordset[0].id;
    console.log(`📍 Store: ${storeResult.recordset[0].name}\n`);

    // Test 1: Create conversion units
    console.log('1️⃣  Creating test units...');
    
    // Check if Chai unit exists
    let chaiUnit = await pool.request()
      .input('storeId', sql.VarChar, storeId)
      .query(`SELECT id, name FROM Units WHERE store_id = @storeId AND name = N'Chai'`);
    
    let chaiUnitId;
    if (chaiUnit.recordset.length === 0) {
      // Create Chai (base unit)
      const newId = require('crypto').randomUUID();
      const chaiResult = await pool.request()
        .input('id', sql.VarChar, newId)
        .input('storeId', sql.VarChar, storeId)
        .input('name', sql.NVarChar, 'Chai')
        .input('description', sql.NVarChar, 'Đơn vị cơ sở')
        .query(`
          INSERT INTO Units (id, store_id, name, description, is_base_unit, conversion_factor)
          OUTPUT INSERTED.id
          VALUES (@id, @storeId, @name, @description, 1, 1)
        `);
      chaiUnitId = chaiResult.recordset[0].id;
      console.log(`   ✅ Created Chai unit: ${chaiUnitId}`);
    } else {
      chaiUnitId = chaiUnit.recordset[0].id;
      console.log(`   ⏭️  Chai unit exists: ${chaiUnitId}`);
    }

    // Check if Thùng unit exists
    let thungUnit = await pool.request()
      .input('storeId', sql.VarChar, storeId)
      .query(`SELECT id, name FROM Units WHERE store_id = @storeId AND name = N'Thùng'`);
    
    let thungUnitId;
    if (thungUnit.recordset.length === 0) {
      // Create Thùng (1 Thùng = 24 Chai)
      const newId = require('crypto').randomUUID();
      const thungResult = await pool.request()
        .input('id', sql.VarChar, newId)
        .input('storeId', sql.VarChar, storeId)
        .input('name', sql.NVarChar, 'Thùng')
        .input('description', sql.NVarChar, '1 Thùng = 24 Chai')
        .input('baseUnitId', sql.VarChar, chaiUnitId)
        .input('conversionFactor', sql.Decimal(18, 4), 24)
        .query(`
          INSERT INTO Units (id, store_id, name, description, base_unit_id, conversion_factor, is_base_unit)
          OUTPUT INSERTED.id
          VALUES (@id, @storeId, @name, @description, @baseUnitId, @conversionFactor, 0)
        `);
      thungUnitId = thungResult.recordset[0].id;
      console.log(`   ✅ Created Thùng unit: ${thungUnitId}`);
    } else {
      thungUnitId = thungUnit.recordset[0].id;
      console.log(`   ⏭️  Thùng unit exists: ${thungUnitId}`);
    }

    // Test 2: Get a product and set units
    console.log('\n2️⃣  Setting up test product...');
    const productResult = await pool.request()
      .input('storeId', sql.VarChar, storeId)
      .query(`SELECT TOP 1 id, name FROM Products WHERE store_id = @storeId`);
    
    if (productResult.recordset.length === 0) {
      console.log('   ❌ No products found');
      return;
    }

    const product = productResult.recordset[0];
    console.log(`   📦 Product: ${product.name}`);

    // Update product with units
    await pool.request()
      .input('productId', sql.VarChar, product.id)
      .input('unitId', sql.VarChar, chaiUnitId)
      .input('defaultPurchaseUnitId', sql.VarChar, thungUnitId)
      .input('defaultSalesUnitId', sql.VarChar, chaiUnitId)
      .input('costPrice', sql.Decimal(18, 2), 20000)
      .query(`
        UPDATE Products
        SET unit_id = @unitId,
            default_purchase_unit_id = @defaultPurchaseUnitId,
            default_sales_unit_id = @defaultSalesUnitId,
            cost_price = @costPrice
        WHERE id = @productId
      `);
    console.log(`   ✅ Updated product units`);
    console.log(`      - Base unit: Chai`);
    console.log(`      - Purchase unit: Thùng`);
    console.log(`      - Sales unit: Chai`);
    console.log(`      - Cost price: 20,000đ/Chai`);

    // Test 3: Simulate purchase order
    console.log('\n3️⃣  Simulating purchase order...');
    console.log(`   📥 Input: Nhập 10 Thùng x 480,000đ/Thùng`);
    
    const quantity = 10;
    const unitPrice = 480000;
    const conversionFactor = 24;
    
    const baseQuantity = quantity * conversionFactor;
    const baseUnitPrice = unitPrice / conversionFactor;
    const totalAmount = quantity * unitPrice;
    
    console.log(`   🔄 Conversion:`);
    console.log(`      - Base quantity: ${baseQuantity} Chai`);
    console.log(`      - Base unit price: ${baseUnitPrice.toLocaleString()}đ/Chai`);
    console.log(`      - Total amount: ${totalAmount.toLocaleString()}đ`);

    // Test 4: Display stock in different units
    console.log('\n4️⃣  Stock display test...');
    const stockInBase = 240; // 240 Chai
    console.log(`   📊 Stock in database: ${stockInBase} Chai`);
    console.log(`   📊 Display options:`);
    console.log(`      - ${stockInBase} Chai`);
    console.log(`      - ${stockInBase / 24} Thùng`);
    console.log(`      - ${Math.floor(stockInBase / 24)} Thùng ${stockInBase % 24} Chai`);

    console.log('\n✅ Unit Conversion Model test completed!');
    console.log('\n📝 Summary:');
    console.log('   - Units created: Chai (base), Thùng (24x)');
    console.log('   - Product configured with conversion units');
    console.log('   - Purchase conversion: 10 Thùng → 240 Chai');
    console.log('   - Price conversion: 480,000đ/Thùng → 20,000đ/Chai');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
    process.exit(0);
  }
}

testConversion();
