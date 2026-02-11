import 'dotenv/config';
import { query } from '../src/db/query';

async function recalculateCustomerDebt() {
  try {
    const customerId = '248D545B-EF08-4617-8281-7C2236FC1682';
    const storeId = 'B6E006C7-0115-4C46-9764-6BA61B911964';

    console.log('=== RECALCULATING CUSTOMER DEBT ===');
    console.log('Customer ID:', customerId);
    console.log('Store ID:', storeId);
    console.log('');

    // Calculate using the corrected method (same as API)
    const sales = await query(
      `SELECT 
        SUM(final_amount) as totalSales,
        SUM(customer_payment) as customerPayment
       FROM Sales 
       WHERE customer_id = @customerId AND store_id = @storeId`,
      { customerId, storeId }
    );

    const payments = await query(
      `SELECT SUM(amount) as totalPayments
       FROM Payments 
       WHERE customer_id = @customerId AND store_id = @storeId`,
      { customerId, storeId }
    );

    const totalSales = sales[0]?.totalSales || 0;
    const customerPayment = sales[0]?.customerPayment || 0;
    const totalPayments = payments[0]?.totalPayments || 0;
    
    const totalPaid = customerPayment + totalPayments;
    const correctDebt = totalSales - customerPayment - totalPayments;

    console.log('Calculation:');
    console.log(`- Total Sales (final_amount): ${totalSales.toLocaleString()}`);
    console.log(`- Customer Payment (in Sales): ${customerPayment.toLocaleString()}`);
    console.log(`- Additional Payments: ${totalPayments.toLocaleString()}`);
    console.log(`- Total Paid: ${totalPaid.toLocaleString()}`);
    console.log(`- Correct Debt: ${correctDebt.toLocaleString()}`);
    console.log('');

    if (correctDebt < 0) {
      console.log(`✅ Customer has EXCESS PAYMENT: ${Math.abs(correctDebt).toLocaleString()}`);
    } else if (correctDebt > 0) {
      console.log(`⚠️  Customer has DEBT: ${correctDebt.toLocaleString()}`);
    } else {
      console.log(`✅ Customer balance is ZERO`);
    }
    console.log('');

    // Update customer record
    console.log('Updating customer record...');
    await query(
      `UPDATE Customers 
       SET total_debt = @totalDebt,
           total_paid = @totalPaid,
           updated_at = GETDATE()
       WHERE id = @customerId AND store_id = @storeId`,
      { 
        customerId, 
        storeId,
        totalDebt: correctDebt,
        totalPaid: totalPaid
      }
    );

    console.log('✅ Customer record updated successfully!');
    console.log('');

    // Verify
    const customer = await query(
      `SELECT full_name, total_debt, total_paid FROM Customers WHERE id = @customerId AND store_id = @storeId`,
      { customerId, storeId }
    );

    console.log('Updated customer data:');
    console.log(`- Name: ${customer[0].full_name}`);
    console.log(`- Total Debt: ${customer[0].total_debt.toLocaleString()}`);
    console.log(`- Total Paid: ${customer[0].total_paid.toLocaleString()}`);
    console.log('');

    if (customer[0].total_debt < 0) {
      console.log(`🎉 Customer can now receive refund of: ${Math.abs(customer[0].total_debt).toLocaleString()}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

recalculateCustomerDebt();
