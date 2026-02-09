import { query } from '../src/db';

/**
 * Script to sync existing sales, purchases, and supplier payments to CashTransactions
 */
async function syncCashTransactions() {
  try {
    console.log('Starting cash transactions sync...');

    // 1. Sync sales (thu - income)
    console.log('\n1. Syncing sales to cash transactions...');
    
    const salesResult = await query(`
      INSERT INTO CashTransactions (id, store_id, type, transaction_date, amount, reason, category, related_invoice_id, created_at)
      SELECT 
        NEWID() as id,
        s.store_id,
        'thu' as type,
        s.transaction_date,
        s.customer_payment as amount,
        'Thu tiền bán hàng - ' + s.invoice_number as reason,
        'Bán hàng' as category,
        s.id as related_invoice_id,
        s.created_at
      FROM Sales s
      WHERE s.customer_payment > 0
        AND NOT EXISTS (
          SELECT 1 FROM CashTransactions ct 
          WHERE ct.related_invoice_id = s.id AND ct.type = 'thu'
        )
    `);
    
    console.log(`✓ Synced ${salesResult.rowsAffected?.[0] || 0} sales transactions`);

    // 2. Sync purchase orders (chi - expense)
    console.log('\n2. Syncing purchase orders to cash transactions...');
    
    const purchasesResult = await query(`
      INSERT INTO CashTransactions (id, store_id, type, transaction_date, amount, reason, category, related_invoice_id, created_at)
      SELECT 
        NEWID() as id,
        po.store_id,
        'chi' as type,
        po.import_date as transaction_date,
        po.total_amount as amount,
        'Chi tiền nhập hàng - ' + po.order_number + 
          CASE WHEN s.name IS NOT NULL THEN ' từ ' + s.name ELSE '' END as reason,
        'Nhập hàng' as category,
        po.id as related_invoice_id,
        po.created_at
      FROM PurchaseOrders po
      LEFT JOIN Suppliers s ON po.supplier_id = s.id
      WHERE NOT EXISTS (
        SELECT 1 FROM CashTransactions ct 
        WHERE ct.related_invoice_id = po.id AND ct.type = 'chi' AND ct.category = 'Nhập hàng'
      )
    `);
    
    console.log(`✓ Synced ${purchasesResult.rowsAffected?.[0] || 0} purchase transactions`);

    // 3. Sync supplier payments (chi - expense)
    console.log('\n3. Syncing supplier payments to cash transactions...');
    
    const supplierPaymentsResult = await query(`
      INSERT INTO CashTransactions (id, store_id, type, transaction_date, amount, reason, category, related_invoice_id, created_at)
      SELECT 
        NEWID() as id,
        sp.store_id,
        'chi' as type,
        sp.payment_date as transaction_date,
        sp.amount,
        'Thanh toán cho ' + ISNULL(s.name, 'Nhà cung cấp') + 
          CASE WHEN sp.notes IS NOT NULL THEN ' - ' + sp.notes ELSE '' END as reason,
        'Thanh toán nhà cung cấp' as category,
        sp.id as related_invoice_id,
        sp.created_at
      FROM SupplierPayments sp
      LEFT JOIN Suppliers s ON sp.supplier_id = s.id
      WHERE NOT EXISTS (
        SELECT 1 FROM CashTransactions ct 
        WHERE ct.related_invoice_id = sp.id AND ct.type = 'chi' AND ct.category = 'Thanh toán nhà cung cấp'
      )
    `);
    
    console.log(`✓ Synced ${supplierPaymentsResult.rowsAffected?.[0] || 0} supplier payment transactions`);

    // 4. Show summary
    console.log('\n=== Summary ===');
    const summary = await query<{ type: string; category: string; count: number; total: number }>(`
      SELECT 
        type,
        category,
        COUNT(*) as count,
        SUM(amount) as total
      FROM CashTransactions
      GROUP BY type, category
      ORDER BY type, category
    `);

    console.log('\nCash Transactions by Category:');
    summary.forEach(row => {
      console.log(`  ${row.type === 'thu' ? '📈 THU' : '📉 CHI'} - ${row.category}: ${row.count} giao dịch, ${row.total.toLocaleString('vi-VN')} ₫`);
    });

    const totals = await query<{ totalIncome: number; totalExpense: number }>(`
      SELECT 
        ISNULL(SUM(CASE WHEN type = 'thu' THEN amount ELSE 0 END), 0) as totalIncome,
        ISNULL(SUM(CASE WHEN type = 'chi' THEN amount ELSE 0 END), 0) as totalExpense
      FROM CashTransactions
    `);

    if (totals.length > 0) {
      const { totalIncome, totalExpense } = totals[0];
      const balance = totalIncome - totalExpense;
      console.log('\n=== Tổng kết ===');
      console.log(`📈 Tổng thu: ${totalIncome.toLocaleString('vi-VN')} ₫`);
      console.log(`📉 Tổng chi: ${totalExpense.toLocaleString('vi-VN')} ₫`);
      console.log(`💰 Số dư: ${balance.toLocaleString('vi-VN')} ₫`);
    }

    console.log('\n✓ Sync complete!');

  } catch (error) {
    console.error('Error syncing cash transactions:', error);
    throw error;
  }
}

// Run the script
syncCashTransactions()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nFailed:', error);
    process.exit(1);
  });
