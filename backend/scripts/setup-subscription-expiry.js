/**
 * Setup subscription expiry and auto-renewal
 */

const sql = require('mssql');
const fs = require('fs');
const path = require('path');

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
  },
};

async function runSetup() {
  let pool;
  
  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('✓ Connected successfully!\n');
    
    // Read SQL file
    const sqlFile = path.join(__dirname, 'add-subscription-expiry.sql');
    const sqlScript = fs.readFileSync(sqlFile, 'utf8');
    
    // Split by GO statements
    const batches = sqlScript
      .split(/\r?\nGO\r?\n/i)
      .filter(batch => batch.trim());
    
    console.log(`Executing ${batches.length} SQL batches...\n`);
    
    // Execute each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i].trim();
      if (batch && !batch.startsWith('--') && !batch.startsWith('USE')) {
        try {
          await pool.request().query(batch);
        } catch (err) {
          // Ignore errors for columns that already exist
          if (!err.message.includes('already exists')) {
            console.error(`Error in batch ${i + 1}:`, err.message);
          }
        }
      }
    }
    
    console.log('\n✓ Setup completed successfully!');
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
    
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

runSetup()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Failed:', err);
    process.exit(1);
  });
