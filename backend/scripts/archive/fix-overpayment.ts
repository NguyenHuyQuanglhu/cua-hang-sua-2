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

async function fixOverpayment() {
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

    // Find suppliers with overpayment (paid > purchased)
    const overpaidSuppliers = await sql.query`
      SELECT 
        s.id,
        s.name,
        ISNULL(SUM(po.total_amount), 0) as total_purchase,
        ISNULL((SELECT SUM(amount) FROM SupplierPayments WHERE supplier_id = s.id AND store_id = ${storeId}), 0) as total_paid
      FROM Suppliers s
      LEFT JOIN PurchaseOrders po ON s.id = po.supplier_id AND po.store_id = ${storeId}
      WHERE s.store_id = ${storeId}
      GROUP BY s.id, s.name
      HAVING ISNULL((SELECT SUM(amount) FROM SupplierPayments WHERE supplier_id = s.id AND store_id = ${storeId}), 0) > ISNULL(SUM(po.total_amount), 0)
    `;

    if (overpaidSuppliers.recordset.length === 0) {
      console.log('✅ Không có nhà cung cấp nào bị trả thừa');
      return;
    }

    console.log(`⚠️  Tìm thấy ${overpaidSuppliers.recordset.length} nhà cung cấp bị trả thừa:\n`);

    for (const supplier of overpaidSuppliers.recordset) {
      const overpaid = supplier.total_paid - supplier.total_purchase;
      console.log(`  - ${supplier.name}:`);
      console.log(`    Tổng nhập: ${supplier.total_purchase.toLocaleString('vi-VN')} VNĐ`);
      console.log(`    Đã trả: ${supplier.total_paid.toLocaleString('vi-VN')} VNĐ`);
      console.log(`    Trả thừa: ${overpaid.toLocaleString('vi-VN')} VNĐ`);

      // Get latest payment
      const latestPayment = await sql.query`
        SELECT TOP 1 id, amount, payment_date
        FROM SupplierPayments
        WHERE supplier_id = ${supplier.id} AND store_id = ${storeId}
        ORDER BY created_at DESC
      `;

      if (latestPayment.recordset.length > 0) {
        const payment = latestPayment.recordset[0];
        console.log(`    Thanh toán gần nhất: ${payment.amount.toLocaleString('vi-VN')} VNĐ (${new Date(payment.payment_date).toLocaleDateString('vi-VN')})`);
        
        // Delete the latest payment
        await sql.query`
          DELETE FROM SupplierPayments WHERE id = ${payment.id}
        `;
        console.log(`    ✅ Đã xóa thanh toán thừa\n`);
      }
    }

    console.log('✅ Hoàn thành sửa lỗi trả thừa!');

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
    process.exit(0);
  }
}

fixOverpayment();
