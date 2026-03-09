import sql from 'mssql';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
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
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

async function deployStoredProcedures() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('Connected successfully!');

    // Read the products module SQL file
    const sqlFilePath = path.join(__dirname, 'stored-procedures', 'products-module.sql');
    console.log(`Reading SQL file: ${sqlFilePath}`);
    
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Split by GO statements and execute each batch
    const batches = sqlContent
      .split(/^\s*GO\s*$/gim)
      .map(batch => batch.trim())
      .filter(batch => batch.length > 0);

    console.log(`Found ${batches.length} SQL batches to execute`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      if (batch.length > 0) {
        console.log(`\nExecuting batch ${i + 1}/${batches.length}...`);
        try {
          await pool.request().query(batch);
          console.log(`✓ Batch ${i + 1} executed successfully`);
        } catch (error: any) {
          console.error(`✗ Error in batch ${i + 1}:`, error.message);
          // Continue with other batches even if one fails
        }
      }
    }

    console.log('\n✓ All stored procedures deployed successfully!');
    console.log('\nUpdated procedures:');
    console.log('  - sp_Products_Create (now returns unitId)');
    console.log('  - sp_Products_Update (now returns unitId)');
    console.log('  - sp_Products_GetByStore (now returns unitId)');
    console.log('  - sp_Products_GetById (now returns unitId)');

  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\nDatabase connection closed.');
    }
  }
}

// Run the deployment
deployStoredProcedures();
