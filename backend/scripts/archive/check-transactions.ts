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

async function checkTransactions() {
  let pool: sql.ConnectionPool | null = null;
  try {
    pool = await sql.connect(config);
    
    // Get store
    const storeResult = await sql.query`
      SELECT id, name FROM Stores WHERE name LIKE N'%sữa%'
    `;
    
    if (storeResult.recordset.length === 0) {
      console.log('❌ Không tìm thấy cửa hàng sữa');
      return;
    }

    const store = storeResult.recordset[0];
    const storeId = store.id;
    console.log(`📍 Cửa hàng: ${store.name}\n`);

    // Check all possible transaction tables
    console.log('🔍 Kiểm tra các bảng giao dịch:\n');

    // 1. Check Sales table
    try {
      const sales = await sql.query`
        SELECT COUNT(*) as count FROM Sales WHERE store_id = ${storeId}
      `;
      console.log(`  📊 Sales: ${sales.recordset[0].count} giao dịch`);
      
      if (sales.recordset[0].count > 0) {
        const sampleSales = await sql.query`
          SELECT TOP 3 * FROM Sales WHERE store_id = ${storeId} ORDER BY created_at DESC
        `;
        console.log('     Mẫu:');
        sampleSales.recordset.forEach((s, i) => {
          console.log(`       ${i + 1}. ID: ${s.id}, Amount: ${s.total_amount || s.final_amount || 'N/A'}`);
        });
      }
    } catch (e) {
      console.log('  ❌ Bảng Sales không tồn tại hoặc lỗi');
    }

    // 2. Check SalesTransactions table
    try {
      const salesTx = await sql.query`
        SELECT COUNT(*) as count FROM SalesTransactions WHERE store_id = ${storeId}
      `;
      console.log(`\n  📊 SalesTransactions: ${salesTx.recordset[0].count} giao dịch`);
      
      if (salesTx.recordset[0].count > 0) {
        const sampleTx = await sql.query`
          SELECT TOP 3 * FROM SalesTransactions WHERE store_id = ${storeId} ORDER BY created_at DESC
        `;
        console.log('     Mẫu:');
        sampleTx.recordset.forEach((s, i) => {
          console.log(`       ${i + 1}. Invoice: ${s.invoice_number}, Amount: ${s.final_amount}`);
        });
      }
    } catch (e) {
      console.log('\n  ❌ Bảng SalesTransactions không tồn tại hoặc lỗi');
    }

    // 3. Check Payments table
    try {
      const payments = await sql.query`
        SELECT COUNT(*) as count FROM Payments WHERE store_id = ${storeId}
      `;
      console.log(`\n  📊 Payments: ${payments.recordset[0].count} thanh toán`);
      
      if (payments.recordset[0].count > 0) {
        const samplePayments = await sql.query`
          SELECT TOP 3 * FROM Payments WHERE store_id = ${storeId} ORDER BY created_at DESC
        `;
        console.log('     Mẫu:');
        samplePayments.recordset.forEach((p, i) => {
          console.log(`       ${i + 1}. Amount: ${p.amount}, Date: ${new Date(p.payment_date).toLocaleDateString('vi-VN')}`);
        });
      }
    } catch (e) {
      console.log('\n  ❌ Bảng Payments không tồn tại hoặc lỗi');
    }

    // 4. Check CashTransactions table
    try {
      const cashTx = await sql.query`
        SELECT COUNT(*) as count FROM CashTransactions WHERE store_id = ${storeId}
      `;
      console.log(`\n  📊 CashTransactions: ${cashTx.recordset[0].count} giao dịch tiền mặt`);
    } catch (e) {
      console.log('\n  ❌ Bảng CashTransactions không tồn tại hoặc lỗi');
    }

    // 5. List all tables in database
    console.log('\n\n📋 Tất cả các bảng trong database:');
    const tables = await sql.query`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `;
    tables.recordset.forEach(t => {
      console.log(`  - ${t.TABLE_NAME}`);
    });

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
    process.exit(0);
  }
}

checkTransactions();
