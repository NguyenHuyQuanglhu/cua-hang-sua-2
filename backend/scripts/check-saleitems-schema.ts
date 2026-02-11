import { query } from '../src/db';

async function checkSchema() {
  try {
    console.log('Checking SaleItems schema...');
    
    const result = await query(`
      SELECT TOP 1 * FROM SaleItems
    `, {});
    
    if (result.length > 0) {
      console.log('SaleItems columns:', Object.keys(result[0]));
      console.log('Sample data:', result[0]);
    }
    
    console.log('\nChecking Sales schema...');
    const salesResult = await query(`
      SELECT TOP 1 * FROM Sales
    `, {});
    
    if (salesResult.length > 0) {
      console.log('Sales columns:', Object.keys(salesResult[0]));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSchema();
