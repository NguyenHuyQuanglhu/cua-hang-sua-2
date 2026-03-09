import { query } from '../src/db';

async function clearAllCustomerDebts() {
  try {
    console.log('=== Clearing all customer debts ===\n');

    // 1. Clear all remaining_debt in Sales table
    console.log('Step 1: Clearing remaining_debt in Sales table...');
    const salesResult = await query(
      `UPDATE Sales
       SET remaining_debt = 0,
           updated_at = GETDATE()
       WHERE remaining_debt > 0`,
      {}
    );
    console.log('✓ Sales table updated\n');

    // 2. Clear all debt in Customers table
    console.log('Step 2: Clearing total_debt in Customers table...');
    const customersResult = await query(
      `UPDATE Customers
       SET total_debt = 0,
           updated_at = GETDATE()
       WHERE total_debt > 0 OR total_debt < 0`,
      {}
    );
    console.log('✓ Customers table updated\n');

    // 3. Verify the changes
    console.log('Step 3: Verifying changes...');
    
    const salesCheck = await query(
      `SELECT COUNT(*) as count FROM Sales WHERE remaining_debt > 0`,
      {}
    ) as any[];
    
    const customersCheck = await query(
      `SELECT COUNT(*) as count FROM Customers WHERE total_debt != 0`,
      {}
    ) as any[];

    console.log('Sales with remaining debt:', salesCheck[0]?.count || 0);
    console.log('Customers with debt:', customersCheck[0]?.count || 0);

    if ((salesCheck[0]?.count || 0) === 0 && (customersCheck[0]?.count || 0) === 0) {
      console.log('\n✓ SUCCESS: All customer debts have been cleared!');
    } else {
      console.log('\n✗ WARNING: Some debts may still remain. Please check manually.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

clearAllCustomerDebts();
