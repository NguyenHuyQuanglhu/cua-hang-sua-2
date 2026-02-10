import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });
import { getConnection } from '../src/db/connection';

async function getLatestSale() {
  const pool = await getConnection();
  const result = await pool.request().query(`
    SELECT TOP 1 id, invoice_number 
    FROM Sales 
    ORDER BY transaction_date DESC
  `);
  
  if (result.recordset.length > 0) {
    const sale = result.recordset[0];
    console.log(`Latest Sale ID: ${sale.id}`);
    console.log(`Invoice: ${sale.invoice_number}`);
    console.log(`\nTest URL: http://localhost:3000/sales/${sale.id}?print=true`);
  }
  process.exit(0);
}

getLatestSale().catch(console.error);
