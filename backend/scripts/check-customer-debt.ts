import { query } from '../src/db';

async function checkCustomerDebt() {
  try {
    console.log('=== Checking customer debt for Huỳnh Ngọc Nghị ===\n');

    // Find customer
    const customers = await query(
      `SELECT id, full_name, phone, total_debt, total_paid, store_id
       FROM Customers
       WHERE full_name LIKE N'%Huỳnh Ngọc Nghị%' OR full_name LIKE N'%Huynh Ngoc Nghi%'`,
      {}
    );

    if (!customers || customers.length === 0) {
      console.log('Customer not found!');
      return;
    }

    const customer = customers[0] as any;
    console.log('Customer found:');
    console.log('- ID:', customer.id);
    console.log('- Name:', customer.full_name);
    console.log('- Phone:', customer.phone);
    console.log('- Total Debt (in Customers table):', customer.total_debt);
    console.log('- Total Paid (in Customers table):', customer.total_paid);
    console.log('- Store ID:', customer.store_id);
    console.log('\n');

    // Check Sales with remaining_debt
    const sales = await query(
      `SELECT id, invoice_number, transaction_date, final_amount, 
              customer_payment, previous_debt, remaining_debt, status, total_amount
       FROM Sales
       WHERE customer_id = @customerId
       ORDER BY transaction_date DESC`,
      { customerId: customer.id }
    );

    console.log(`Found ${sales.length} sales for this customer:\n`);
    
    let totalRemainingDebt = 0;
    sales.forEach((sale: any, index: number) => {
      console.log(`Sale ${index + 1}:`);
      console.log('  - Invoice:', sale.invoice_number);
      console.log('  - Date:', sale.transaction_date);
      console.log('  - Status:', sale.status);
      console.log('  - Total Amount:', sale.total_amount);
      console.log('  - Final Amount:', sale.final_amount);
      console.log('  - Customer Payment:', sale.customer_payment);
      console.log('  - Previous Debt:', sale.previous_debt);
      console.log('  - Remaining Debt:', sale.remaining_debt);
      console.log('');
      
      if (sale.remaining_debt > 0) {
        totalRemainingDebt += sale.remaining_debt;
      }
    });

    console.log('=== Summary ===');
    console.log('Total Remaining Debt from Sales:', totalRemainingDebt);
    console.log('Total Debt in Customers table:', customer.total_debt);
    console.log('\n');

    // Check Payments
    const payments = await query(
      `SELECT id, amount, payment_date, notes, created_at
       FROM Payments
       WHERE customer_id = @customerId
       ORDER BY payment_date DESC`,
      { customerId: customer.id }
    );

    console.log(`Found ${payments.length} payments for this customer:\n`);
    
    let totalPayments = 0;
    payments.forEach((payment: any, index: number) => {
      console.log(`Payment ${index + 1}:`);
      console.log('  - Amount:', payment.amount);
      console.log('  - Date:', payment.payment_date);
      console.log('  - Notes:', payment.notes);
      console.log('');
      totalPayments += payment.amount;
    });

    console.log('Total Payments:', totalPayments);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkCustomerDebt();
