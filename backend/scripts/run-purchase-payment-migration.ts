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

async function runMigration() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('Connected successfully!\n');

    console.log('Running migration: add-purchase-payment-columns\n');

    // Step 1: Add paid_amount column
    console.log('Step 1: Adding paid_amount column...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'PurchaseOrders') AND name = 'paid_amount')
      BEGIN
          ALTER TABLE PurchaseOrders ADD paid_amount DECIMAL(18, 2) NOT NULL DEFAULT 0;
          PRINT 'Added paid_amount column';
      END
      ELSE
      BEGIN
          PRINT 'paid_amount column already exists';
      END
    `);
    console.log('✓ paid_amount column added\n');

    // Step 2: Add remaining_debt column (nullable first)
    console.log('Step 2: Adding remaining_debt column...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'PurchaseOrders') AND name = 'remaining_debt')
      BEGIN
          ALTER TABLE PurchaseOrders ADD remaining_debt DECIMAL(18, 2) NULL;
          PRINT 'Added remaining_debt column';
      END
      ELSE
      BEGIN
          PRINT 'remaining_debt column already exists';
      END
    `);
    console.log('✓ remaining_debt column added\n');

    // Step 3: Initialize remaining_debt values
    console.log('Step 3: Initializing remaining_debt values...');
    const updateResult = await pool.request().query(`
      UPDATE PurchaseOrders SET remaining_debt = total_amount WHERE remaining_debt IS NULL
    `);
    console.log(`✓ Updated ${updateResult.rowsAffected[0]} rows\n`);

    // Step 4: Make remaining_debt NOT NULL
    console.log('Step 4: Setting remaining_debt to NOT NULL...');
    await pool.request().query(`
      ALTER TABLE PurchaseOrders ALTER COLUMN remaining_debt DECIMAL(18, 2) NOT NULL
    `);
    console.log('✓ remaining_debt set to NOT NULL\n');

    // Step 5: Add payment_status column
    console.log('Step 5: Adding payment_status column...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'PurchaseOrders') AND name = 'payment_status')
      BEGIN
          ALTER TABLE PurchaseOrders ADD payment_status NVARCHAR(20) NOT NULL DEFAULT 'unpaid';
          PRINT 'Added payment_status column';
      END
      ELSE
      BEGIN
          PRINT 'payment_status column already exists';
      END
    `);
    console.log('✓ payment_status column added\n');

    console.log('✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

runMigration();
