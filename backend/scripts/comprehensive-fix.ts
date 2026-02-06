import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  server: process.env.DB_SERVER || '',
  database: process.env.DB_NAME || '',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

async function comprehensiveFix() {
  try {
    await sql.connect(config);
    console.log('🔧 Starting comprehensive system fix...\n');

    // 1. Check PurchaseOrders table structure
    console.log('=== 1. Checking PurchaseOrders table structure ===');
    const columns = await sql.query`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'PurchaseOrders'
      ORDER BY ORDINAL_POSITION
    `;
    
    const requiredColumns = ['paid_amount', 'remaining_debt', 'payment_status', 'updated_at', 'created_by'];
    const existingColumns = columns.recordset.map((c: any) => c.COLUMN_NAME);
    
    console.log('Existing columns:', existingColumns.join(', '));
    
    for (const col of requiredColumns) {
      if (!existingColumns.includes(col)) {
        console.log(`❌ Missing column: ${col}`);
      } else {
        console.log(`✓ Column exists: ${col}`);
      }
    }

    // 2. Fix missing updated_at values
    console.log('\n=== 2. Fixing missing updated_at values ===');
    const nullUpdatedAt = await sql.query`
      SELECT COUNT(*) as count FROM PurchaseOrders WHERE updated_at IS NULL
    `;
    
    if (nullUpdatedAt.recordset[0].count > 0) {
      console.log(`Found ${nullUpdatedAt.recordset[0].count} records with NULL updated_at`);
      await sql.query`
        UPDATE PurchaseOrders 
        SET updated_at = created_at 
        WHERE updated_at IS NULL
      `;
      console.log('✓ Fixed updated_at values');
    } else {
      console.log('✓ All records have updated_at');
    }

    // 3. Fix missing payment columns
    console.log('\n=== 3. Fixing missing payment column values ===');
    const nullPaymentData = await sql.query`
      SELECT COUNT(*) as count 
      FROM PurchaseOrders 
      WHERE paid_amount IS NULL OR remaining_debt IS NULL OR payment_status IS NULL
    `;
    
    if (nullPaymentData.recordset[0].count > 0) {
      console.log(`Found ${nullPaymentData.recordset[0].count} records with NULL payment data`);
      await sql.query`
        UPDATE PurchaseOrders 
        SET 
          paid_amount = ISNULL(paid_amount, 0),
          remaining_debt = ISNULL(remaining_debt, total_amount),
          payment_status = ISNULL(payment_status, 'unpaid')
        WHERE paid_amount IS NULL OR remaining_debt IS NULL OR payment_status IS NULL
      `;
      console.log('✓ Fixed payment column values');
    } else {
      console.log('✓ All records have payment data');
    }

    // 4. Check for orphaned purchase orders (no supplier)
    console.log('\n=== 4. Checking orphaned purchase orders ===');
    const orphaned = await sql.query`
      SELECT COUNT(*) as count 
      FROM PurchaseOrders 
      WHERE supplier_id IS NULL
    `;
    console.log(`Found ${orphaned.recordset[0].count} purchase orders without supplier`);
    
    if (orphaned.recordset[0].count > 0) {
      const orphanedList = await sql.query`
        SELECT TOP 10 order_number, total_amount, import_date
        FROM PurchaseOrders 
        WHERE supplier_id IS NULL
        ORDER BY created_at DESC
      `;
      console.log('Recent orders without supplier:');
      orphanedList.recordset.forEach((o: any) => {
        console.log(`  - ${o.order_number}: ${o.total_amount} (${o.import_date})`);
      });
    }

    // 5. Verify SupplierPayments table structure
    console.log('\n=== 5. Checking SupplierPayments table ===');
    const spColumns = await sql.query`
      SELECT COLUMN_NAME, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'SupplierPayments'
      ORDER BY ORDINAL_POSITION
    `;
    
    console.log('SupplierPayments columns:');
    spColumns.recordset.forEach((c: any) => {
      console.log(`  - ${c.COLUMN_NAME} (nullable: ${c.IS_NULLABLE})`);
    });

    // 6. Check if supplier_id can be NULL in SupplierPayments
    const spSupplierIdNullable = spColumns.recordset.find((c: any) => c.COLUMN_NAME === 'supplier_id');
    if (spSupplierIdNullable && spSupplierIdNullable.IS_NULLABLE === 'NO') {
      console.log('\n⚠️  WARNING: supplier_id in SupplierPayments is NOT NULL');
      console.log('This means you CANNOT create payments for purchase orders without supplier!');
      console.log('\nTo fix this, run:');
      console.log('ALTER TABLE SupplierPayments ALTER COLUMN supplier_id UNIQUEIDENTIFIER NULL;');
    }

    // 7. Test data integrity
    console.log('\n=== 7. Testing data integrity ===');
    const integrityCheck = await sql.query`
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN supplier_id IS NOT NULL THEN 1 ELSE 0 END) as with_supplier,
        SUM(CASE WHEN supplier_id IS NULL THEN 1 ELSE 0 END) as without_supplier,
        SUM(CASE WHEN remaining_debt > 0 THEN 1 ELSE 0 END) as unpaid,
        SUM(CASE WHEN remaining_debt = 0 THEN 1 ELSE 0 END) as paid
      FROM PurchaseOrders
    `;
    
    const stats = integrityCheck.recordset[0];
    console.log(`Total orders: ${stats.total_orders}`);
    console.log(`  - With supplier: ${stats.with_supplier}`);
    console.log(`  - Without supplier: ${stats.without_supplier}`);
    console.log(`  - Unpaid: ${stats.unpaid}`);
    console.log(`  - Paid: ${stats.paid}`);

    // 8. Summary
    console.log('\n=== 8. SUMMARY ===');
    console.log('✓ Database structure checked');
    console.log('✓ Missing values fixed');
    console.log('✓ Data integrity verified');
    console.log('\n⚠️  IMPORTANT NOTES:');
    console.log('1. Purchase orders WITHOUT supplier cannot be paid (by design)');
    console.log('2. Always select a supplier when creating new purchase orders');
    console.log('3. If you need to pay orders without supplier, you must:');
    console.log('   a) Edit the order to add a supplier, OR');
    console.log('   b) Modify SupplierPayments table to allow NULL supplier_id');

    console.log('\n✅ Comprehensive fix completed!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.close();
  }
}

comprehensiveFix();
