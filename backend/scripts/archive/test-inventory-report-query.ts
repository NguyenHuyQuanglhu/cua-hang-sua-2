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

async function testQuery() {
  let pool: sql.ConnectionPool | null = null;
  try {
    pool = await sql.connect(config);
    
    // Get store
    const storeResult = await pool.request().query(`
      SELECT id, name FROM Stores WHERE name LIKE N'%sữa%'
    `);
    
    if (storeResult.recordset.length === 0) {
      console.log('❌ Store not found');
      return;
    }

    const storeId = storeResult.recordset[0].id;
    console.log(`📍 Store: ${storeResult.recordset[0].name}`);
    console.log(`   Store ID: ${storeId}\n`);

    // Test the inventory report query
    console.log('🔍 Testing inventory report query...\n');
    
    const result = await pool.request()
      .input('storeId', sql.VarChar, storeId)
      .input('dateFrom', sql.DateTime, null)
      .input('dateTo', sql.DateTime, null)
      .input('search', sql.VarChar, null)
      .query(`
        SELECT 
          p.id as productId,
          p.name as productName,
          p.sku as barcode,
          c.name as categoryName,
          u.name as unitName,
          p.stock_quantity as closingStock,
          p.cost_price as averageCost,
          0 as lowStockThreshold,
          
          -- Calculate opening stock (current stock + sales - purchases in period)
          ISNULL(p.stock_quantity, 0) + 
          ISNULL((SELECT SUM(si.quantity) 
                  FROM SalesItems si 
                  JOIN Sales s ON si.sales_transaction_id = s.id 
                  WHERE si.product_id = p.id 
                    AND s.store_id = @storeId
                    AND (@dateFrom IS NULL OR s.transaction_date >= @dateFrom)
                    AND (@dateTo IS NULL OR s.transaction_date <= DATEADD(day, 1, @dateTo))
                 ), 0) -
          ISNULL((SELECT SUM(poi.quantity) 
                  FROM PurchaseOrderItems poi 
                  JOIN PurchaseOrders po ON poi.purchase_order_id = po.id 
                  WHERE poi.product_id = p.id 
                    AND po.store_id = @storeId
                    AND (@dateFrom IS NULL OR po.import_date >= @dateFrom)
                    AND (@dateTo IS NULL OR po.import_date <= DATEADD(day, 1, @dateTo))
                 ), 0) as openingStock,
          
          -- Import stock (purchases in period)
          ISNULL((SELECT SUM(poi.quantity) 
                  FROM PurchaseOrderItems poi 
                  JOIN PurchaseOrders po ON poi.purchase_order_id = po.id 
                  WHERE poi.product_id = p.id 
                    AND po.store_id = @storeId
                    AND (@dateFrom IS NULL OR po.import_date >= @dateFrom)
                    AND (@dateTo IS NULL OR po.import_date <= DATEADD(day, 1, @dateTo))
                 ), 0) as importStock,
          
          -- Export stock (sales in period)
          ISNULL((SELECT SUM(si.quantity) 
                  FROM SalesItems si 
                  JOIN Sales s ON si.sales_transaction_id = s.id 
                  WHERE si.product_id = p.id 
                    AND s.store_id = @storeId
                    AND (@dateFrom IS NULL OR s.transaction_date >= @dateFrom)
                    AND (@dateTo IS NULL OR s.transaction_date <= DATEADD(day, 1, @dateTo))
                 ), 0) as exportStock,
          
          -- Check if low stock (always 0 since we don't have threshold column)
          0 as isLowStock
          
         FROM Products p
         LEFT JOIN Categories c ON p.category_id = c.id
         LEFT JOIN Units u ON p.unit_id = u.id
         WHERE p.store_id = @storeId
         ORDER BY p.name
      `);

    console.log(`✅ Query successful! Found ${result.recordset.length} products\n`);
    
    // Show first 5 products
    console.log('📦 Sample data (first 5 products):\n');
    result.recordset.slice(0, 5).forEach((item: any) => {
      console.log(`  ${item.productName}`);
      console.log(`    - ĐVT: ${item.unitName || 'N/A'}`);
      console.log(`    - Tồn đầu kỳ: ${item.openingStock}`);
      console.log(`    - Nhập trong kỳ: ${item.importStock}`);
      console.log(`    - Xuất trong kỳ: ${item.exportStock}`);
      console.log(`    - Tồn cuối kỳ: ${item.closingStock}`);
      console.log('');
    });

    // Calculate totals
    let totalClosing = 0;
    let totalImport = 0;
    result.recordset.forEach((item: any) => {
      totalClosing += Number(item.closingStock) || 0;
      totalImport += Number(item.importStock) || 0;
    });

    console.log('📊 Totals:');
    console.log(`  - Total products: ${result.recordset.length}`);
    console.log(`  - Total import: ${totalImport}`);
    console.log(`  - Total closing stock: ${totalClosing}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
    process.exit(0);
  }
}

testQuery();
