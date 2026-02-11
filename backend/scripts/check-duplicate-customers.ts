import 'dotenv/config';
import { query } from '../src/db/query';

async function checkDuplicateCustomers() {
  try {
    const storeId = 'B6E006C7-0115-4C46-9764-6BA61B911964';

    console.log('=== CHECKING FOR DUPLICATE CUSTOMERS ===');
    console.log('Store ID:', storeId);
    console.log('');

    // Find all customers with name "Nguyễn Đình Phát"
    const customers = await query(
      `SELECT id, full_name, phone, email, total_debt, total_paid, created_at
       FROM Customers 
       WHERE store_id = @storeId AND full_name LIKE N'%Nguyễn Đình Phát%'
       ORDER BY created_at`,
      { storeId }
    );

    console.log(`Found ${customers.length} customer(s) with name containing "Nguyễn Đình Phát":`);
    console.log('');

    for (const customer of customers) {
      console.log(`Customer ID: ${customer.id}`);
      console.log(`  Name: ${customer.full_name}`);
      console.log(`  Phone: ${customer.phone}`);
      console.log(`  Email: ${customer.email || 'N/A'}`);
      console.log(`  Total Debt: ${customer.total_debt?.toLocaleString() || 0}`);
      console.log(`  Total Paid: ${customer.total_paid?.toLocaleString() || 0}`);
      console.log(`  Created: ${customer.created_at}`);
      
      // Get sales for this customer
      const sales = await query(
        `SELECT COUNT(*) as count, SUM(final_amount) as total
         FROM Sales WHERE customer_id = @customerId AND store_id = @storeId`,
        { customerId: customer.id, storeId }
      );
      
      // Get payments for this customer
      const payments = await query(
        `SELECT COUNT(*) as count, SUM(amount) as total
         FROM Payments WHERE customer_id = @customerId AND store_id = @storeId`,
        { customerId: customer.id, storeId }
      );
      
      console.log(`  Sales: ${sales[0].count} transactions, Total: ${sales[0].total?.toLocaleString() || 0}`);
      console.log(`  Payments: ${payments[0].count} records, Total: ${payments[0].total?.toLocaleString() || 0}`);
      console.log('');
    }

    // Now run the same query as the API endpoint
    console.log('=== RUNNING API QUERY ===');
    const apiResult = await query(
      `SELECT 
        c.id, 
        c.full_name as name, 
        c.phone, 
        c.email,
        ISNULL(SUM(s.final_amount), 0) as totalSales,
        ISNULL(SUM(s.customer_payment), 0) + ISNULL(SUM(p.amount), 0) as totalPayments,
        ISNULL(SUM(s.final_amount), 0) - ISNULL(SUM(s.customer_payment), 0) - ISNULL(SUM(p.amount), 0) as totalDebt,
        COUNT(DISTINCT s.id) as transactionCount
       FROM Customers c
       LEFT JOIN Sales s ON c.id = s.customer_id AND s.store_id = @storeId
       LEFT JOIN Payments p ON c.id = p.customer_id AND p.store_id = @storeId
       WHERE c.store_id = @storeId AND c.full_name LIKE N'%Nguyễn Đình Phát%'
       GROUP BY c.id, c.full_name, c.phone, c.email
       ORDER BY totalDebt DESC`,
      { storeId }
    );

    console.log('API Query Results:');
    apiResult.forEach((row: any) => {
      console.log(`- ${row.name} (${row.phone}): Sales=${row.totalSales.toLocaleString()}, Payments=${row.totalPayments.toLocaleString()}, Debt=${row.totalDebt.toLocaleString()}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkDuplicateCustomers();
