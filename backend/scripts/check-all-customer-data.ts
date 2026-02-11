import 'dotenv/config';
import { query } from '../src/db/query';

async function checkAllCustomerData() {
  try {
    const customerId = '248D545B-EF08-4617-8281-7C2236FC1682';
    const storeId = 'B6E006C7-0115-4C46-9764-6BA61B911964';

    console.log('=== CHECKING ALL CUSTOMER DATA ===');
    console.log('Customer ID:', customerId);
    console.log('Store ID:', storeId);
    console.log('');

    // Get all sales with all statuses
    console.log('1. ALL SALES (all statuses):');
    const allSales = await query(
      `SELECT 
        id, 
        invoice_number,
        transaction_date,
        total_amount,
        final_amount,
        customer_payment,
        status,
        previous_debt,
        remaining_debt
       FROM Sales 
       WHERE customer_id = @customerId AND store_id = @storeId
       ORDER BY transaction_date DESC`,
      { customerId, storeId }
    );
    
    console.log(`Total sales records: ${allSales.length}`);
    let totalSalesAmount = 0;
    let totalCustomerPayment = 0;
    
    allSales.forEach((sale: any) => {
      console.log(`- ${sale.invoice_number} (${sale.transaction_date.toLocaleDateString()}): Amount=${sale.total_amount.toLocaleString()}, Payment=${sale.customer_payment?.toLocaleString() || 0}, Status=${sale.status}, Debt: ${sale.previous_debt} -> ${sale.remaining_debt}`);
      totalSalesAmount += sale.total_amount || 0;
      totalCustomerPayment += sale.customer_payment || 0;
    });
    
    console.log(`\nTotal Sales Amount: ${totalSalesAmount.toLocaleString()}`);
    console.log(`Total Customer Payment in Sales: ${totalCustomerPayment.toLocaleString()}`);
    console.log('');

    // Get all payments
    console.log('2. ALL PAYMENTS:');
    const allPayments = await query(
      `SELECT 
        id,
        payment_date,
        amount,
        payment_method,
        notes,
        created_at
       FROM Payments 
       WHERE customer_id = @customerId AND store_id = @storeId
       ORDER BY payment_date DESC, created_at DESC`,
      { customerId, storeId }
    );
    
    console.log(`Total payment records: ${allPayments.length}`);
    let totalPaymentsAmount = 0;
    
    allPayments.forEach((payment: any, index: number) => {
      console.log(`${index + 1}. ${payment.payment_date.toLocaleDateString()} ${payment.created_at.toLocaleTimeString()}: ${payment.amount.toLocaleString()} (${payment.payment_method}) - ${payment.notes || 'No notes'}`);
      totalPaymentsAmount += payment.amount || 0;
    });
    
    console.log(`\nTotal Payments Amount: ${totalPaymentsAmount.toLocaleString()}`);
    console.log('');

    // Summary
    console.log('3. SUMMARY:');
    console.log(`Total Sales: ${totalSalesAmount.toLocaleString()}`);
    console.log(`Total Payments: ${totalPaymentsAmount.toLocaleString()}`);
    console.log(`Calculated Debt: ${(totalSalesAmount - totalPaymentsAmount).toLocaleString()}`);
    console.log('');
    
    // Get customer record
    const customer = await query(
      `SELECT full_name, total_debt, total_paid FROM Customers WHERE id = @customerId AND store_id = @storeId`,
      { customerId, storeId }
    );
    
    console.log('4. CUSTOMER RECORD IN DB:');
    console.log(`Name: ${customer[0].full_name}`);
    console.log(`Total Debt: ${customer[0].total_debt.toLocaleString()}`);
    console.log(`Total Paid: ${customer[0].total_paid.toLocaleString()}`);
    console.log('');

    // Check what the UI is showing
    console.log('5. EXPECTED UI VALUES:');
    console.log('Based on the screenshot:');
    console.log('- Tổng phát sinh (Total Sales): 13,950,000');
    console.log('- Đã trả (Total Paid): 25,020,000');
    console.log('- Nợ cuối kỳ (Debt): -11,070,000');
    console.log('');
    console.log('⚠️  MISMATCH DETECTED!');
    console.log(`DB shows: ${totalSalesAmount.toLocaleString()} sales vs UI shows: 13,950,000`);
    console.log(`DB shows: ${totalPaymentsAmount.toLocaleString()} paid vs UI shows: 25,020,000`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkAllCustomerData();
