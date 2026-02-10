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

async function checkData() {
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
    console.log(`📍 Store: ${storeResult.recordset[0].name}\n`);

    // Check PurchaseOrders
    const poResult = await pool.request()
      .input('storeId', sql.VarChar, storeId)
      .query(`
        SELECT COUNT(*) as count FROM PurchaseOrders WHERE store_id = @storeId
      `);
    console.log(`PurchaseOrders: ${poResult.recordset[0].count} records`);

    // Check PurchaseOrderItems
    const poiResult = await pool.request()
      .input('storeId', sql.VarChar, storeId)
      .query(`
        SELECT COUNT(*) as count 
        FROM PurchaseOrderItems poi
        JOIN PurchaseOrders po ON poi.purchase_order_id = po.id
        WHERE po.store_id = @storeId
      `);
    console.log(`PurchaseOrderItems: ${poiResult.recordset[0].count} records`);

    // Check Purchases
    const pResult = await pool.request()
      .input('storeId', sql.VarChar, storeId)
      .query(`
        SELECT COUNT(*) as count FROM Purchases WHERE store_id = @storeId
      `);
    console.log(`Purchases: ${pResult.recordset[0].count} records`);

    // Check PurchaseItems
    const piResult = await pool.request()
      .input('storeId', sql.VarChar, storeId)
      .query(`
        SELECT COUNT(*) as count 
        FROM PurchaseItems pi
        JOIN Purchases p ON pi.purchase_id = p.id
        WHERE p.store_id = @storeId
      `);
    console.log(`PurchaseItems: ${piResult.recordset[0].count} records`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
    process.exit(0);
  }
}

checkData();
