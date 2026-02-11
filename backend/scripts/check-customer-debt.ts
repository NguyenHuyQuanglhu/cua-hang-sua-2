import 'dotenv/config';
import { query } from '../src/db/query';

async function checkCustomerDebt() {
  try {
    const customerId = '248D545B-EF08-4617-8281-7C2236FC1682';
    const storeId = 'B6E006C7-0115-4C46-9764-6BA61B911964';

    console.log('=== CHECKING CUSTOMER DEBT ===');
    console.log('Customer ID:', customerId);
    console.log('Store ID:', storeId);
    console.log('');

    // Get customer info
    console.log('1. Customer Info:');
    const customer = await query(
      `SELECT * FROM Customers WHERE id = @customerId AND store_id = @storeId`,
      { customerId, storeId }
    );
    console.log(customer[0]);
    console.log('');

    // Get all sales for this customer
    console.log('2. Sales History:');
    const sales = await query(
      `SELECT TOP 1 * FROM Sales WHERE customer_id = @customerId AND store_id = @storeId`,
      { customerId, storeId }
    );
    console.log('Sample sale record:', sales[0]);
    
    const allSales = await query(
      `SELECT 
        id, 
        transaction_date,
        total_amount,
        status
       FROM Sales 
       WHERE customer_id = @customerId AND store_id = @storeId
       ORDER BY transaction_date DESC`,
      { customerId, storeId }
    );
    console.log(`Total sales: ${allSales.length}`);
    allSales.forEach((sale: any) => {
      console.log(`- ${sale.transaction_date}: Total=${sale.total_amount}, Status=${sale.status}`);
    });
    console.log('');

    // Get all payments for this customer
    console.log('3. Payment History:');
    const paymentSample = await query(
      `SELECT TOP 1 * FROM Payments WHERE customer_id = @customerId AND store_id = @storeId`,
      { customerId, storeId }
    );
    console.log('Sample payment record:', paymentSample[0]);
    
    const payments = await query(
      `SELECT 
        id,
        payment_date,
        amount,
        payment_method,
        notes
       FROM Payments 
       WHERE customer_id = @customerId AND store_id = @storeId
       ORDER BY payment_date DESC`,
      { customerId, storeId }
    );
    console.log(`Total payments: ${payments.length}`);
    payments.forEach((payment: any) => {
      console.log(`- ${payment.payment_date}: ${payment.amount.toLocaleString()} (${payment.payment_method}) - ${payment.notes || 'No notes'}`);
    });
    console.log('');

    // Calculate totals
    console.log('4. Calculation:');
    const totalSales = allSales.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0);
    const totalPaid = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    
    console.log(`Total Sales: ${totalSales.toLocaleString()}`);
    console.log(`Total Paid: ${totalPaid.toLocaleString()}`);
    console.log(`Calculated Debt: ${(totalSales - totalPaid).toLocaleString()}`);
    console.log(`DB Debt (total_debt): ${customer[0]?.total_debt?.toLocaleString() || 'N/A'}`);
    console.log(`DB Total Paid (total_paid): ${customer[0]?.total_paid?.toLocaleString() || 'N/A'}`);
    console.log('');

    // Check if there's a mismatch
    const calculatedDebt = totalSales - totalPaid;
    const dbDebt = customer[0]?.total_debt || 0;
    
    if (Math.abs(calculatedDebt - dbDebt) > 0.01) {
      console.log('⚠️  MISMATCH DETECTED!');
      console.log(`Difference: ${(calculatedDebt - dbDebt).toLocaleString()}`);
    } else {
      console.log('✅ Debt calculation matches DB');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkCustomerDebt();
