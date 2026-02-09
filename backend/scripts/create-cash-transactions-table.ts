import { query } from '../src/db';

/**
 * Script to create CashTransactions table if it doesn't exist
 */
async function createCashTransactionsTable() {
  try {
    console.log('Checking if CashTransactions table exists...');
    
    // Check if table exists
    const tableExists = await query<{ name: string }>(
      `SELECT name FROM sys.tables WHERE name = 'CashTransactions'`
    );

    if (tableExists.length > 0) {
      console.log('✓ CashTransactions table already exists');
      return;
    }

    console.log('Creating CashTransactions table...');

    // Create table
    await query(`
      CREATE TABLE CashTransactions (
        id NVARCHAR(36) PRIMARY KEY,
        store_id NVARCHAR(36) NOT NULL,
        type NVARCHAR(10) NOT NULL CHECK (type IN ('thu', 'chi')),
        transaction_date DATETIME NOT NULL,
        amount DECIMAL(18, 2) NOT NULL,
        reason NVARCHAR(500) NOT NULL,
        category NVARCHAR(100),
        related_invoice_id NVARCHAR(36),
        created_by NVARCHAR(36),
        created_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (store_id) REFERENCES Stores(id) ON DELETE CASCADE
      )
    `);

    console.log('✓ CashTransactions table created successfully');

    // Create indexes
    console.log('Creating indexes...');
    
    await query(`
      CREATE INDEX IX_CashTransactions_StoreId 
      ON CashTransactions(store_id)
    `);

    await query(`
      CREATE INDEX IX_CashTransactions_TransactionDate 
      ON CashTransactions(transaction_date)
    `);

    await query(`
      CREATE INDEX IX_CashTransactions_Type 
      ON CashTransactions(type)
    `);

    console.log('✓ Indexes created successfully');
    console.log('✓ Setup complete!');

  } catch (error) {
    console.error('Error creating CashTransactions table:', error);
    throw error;
  }
}

// Run the script
createCashTransactionsTable()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
