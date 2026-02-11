import 'dotenv/config';
import { query } from '../src/db/query';

async function fixCustomerDebt() {
  try {
    const customerId = '248D545B-EF08-4617-8281-7C2236FC1682';
    const storeId = 'B6E006C7-0115-4C46-9764-6BA61B911964';

    console.log('=== FIXING CUSTOMER DEBT ===');
    console.log('Customer ID:', customerId);
    console.log('Store ID:', storeId);
    console.log('');

    // Get current customer info
    const customer = await query(
      `SELECT full_name, total_debt, total_paid FROM Customers WHERE id = @customerId AND store_id = @storeId`,
      { customerId, storeId }
    );
    
    console.log('Current customer data:');
    console.log(`- Name: ${customer[0].full_name}`);
    console.log(`- Total Debt (DB): ${customer[0].total_debt.toLocaleString()}`);
    console.log(`- Total Paid (DB): ${customer[0].total_paid.toLocaleString()}`);
    console.log('');

    // Calculate correct values
    const sales = await query(
      `SELECT SUM(total_amount) as totalSales FROM Sales 
       WHERE customer_id = @customerId AND store_id = @storeId`,
      { customerId, storeId }
    );

    const payments = await query(
      `SELECT SUM(amount) as totalPayments FROM Payments 
       WHERE customer_id = @customerId AND store_id = @storeId`,
      { customerId, storeId }
    );

    const totalSales = sales[0]?.totalSales || 0;
    const totalPayments = payments[0]?.totalPayments || 0;
    const correctDebt = totalSales - totalPayments;

    console.log('Calculated correct values:');
    console.log(`- Total Sales: ${totalSales.toLocaleString()}`);
    console.log(`- Total Payments: ${totalPayments.toLocaleString()}`);
    console.log(`- Correct Debt: ${correctDebt.toLocaleString()}`);
    console.log('');

    if (correctDebt < 0) {
      console.log(`✅ Customer has EXCESS PAYMENT (overpaid): ${Math.abs(correctDebt).toLocaleString()}`);
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
        totalPaid: totalPayments
      }
    );

    console.log('✅ Customer record updated successfully!');
    console.log('');

    // Verify update
    const updatedCustomer = await query(
      `SELECT full_name, total_debt, total_paid FROM Customers WHERE id = @customerId AND store_id = @storeId`,
      { customerId, storeId }
    );

    console.log('Updated customer data:');
    console.log(`- Name: ${updatedCustomer[0].full_name}`);
    console.log(`- Total Debt: ${updatedCustomer[0].total_debt.toLocaleString()}`);
    console.log(`- Total Paid: ${updatedCustomer[0].total_paid.toLocaleString()}`);
    console.log('');

    if (updatedCustomer[0].total_debt < 0) {
      console.log(`🎉 Customer can now receive refund of: ${Math.abs(updatedCustomer[0].total_debt).toLocaleString()}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

fixCustomerDebt();
