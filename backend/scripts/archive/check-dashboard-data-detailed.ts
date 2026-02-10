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

async function checkDashboardData() {
  let pool: sql.ConnectionPool | null = null;
  try {
    pool = await sql.connect(config);
    console.log('✅ Kết nối database thành công!\n');

    // Lấy storeId của cửa hàng sữa
    const storeResult = await sql.query`
      SELECT id, name FROM Stores WHERE name LIKE N'%sữa%'
    `;
    
    if (storeResult.recordset.length === 0) {
      console.log('❌ Không tìm thấy cửa hàng sữa');
      return;
    }

    const store = storeResult.recordset[0];
    const storeId = store.id;
    console.log(`📍 Cửa hàng: ${store.name} (ID: ${storeId})\n`);

    // 1. Kiểm tra số lượng sản phẩm
    const productsResult = await sql.query`
      SELECT COUNT(*) as total FROM Products WHERE store_id = ${storeId}
    `;
    console.log(`📦 Tổng số sản phẩm: ${productsResult.recordset[0].total}`);

    // 2. Kiểm tra tồn kho
    const inventoryResult = await sql.query`
      SELECT 
        p.name as ProductName,
        p.stock_quantity as Quantity,
        u.name as UnitName
      FROM Products p
      LEFT JOIN Units u ON p.unit_id = u.id
      WHERE p.store_id = ${storeId} AND p.stock_quantity > 0
      ORDER BY p.stock_quantity DESC
    `;
    console.log(`\n📊 Tồn kho hiện tại:`);
    if (inventoryResult.recordset.length === 0) {
      console.log(`  - Chưa có sản phẩm nào trong kho`);
    } else {
      inventoryResult.recordset.forEach(item => {
        console.log(`  - ${item.ProductName}: ${item.Quantity} ${item.UnitName || 'N/A'}`);
      });
    }

    // 3. Kiểm tra doanh số bán hàng
    const salesResult = await sql.query`
      SELECT 
        COUNT(*) as totalSales,
        SUM(final_amount) as totalRevenue
      FROM SalesTransactions
      WHERE store_id = ${storeId}
    `;
    const salesData = salesResult.recordset[0];
    console.log(`\n💰 Doanh số:`);
    console.log(`  - Tổng số đơn: ${salesData.totalSales || 0}`);
    console.log(`  - Tổng doanh thu: ${(salesData.totalRevenue || 0).toLocaleString('vi-VN')} VNĐ`);

    // 4. Kiểm tra khách hàng
    const customersResult = await sql.query`
      SELECT COUNT(*) as total FROM Customers WHERE store_id = ${storeId}
    `;
    console.log(`\n👥 Tổng số khách hàng: ${customersResult.recordset[0].total}`);

    // 5. Kiểm tra công nợ
    const debtResult = await sql.query`
      SELECT 
        c.name as CustomerName,
        c.phone,
        ISNULL(SUM(st.final_amount), 0) as TotalSales,
        ISNULL((SELECT SUM(amount) FROM Payments WHERE customer_id = c.id), 0) as TotalPayments,
        ISNULL(SUM(st.final_amount), 0) - ISNULL((SELECT SUM(amount) FROM Payments WHERE customer_id = c.id), 0) as Debt
      FROM Customers c
      LEFT JOIN SalesTransactions st ON c.id = st.customer_id
      WHERE c.store_id = ${storeId}
      GROUP BY c.id, c.name, c.phone
      HAVING ISNULL(SUM(st.final_amount), 0) - ISNULL((SELECT SUM(amount) FROM Payments WHERE customer_id = c.id), 0) > 0
      ORDER BY Debt DESC
    `;
    console.log(`\n💳 Công nợ phải thu:`);
    if (debtResult.recordset.length === 0) {
      console.log(`  - Không có khách hàng nào đang nợ`);
    } else {
      let totalDebt = 0;
      debtResult.recordset.forEach(item => {
        console.log(`  - ${item.CustomerName} (${item.phone || 'N/A'}): ${item.Debt.toLocaleString('vi-VN')} VNĐ`);
        totalDebt += item.Debt;
      });
      console.log(`  📌 Tổng nợ: ${totalDebt.toLocaleString('vi-VN')} VNĐ`);
    }

    // 6. Kiểm tra sản phẩm bán chạy
    const topProductsResult = await sql.query`
      SELECT TOP 10
        p.name as ProductName,
        SUM(si.quantity) as TotalQuantity,
        SUM(si.quantity * si.price) as TotalRevenue,
        u.name as UnitName
      FROM SalesItems si
      JOIN Products p ON si.product_id = p.id
      JOIN SalesTransactions st ON si.sales_transaction_id = st.id
      LEFT JOIN Units u ON p.unit_id = u.id
      WHERE st.store_id = ${storeId}
      GROUP BY p.id, p.name, u.name
      ORDER BY TotalRevenue DESC
    `;
    console.log(`\n🔥 Top 10 sản phẩm bán chạy:`);
    if (topProductsResult.recordset.length === 0) {
      console.log(`  - Chưa có sản phẩm nào được bán`);
    } else {
      topProductsResult.recordset.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.ProductName}: ${item.TotalQuantity} ${item.UnitName || 'N/A'} - ${item.TotalRevenue.toLocaleString('vi-VN')} VNĐ`);
      });
    }

    // 7. Kiểm tra đơn nhập hàng
    const purchasesResult = await sql.query`
      SELECT 
        COUNT(*) as totalOrders,
        SUM(total_amount) as totalAmount
      FROM PurchaseOrders
      WHERE store_id = ${storeId}
    `;
    const purchaseData = purchasesResult.recordset[0];
    console.log(`\n📥 Đơn nhập hàng:`);
    console.log(`  - Tổng số đơn: ${purchaseData.totalOrders || 0}`);
    console.log(`  - Tổng giá trị: ${(purchaseData.totalAmount || 0).toLocaleString('vi-VN')} VNĐ`);

    console.log('\n✅ Hoàn thành kiểm tra!');

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
    process.exit(0);
  }
}

checkDashboardData();
