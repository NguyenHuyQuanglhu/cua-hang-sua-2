import sql from 'mssql';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

const config: sql.config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'MilkStoreDB',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

async function checkSalesStatus() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('Connected!\n');

    // Check distinct status values in Sales table
    const result = await pool.request().query(`
      SELECT DISTINCT status, COUNT(*) as count
      FROM Sales
      GROUP BY status
      ORDER BY count DESC
    `);

    console.log('📊 Các giá trị status trong bảng Sales:\n');
    result.recordset.forEach((row: any) => {
      console.log(`  - "${row.status}": ${row.count} đơn`);
    });

    // Check if there are any NULL status
    const nullCheck = await pool.request().query(`
      SELECT COUNT(*) as count
      FROM Sales
      WHERE status IS NULL
    `);

    if (nullCheck.recordset[0].count > 0) {
      console.log(`\n⚠ Có ${nullCheck.recordset[0].count} đơn có status = NULL`);
    }

    console.log('\n💡 StatusBadge chỉ hỗ trợ: "pending" và "processed"');
    console.log('   Cần cập nhật các status khác về 2 giá trị này.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\nDatabase connection closed.');
    }
  }
}

checkSalesStatus();
