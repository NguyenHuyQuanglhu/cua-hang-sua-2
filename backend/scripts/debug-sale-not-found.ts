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

async function debugSaleNotFound() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Debugging "Sale not found" issue...\n');
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('✓ Connected\n');

    // Get some recent sales
    console.log('1. Checking recent sales...');
    const recentSales = await pool.request().query(`
      SELECT TOP 10
        id,
        store_id,
        invoice_number,
        status,
        total_amount,
        created_at
      FROM Sales
      ORDER BY created_at DESC
    `);

    console.log(`Found ${recentSales.recordset.length} recent sales:\n`);
    recentSales.recordset.forEach((sale: any, index: number) => {
      console.log(`${index + 1}. ${sale.invoice_number}`);
      console.log(`   ID: ${sale.id}`);
      console.log(`   Store ID: ${sale.store_id}`);
      console.log(`   Status: ${sale.status}`);
      console.log(`   Amount: ${sale.total_amount}`);
      console.log('');
    });

    // Test updating status of first sale
    if (recentSales.recordset.length > 0) {
      const testSale = recentSales.recordset[0];
      console.log(`2. Testing status update for sale: ${testSale.invoice_number}`);
      console.log(`   Current status: ${testSale.status}\n`);

      // Try calling the stored procedure
      console.log('Calling sp_Sales_UpdateStatus...');
      try {
        const result = await pool.request()
          .input('id', sql.NVarChar(36), testSale.id)
          .input('storeId', sql.NVarChar(36), testSale.store_id)
          .input('status', sql.NVarChar(20), 'printed')
          .execute('sp_Sales_UpdateStatus');

        console.log('✓ Stored procedure executed successfully');
        console.log('Result:', result.recordset[0]);
        console.log('');

        // Restore original status
        await pool.request()
          .input('id', sql.NVarChar(36), testSale.id)
          .input('storeId', sql.NVarChar(36), testSale.store_id)
          .input('status', sql.NVarChar(20), testSale.status)
          .execute('sp_Sales_UpdateStatus');
        console.log('✓ Restored original status\n');

      } catch (spError: any) {
        console.error('❌ Stored procedure error:', spError.message);
        console.error('');
      }

      // Check if there are any sales with status 'unprinted' or 'pending'
      console.log('3. Checking sales by status...');
      const statusCounts = await pool.request().query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM Sales
        GROUP BY status
        ORDER BY count DESC
      `);

      console.log('Status distribution:');
      statusCounts.recordset.forEach((row: any) => {
        console.log(`  ${row.status}: ${row.count} sales`);
      });
      console.log('');

      // Check for any sales with NULL status
      const nullStatus = await pool.request().query(`
        SELECT COUNT(*) as count
        FROM Sales
        WHERE status IS NULL
      `);
      console.log(`Sales with NULL status: ${nullStatus.recordset[0].count}\n`);
    }

    console.log('✅ Debug complete!');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

debugSaleNotFound();
