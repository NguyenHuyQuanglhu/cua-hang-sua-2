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

async function checkPayments() {
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

    // Check supplier payments
    const payments = await sql.query`
      SELECT 
        sp.*,
        s.name as supplier_name
      FROM SupplierPayments sp
      JOIN Suppliers s ON sp.supplier_id = s.id
      WHERE sp.store_id = ${storeId}
      ORDER BY sp.created_at DESC
    `;

    console.log(`💳 Tổng số thanh toán: ${payments.recordset.length}\n`);

    if (payments.recordset.length > 0) {
      console.log('📋 Danh sách thanh toán:');
      payments.recordset.forEach((p, index) => {
        console.log(`  ${index + 1}. ${p.supplier_name}: ${p.amount.toLocaleString('vi-VN')} VNĐ (${new Date(p.payment_date).toLocaleDateString('vi-VN')})`);
      });
    } else {
      console.log('⚠️  Chưa có thanh toán nào');
    }

    // Check suppliers with debt calculation
    console.log('\n📊 Công nợ nhà cung cấp:');
    const suppliers = await sql.query`
      SELECT 
        s.id,
        s.name,
        ISNULL(SUM(po.total_amount), 0) as total_purchase,
        ISNULL((SELECT SUM(amount) FROM SupplierPayments WHERE supplier_id = s.id AND store_id = ${storeId}), 0) as total_paid
      FROM Suppliers s
      LEFT JOIN PurchaseOrders po ON s.id = po.supplier_id AND po.store_id = ${storeId}
      WHERE s.store_id = ${storeId}
      GROUP BY s.id, s.name
      ORDER BY s.name
    `;

    suppliers.recordset.forEach((s, index) => {
      const debt = s.total_purchase - s.total_paid;
      console.log(`  ${index + 1}. ${s.name}:`);
      console.log(`     - Tổng nhập: ${s.total_purchase.toLocaleString('vi-VN')} VNĐ`);
      console.log(`     - Đã trả: ${s.total_paid.toLocaleString('vi-VN')} VNĐ`);
      console.log(`     - Nợ: ${debt.toLocaleString('vi-VN')} VNĐ`);
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

checkPayments();
