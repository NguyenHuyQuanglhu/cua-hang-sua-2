import sql from 'mssql';

const config = {
  server: '118.69.126.49',
  database: 'Data_quanlybanhang_online',
  user: 'userquanlybanhangonline',
  password: '123456789',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function fixProductsMissingUnit() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Fixing products missing unit_id...\n');
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('✓ Connected\n');

    // 1. Check how many products are missing unit_id
    console.log('1. Checking products without unit_id...');
    const missingUnit = await pool.request().query(`
      SELECT COUNT(*) as count
      FROM Products
      WHERE unit_id IS NULL
    `);
    console.log(`Found ${missingUnit.recordset[0].count} products without unit_id\n`);

    if (missingUnit.recordset[0].count === 0) {
      console.log('✅ All products have unit_id!');
      return;
    }

    // 2. Get or create a default unit
    console.log('2. Getting default unit...');
    let defaultUnit = await pool.request().query(`
      SELECT TOP 1 id, name
      FROM Units
      WHERE name IN (N'Cái', N'Chiếc', N'Hộp', N'Chai')
      ORDER BY name
    `);

    let defaultUnitId: string;
    
    if (defaultUnit.recordset.length === 0) {
      console.log('No default unit found, creating "Cái"...');
      const newUnit = await pool.request().query(`
        DECLARE @newId UNIQUEIDENTIFIER = NEWID();
        INSERT INTO Units (id, name, description, created_at, updated_at)
        VALUES (@newId, N'Cái', N'Đơn vị mặc định', GETDATE(), GETDATE());
        SELECT @newId as id, N'Cái' as name;
      `);
      defaultUnitId = newUnit.recordset[0].id;
      console.log(`✓ Created default unit: Cái (${defaultUnitId})`);
    } else {
      defaultUnitId = defaultUnit.recordset[0].id;
      console.log(`✓ Using existing unit: ${defaultUnit.recordset[0].name} (${defaultUnitId})`);
    }
    console.log('');

    // 3. List products without unit_id
    console.log('3. Products without unit_id:');
    const products = await pool.request().query(`
      SELECT TOP 20
        p.id,
        p.name,
        p.sku,
        s.name as store_name
      FROM Products p
      LEFT JOIN Stores s ON p.store_id = s.id
      WHERE p.unit_id IS NULL
      ORDER BY p.created_at DESC
    `);

    products.recordset.forEach((product: any, index: number) => {
      console.log(`  ${index + 1}. ${product.name} (${product.sku || 'No SKU'})`);
      console.log(`     Store: ${product.store_name || 'N/A'}`);
      console.log(`     ID: ${product.id}`);
    });
    console.log('');

    // 4. Update all products without unit_id
    console.log('4. Updating products to use default unit...');
    const updateResult = await pool.request()
      .input('defaultUnitId', sql.UniqueIdentifier, defaultUnitId)
      .query(`
        UPDATE Products
        SET unit_id = @defaultUnitId,
            updated_at = GETDATE()
        WHERE unit_id IS NULL
      `);

    console.log(`✓ Updated ${updateResult.rowsAffected[0]} products\n`);

    // 5. Verify
    console.log('5. Verifying...');
    const verify = await pool.request().query(`
      SELECT COUNT(*) as count
      FROM Products
      WHERE unit_id IS NULL
    `);
    console.log(`Products still without unit_id: ${verify.recordset[0].count}\n`);

    if (verify.recordset[0].count === 0) {
      console.log('✅ All products now have unit_id!');
    } else {
      console.log('⚠️  Some products still missing unit_id');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

fixProductsMissingUnit();
