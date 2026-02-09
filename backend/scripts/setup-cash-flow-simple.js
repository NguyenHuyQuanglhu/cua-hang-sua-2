/**
 * Simple script to setup cash flow synchronization
 * Run with: node scripts/setup-cash-flow-simple.js
 */

const sql = require('mssql');
const fs = require('fs');
const path = require('path');

// Database configuration
const config = {
  server: '118.69.126.49',
  database: 'Data_quanlybanhang_online',
  user: 'userquanlybanhangonline',
  password: '123456789',
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    requestTimeout: 30000,
  },
  pool: {
    max: 1,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

async function runSetup() {
  let pool;
  
  try {
    console.log('Connecting to database...');
    console.log(`Server: ${config.server}`);
    console.log(`Database: ${config.database}`);
    console.log('');
    
    // Connect to database
    pool = await sql.connect(config);
    console.log('✓ Connected successfully!');
    console.log('');
    
    // Read SQL file
    const sqlFile = path.join(__dirname, 'setup-cash-flow.sql');
    const sqlScript = fs.readFileSync(sqlFile, 'utf8');
    
    // Split by GO statements
    const batches = sqlScript
      .split(/\r?\nGO\r?\n/i)
      .filter(batch => batch.trim());
    
    console.log(`Executing ${batches.length} SQL batches...`);
    console.log('');
    
    // Execute each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i].trim();
      if (batch) {
        try {
          const result = await pool.request().query(batch);
          
          // Print info messages
          if (result.recordset && result.recordset.length > 0) {
            console.table(result.recordset);
          }
          
        } catch (err) {
          console.error(`Error in batch ${i + 1}:`, err.message);
        }
      }
    }
    
    console.log('');
    console.log('✓ Setup completed successfully!');
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
    
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

// Run the setup
runSetup()
  .then(() => {
    console.log('');
    console.log('Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Failed:', err);
    process.exit(1);
  });
