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

async function checkPaymentStatus() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('Connected successfully!\n');

    // Check SupplierPayments table
    console.log('=== SupplierPayments Table ===');
    const paymentsResult = await pool.request().query(`
      SELECT TOP 10
        sp.id,
        sp.supplier_id,
        s.name as supplier_name,
        sp.amount,
        sp.payment_date,
        sp.created_at
      FROM SupplierPayments sp
      LEFT JOIN Suppliers s ON sp.supplier_id = s.id
      ORDER BY sp.created_at DESC
    `);

    if (paymentsResult.recordset.length === 0) {
      console.log('No payments found in SupplierPayments table\n');
    } else {
      console.log(`Found ${paymentsResult.recordset.length} recent payments:\n`);
      for (const payment of paymentsResult.recordset) {
        console.log(`  - ${payment.supplier_name}: ${payment.amount.toLocaleString('vi-VN')} VNĐ`);
        console.log(`    Date: ${new Date(payment.created_at).toLocaleString('vi-VN')}`);
        console.log(`    Supplier ID: ${payment.supplier_id}\n`);
      }
    }

    // Check PurchaseOrders payment status
    console.log('\n=== PurchaseOrders Payment Status ===');
    const purchasesResult = await pool.request().query(`
      SELECT TOP 20
        po.id,
        po.order_number,
        s.name as supplier_name,
        po.total_amount,
        po.paid_amount,
        po.remaining_debt,
        po.payment_status,
        po.updated_at
      FROM PurchaseOrders po
      LEFT JOIN Suppliers s ON po.supplier_id = s.id
      ORDER BY po.updated_at DESC
    `);

    console.log(`\nRecent purchase orders:\n`);
    for (const po of purchasesResult.recordset) {
      console.log(`  ${po.order_number} - ${po.supplier_name}`);
      console.log(`    Total: ${po.total_amount.toLocaleString('vi-VN')} VNĐ`);
      console.log(`    Paid: ${po.paid_amount.toLocaleString('vi-VN')} VNĐ`);
      console.log(`    Debt: ${po.remaining_debt.toLocaleString('vi-VN')} VNĐ`);
      console.log(`    Status: ${po.payment_status}`);
      console.log(`    Updated: ${new Date(po.updated_at).toLocaleString('vi-VN')}\n`);
    }

    console.log('✅ Check completed!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

checkPaymentStatus();
