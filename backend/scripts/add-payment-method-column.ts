// Simple script to add payment_method column to Payments table
// Run this with: npx tsx scripts/add-payment-method-column.ts

import dotenv from 'dotenv';
dotenv.config();

import sql from 'mssql';

const config: sql.config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'SmartInventory',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function addPaymentMethodColumn() {
  let pool: sql.ConnectionPool | null = null;
  
  try {
    console.log('Connecting to database...');
    console.log('Server:', config.server);
    console.log('Database:', config.database);
    
    pool = await sql.connect(config);
    console.log('✓ Connected to database');
    
    // Check if column exists
    const checkResult = await pool.request().query(`
      SELECT COUNT(*) as count
      FROM sys.columns 
      WHERE object_id = OBJECT_ID('Payments') 
      AND name = 'payment_method'
    `);
    
    if (checkResult.recordset[0].count > 0) {
      console.log('✓ payment_method column already exists');
      return;
    }
    
    console.log('Adding payment_method column...');
    
    // Add column
    await pool.request().query(`
      ALTER TABLE Payments
      ADD payment_method NVARCHAR(20) NULL DEFAULT 'cash'
    `);
    
    console.log('✓ Added payment_method column');
    
    // Update existing records
    await pool.request().query(`
      UPDATE Payments
      SET payment_method = 'cash'
      WHERE payment_method IS NULL
    `);
    
    console.log('✓ Updated existing records');
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
      console.log('Database connection closed');
    }
  }
}

addPaymentMethodColumn()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
