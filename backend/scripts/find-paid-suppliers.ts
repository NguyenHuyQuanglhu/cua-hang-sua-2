import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'SmartInventory',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
  },
};

async function findPaidSuppliers() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('Connected successfully!\n');

    const storeId = 'B6E006C7-0115-4C46-9764-6BA61B911964';

    // Get all suppliers with their debt status
    const result = await pool.request()
      .input('storeId', sql.UniqueIdentifier, storeId)
      .query(`
        SELECT 
          s.id,
          s.name,
          s.phone,
          SUM(po.total_amount) as total_purchases,
          SUM(po.paid_amount) as total_paid,
          SUM(po.remaining_debt) as total_debt
        FROM Suppliers s
        LEFT JOIN PurchaseOrders po ON s.id = po.supplier_id AND po.store_id = @storeId
        GROUP BY s.id, s.name, s.phone
        HAVING SUM(po.total_amount) > 0
        ORDER BY total_debt ASC
      `);

    console.log('=== All Suppliers with Purchases ===\n');
    
    let fullyPaidCount = 0;
    let partiallyPaidCount = 0;
    let unpaidCount = 0;

    for (const supplier of result.recordset) {
      const totalPurchases = supplier.total_purchases || 0;
      const totalPaid = supplier.total_paid || 0;
      const totalDebt = supplier.total_debt || 0;
      
      let status = '';
      if (totalDebt === 0) {
        status = '✅ ĐÃ THANH TOÁN HẾT';
        fullyPaidCount++;
      } else if (totalPaid > 0) {
        status = '🟡 THANH TOÁN MỘT PHẦN';
        partiallyPaidCount++;
      } else {
        status = '❌ CHƯA THANH TOÁN';
        unpaidCount++;
      }

      console.log(`${supplier.name} (${supplier.phone || 'No phone'})`);
      console.log(`  Tổng nhập: ${totalPurchases.toLocaleString('vi-VN')} VNĐ`);
      console.log(`  Đã trả: ${totalPaid.toLocaleString('vi-VN')} VNĐ`);
      console.log(`  Còn nợ: ${totalDebt.toLocaleString('vi-VN')} VNĐ`);
      console.log(`  ${status}\n`);
    }

    console.log('=== SUMMARY ===');
    console.log(`Đã thanh toán hết: ${fullyPaidCount}`);
    console.log(`Thanh toán một phần: ${partiallyPaidCount}`);
    console.log(`Chưa thanh toán: ${unpaidCount}`);
    console.log(`Tổng: ${result.recordset.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

findPaidSuppliers();
