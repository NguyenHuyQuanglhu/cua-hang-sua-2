import { query } from '../src/db';

async function checkTransactionsMarch() {
  try {
    console.log('=== Checking transactions for March 2026 ===\n');

    // Check PurchaseOrders
    const purchases = await query(
      `SELECT COUNT(*) as count, SUM(total_amount) as total
       FROM PurchaseOrders
       WHERE import_date >= '2026-03-01' AND import_date < '2026-04-01'`,
      {}
    );
    console.log('Purchase Orders in March 2026:', purchases);

    // Check Payments (customer payments)
    const customerPayments = await query(
      `SELECT COUNT(*) as count, SUM(Amount) as total
       FROM Payments
       WHERE PaymentDate >= '2026-03-01' AND PaymentDate < '2026-04-01'`,
      {}
    );
    console.log('Customer Payments in March 2026:', customerPayments);

    // Check SupplierPayments
    const supplierPayments = await query(
      `SELECT COUNT(*) as count, SUM(amount) as total
       FROM SupplierPayments
       WHERE payment_date >= '2026-03-01' AND payment_date < '2026-04-01'`,
      {}
    );
    console.log('Supplier Payments in March 2026:', supplierPayments);

    // Check Sales
    const sales = await query(
      `SELECT COUNT(*) as count, SUM(final_amount) as total
       FROM Sales
       WHERE transaction_date >= '2026-03-01' AND transaction_date < '2026-04-01'`,
      {}
    );
    console.log('Sales in March 2026:', sales);

    // Check all purchases (any date)
    const allPurchases = await query(
      `SELECT TOP 5 id, invoice_number, import_date, total_amount
       FROM PurchaseOrders
       ORDER BY import_date DESC`,
      {}
    );
    console.log('\nRecent Purchase Orders:', allPurchases);

    // Check all customer payments (any date)
    const allCustomerPayments = await query(
      `SELECT TOP 5 Id, PaymentDate, Amount
       FROM Payments
       ORDER BY PaymentDate DESC`,
      {}
    );
    console.log('\nRecent Customer Payments:', allCustomerPayments);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkTransactionsMarch();
