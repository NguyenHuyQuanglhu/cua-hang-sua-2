import sql from 'mssql';

const config = {
  server: '118.69.126.49',
  database: 'Data_QuanLyBanHang_Online',
  user: 'userquanlybanhangonline',
  password: '123456789',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function checkLatestOrders() {
  try {
    await sql.connect(config);
    const storeId = 'B6E006C7-0115-4C46-9764-6BA61B911964';
    
    const result = await sql.query`
      SELECT TOP 10 
        po.order_number, 
        po.created_at, 
        po.updated_at,
        p.name as product_name
      FROM PurchaseOrders po
      LEFT JOIN PurchaseOrderItems poi ON po.id = poi.purchase_order_id
      LEFT JOIN Products p ON poi.product_id = p.id
      WHERE po.store_id = ${storeId}
      ORDER BY po.updated_at DESC, po.created_at DESC
    `;
    
    console.log('Top 10 Purchase Orders (by updated_at DESC):');
    console.log('');
    
    result.recordset.forEach((r: any, i: number) => {
      const created = new Date(r.created_at);
      const updated = new Date(r.updated_at);
      const createdStr = created.toLocaleString('vi-VN', { 
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        day: '2-digit', month: '2-digit'
      });
      const updatedStr = updated.toLocaleString('vi-VN', { 
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        day: '2-digit', month: '2-digit'
      });
      
      const wasUpdated = updated.getTime() > created.getTime() + 1000;
      const updateFlag = wasUpdated ? ' 🔄 UPDATED' : '';
      
      console.log(`${i + 1}. ${r.order_number} - ${r.product_name || 'N/A'}${updateFlag}`);
      console.log(`   Created: ${createdStr}`);
      console.log(`   Updated: ${updatedStr}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.close();
  }
}

checkLatestOrders();
