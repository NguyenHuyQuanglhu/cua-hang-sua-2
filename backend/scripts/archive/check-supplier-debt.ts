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

async function checkSupplierDebt() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('Connected successfully!\n');

    // Get all suppliers
    const suppliersResult = await pool.request().query(`
      SELECT id, name, phone FROM Suppliers
    `);

    console.log(`Found ${suppliersResult.recordset.length} active suppliers\n`);

    for (const supplier of suppliersResult.recordset) {
      console.log(`\n=== ${supplier.name} (${supplier.phone || 'No phone'}) ===`);

      // Get purchase orders for this supplier
      const purchasesResult = await pool.request()
        .input('supplierId', sql.NVarChar, supplier.id)
        .query(`
          SELECT 
            id,
            invoice_number,
            total_amount,
            paid_amount,
            remaining_debt,
            status
          FROM PurchaseOrders
          WHERE supplier_id = @supplierId
          ORDER BY created_at DESC
        `);

      if (purchasesResult.recordset.length === 0) {
        console.log('  No purchase orders found');
        continue;
      }

      console.log(`  Found ${purchasesResult.recordset.length} purchase orders:`);
      
      let totalPurchases = 0;
      let totalPaid = 0;
      let totalDebt = 0;

      for (const po of purchasesResult.recordset) {
        totalPurchases += po.total_amount || 0;
        totalPaid += po.paid_amount || 0;
        totalDebt += po.remaining_debt || 0;

        console.log(`    - ${po.invoice_number}: Total=${po.total_amount}, Paid=${po.paid_amount}, Debt=${po.remaining_debt}, Status=${po.status}`);
      }

      console.log(`\n  SUMMARY:`);
      console.log(`    Total Purchases: ${totalPurchases.toLocaleString('vi-VN')} VNĐ`);
      console.log(`    Total Paid: ${totalPaid.toLocaleString('vi-VN')} VNĐ`);
      console.log(`    Total Debt: ${totalDebt.toLocaleString('vi-VN')} VNĐ`);

      // Check supplier payments
      const paymentsResult = await pool.request()
        .input('supplierId', sql.NVarChar, supplier.id)
        .query(`
          SELECT 
            id,
            amount,
            payment_date,
            notes
          FROM SupplierPayments
          WHERE supplier_id = @supplierId
          ORDER BY payment_date DESC
        `);

      if (paymentsResult.recordset.length > 0) {
        console.log(`\n  Payments recorded in SupplierPayments table:`);
        for (const payment of paymentsResult.recordset) {
          console.log(`    - ${new Date(payment.payment_date).toLocaleDateString('vi-VN')}: ${payment.amount.toLocaleString('vi-VN')} VNĐ - ${payment.notes || 'No notes'}`);
        }
      } else {
        console.log(`\n  No payments recorded in SupplierPayments table`);
      }
    }

    console.log('\n✅ Check completed!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

checkSupplierDebt();
