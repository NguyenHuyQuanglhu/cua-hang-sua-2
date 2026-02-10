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

async function syncStock() {
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

    // Get all products with their purchase quantities
    const productsWithPurchases = await sql.query`
      SELECT 
        p.id,
        p.name,
        p.unit_id,
        u.name as unit_name,
        ISNULL(SUM(poi.quantity), 0) as total_purchased
      FROM Products p
      LEFT JOIN PurchaseOrderItems poi ON p.id = poi.product_id
      LEFT JOIN PurchaseOrders po ON poi.purchase_order_id = po.id AND po.store_id = ${storeId}
      LEFT JOIN Units u ON p.unit_id = u.id
      WHERE p.store_id = ${storeId}
      GROUP BY p.id, p.name, p.unit_id, u.name
      HAVING ISNULL(SUM(poi.quantity), 0) > 0
      ORDER BY p.name
    `;

    console.log(`📦 Tìm thấy ${productsWithPurchases.recordset.length} sản phẩm có đơn nhập hàng\n`);

    if (productsWithPurchases.recordset.length === 0) {
      console.log('⚠️  Không có sản phẩm nào có đơn nhập hàng');
      return;
    }

    console.log('🔄 Đang cập nhật tồn kho...\n');

    for (const product of productsWithPurchases.recordset) {
      // Update stock_quantity in Products table
      await sql.query`
        UPDATE Products 
        SET stock_quantity = ${product.total_purchased}
        WHERE id = ${product.id}
      `;

      console.log(`  ✅ ${product.name}: ${product.total_purchased} ${product.unit_name || ''}`);
    }

    console.log(`\n✅ Đã cập nhật tồn kho cho ${productsWithPurchases.recordset.length} sản phẩm!`);

    // Show summary
    console.log('\n📊 Tổng kết tồn kho:');
    const summary = await sql.query`
      SELECT 
        COUNT(*) as total_products,
        SUM(stock_quantity) as total_stock
      FROM Products
      WHERE store_id = ${storeId} AND stock_quantity > 0
    `;

    const summaryData = summary.recordset[0];
    console.log(`  - Tổng số sản phẩm có tồn: ${summaryData.total_products}`);
    console.log(`  - Tổng số lượng tồn: ${summaryData.total_stock}`);

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
    process.exit(0);
  }
}

syncStock();
