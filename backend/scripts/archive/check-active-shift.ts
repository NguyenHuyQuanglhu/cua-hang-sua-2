import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'SmartInventory',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
  },
};

async function checkActiveShift() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('Connected successfully!');

    // Check for active shifts
    const result = await pool.request().query(`
      SELECT * FROM Shifts WHERE status = 'open' ORDER BY start_time DESC
    `);

    console.log(`\nFound ${result.recordset.length} open shifts:`);
    result.recordset.forEach((shift: any) => {
      console.log('\n---');
      console.log('ID:', shift.id);
      console.log('User:', shift.user_name);
      console.log('Status:', shift.status);
      console.log('Start Time:', shift.start_time);
      console.log('Starting Cash:', shift.starting_cash);
      console.log('Cash Sales:', shift.cash_sales);
      console.log('Cash Payments:', shift.cash_payments);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

checkActiveShift();
