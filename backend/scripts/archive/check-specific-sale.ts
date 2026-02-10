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

async function checkSpecificSale() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Checking specific sale...\n');
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('✓ Connected\n');

    const saleId = 'A0989641-ED9E-46E3-B81A-740151280626';

    // Check if sale exists
    console.log(`Looking for sale: ${saleId}\n`);
    const sale = await pool.request()
      .input('saleId', sql.UniqueIdentifier, saleId)
      .query(`
        SELECT 
          s.id,
          s.store_id,
          s.invoice_number,
          s.status,
          s.total_amount,
          s.created_at,
          st.name as store_name
        FROM Sales s
        LEFT JOIN Stores st ON s.store_id = st.id
        WHERE s.id = @saleId
      `);

    if (sale.recordset.length === 0) {
      console.log('❌ Sale NOT FOUND in database!');
      console.log('This sale does not exist.\n');
      
      // Check if there are any sales with similar ID
      const similar = await pool.request()
        .input('pattern', sql.NVarChar(100), `%${saleId.substring(0, 8)}%`)
        .query(`
          SELECT TOP 5
            id,
            invoice_number,
            store_id,
            status
          FROM Sales
          WHERE CAST(id AS NVARCHAR(36)) LIKE @pattern
        `);
      
      if (similar.recordset.length > 0) {
        console.log('Found similar sales:');
        similar.recordset.forEach((s: any) => {
          console.log(`  - ${s.invoice_number} (${s.id})`);
        });
      }
    } else {
      const saleData = sale.recordset[0];
      console.log('✓ Sale FOUND:');
      console.log(`  Invoice: ${saleData.invoice_number}`);
      console.log(`  Store ID: ${saleData.store_id}`);
      console.log(`  Store Name: ${saleData.store_name || 'N/A'}`);
      console.log(`  Status: ${saleData.status}`);
      console.log(`  Amount: ${saleData.total_amount}`);
      console.log(`  Created: ${saleData.created_at}`);
      console.log('');

      // Check all stores
      console.log('All stores in database:');
      const stores = await pool.request().query(`
        SELECT id, name, status
        FROM Stores
        ORDER BY name
      `);
      
      stores.recordset.forEach((store: any) => {
        const isSaleStore = store.id === saleData.store_id;
        console.log(`  ${isSaleStore ? '→' : ' '} ${store.name} (${store.id}) - ${store.status}`);
      });
      console.log('');

      // Try to update the sale
      console.log('Testing update with correct store_id...');
      try {
        const updateResult = await pool.request()
          .input('id', sql.NVarChar(36), saleId)
          .input('storeId', sql.NVarChar(36), saleData.store_id)
          .input('status', sql.NVarChar(20), 'printed')
          .execute('sp_Sales_UpdateStatus');

        console.log('✓ Update successful!');
        console.log('Result:', updateResult.recordset[0]);
        
        // Restore original status
        await pool.request()
          .input('id', sql.NVarChar(36), saleId)
          .input('storeId', sql.NVarChar(36), saleData.store_id)
          .input('status', sql.NVarChar(20), saleData.status)
          .execute('sp_Sales_UpdateStatus');
        console.log('✓ Restored original status');
      } catch (updateError: any) {
        console.error('❌ Update failed:', updateError.message);
      }
    }

    console.log('\n✅ Check complete!');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

checkSpecificSale();
