import 'dotenv/config';
import { query } from '../src/db/query';

async function checkDashboardData() {
  try {
    const storeId = 'B6E006C7-0115-4C46-9764-6BA61B911964';

    console.log('=== CHECKING DASHBOARD DATA ===');
    console.log('Store ID:', storeId);
    console.log('');

    // Check Sales
    console.log('1. SALES DATA:');
    const sales = await query(
      `SELECT COUNT(*) as count, SUM(final_amount) as total
       FROM Sales 
       WHERE store_id = @storeId AND status IN ('pending', 'printed')`,
      { storeId }
    );
    console.log(`Total Sales: ${sales[0].count}`);
    console.log(`Total Revenue: ${sales[0].total?.toLocaleString() || 0}`);
    console.log('');

    // Check Products
    console.log('2. PRODUCTS DATA:');
    const products = await query(
      `SELECT COUNT(*) as count
       FROM Products 
       WHERE store_id = @storeId AND status = 'active'`,
      { storeId }
    );
    console.log(`Total Products: ${products[0].count}`);
    console.log('');

    // Check Inventory
    console.log('3. INVENTORY DATA:');
    const inventory = await query(
      `SELECT COUNT(*) as count, SUM(quantity) as totalQty
       FROM ProductInventory pi
       JOIN Products p ON pi.product_id = p.id
       WHERE p.store_id = @storeId`,
      { storeId }
    );
    console.log(`Total Inventory Records: ${inventory[0].count}`);
    console.log(`Total Quantity: ${inventory[0].totalQty || 0}`);
    console.log('');

    // Check Customers
    console.log('4. CUSTOMERS DATA:');
    const customers = await query(
      `SELECT COUNT(*) as count, SUM(total_debt) as totalDebt
       FROM Customers 
       WHERE store_id = @storeId AND status = 'active'`,
      { storeId }
    );
    console.log(`Total Customers: ${customers[0].count}`);
    console.log(`Total Debt: ${customers[0].totalDebt?.toLocaleString() || 0}`);
    console.log('');

    // Check recent sales
    console.log('5. RECENT SALES (Last 5):');
    const recentSales = await query(
      `SELECT TOP 5 
        invoice_number, 
        transaction_date, 
        final_amount, 
        status
       FROM Sales 
       WHERE store_id = @storeId
       ORDER BY transaction_date DESC`,
      { storeId }
    );
    recentSales.forEach((sale: any) => {
      console.log(`- ${sale.invoice_number}: ${sale.final_amount.toLocaleString()} (${sale.status}) - ${sale.transaction_date}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkDashboardData();
