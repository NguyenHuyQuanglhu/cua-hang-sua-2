import dotenv from 'dotenv';
import { query } from '../src/db';

dotenv.config();

async function testRefund() {
  try {
    console.log('Testing refund functionality...\n');

    // 1. Check if Customers table has the right columns
    console.log('1. Checking Customers table structure...');
    const columns = await query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Customers' 
      AND COLUMN_NAME IN ('name', 'full_name', 'totalDebt', 'total_debt')
      ORDER BY COLUMN_NAME
    `);
    
    console.log('Columns found:');
    columns.forEach((col: any) => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });

    // 2. Check if Payments table exists
    console.log('\n2. Checking Payments table...');
    const paymentsTable = await query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'Payments'
    `);
    console.log(`Payments table exists: ${paymentsTable[0].count > 0 ? 'YES' : 'NO'}`);

    // 3. Find a customer with negative debt (if any)
    console.log('\n3. Looking for customers with negative debt...');
    const customersWithNegativeDebt = await query(`
      SELECT TOP 5 
        id, 
        name,
        totalDebt,
        phone
      FROM Customers 
      WHERE totalDebt < 0
      ORDER BY totalDebt ASC
    `);

    if (customersWithNegativeDebt.length > 0) {
      console.log('Found customers with negative debt:');
      customersWithNegativeDebt.forEach((c: any) => {
        console.log(`  - ${c.name}: ${c.totalDebt} (ID: ${c.id})`);
      });
    } else {
      console.log('No customers with negative debt found.');
    }

    // 4. Check CashTransactions table
    console.log('\n4. Checking CashTransactions table...');
    const cashTable = await query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'CashTransactions'
    `);
    console.log(`CashTransactions table exists: ${cashTable[0].count > 0 ? 'YES' : 'NO'}`);

    console.log('\n✅ Test completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Restart backend: npm run dev');
    console.log('2. Test refund API from frontend');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  process.exit(0);
}

testRefund();
