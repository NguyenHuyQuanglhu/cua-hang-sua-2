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

async function checkPurchaseOrderTimes() {
  try {
    await sql.connect(config);
    const storeId = 'B6E006C7-0115-4C46-9764-6BA61B911964';
    
    const result = await sql.query`
      SELECT TOP 5 order_number, import_date, created_at, updated_at 
      FROM PurchaseOrders 
      WHERE store_id = ${storeId}
      ORDER BY updated_at DESC, created_at DESC
    `;
    
    console.log('Top 5 Purchase Orders (by updated_at DESC):');
    result.recordset.forEach((r: any, i: number) => {
      const updated = new Date(r.updated_at).toLocaleString('vi-VN');
      const created = new Date(r.created_at).toLocaleString('vi-VN');
      console.log(`${i+1}. ${r.order_number}`);
      console.log(`   Created: ${created}`);
      console.log(`   Updated: ${updated}`);
      console.log('');
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.close();
  }
}

checkPurchaseOrderTimes();
