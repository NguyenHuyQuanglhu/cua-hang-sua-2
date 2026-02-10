import sql from 'mssql';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const config: sql.config = {
  server: process.env.DB_SERVER || '',
  database: process.env.DB_NAME || '',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

async function runMigration(migrationFile: string) {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('🔌 Connecting to database...');
    console.log(`   Server: ${config.server}`);
    console.log(`   Database: ${config.database}`);
    console.log(`   User: ${config.user}`);
    console.log('');

    pool = await sql.connect(config);
    console.log('✅ Connected to database successfully!\n');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', migrationFile);
    console.log(`📄 Reading migration file: ${migrationFile}`);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded\n');

    // Split by GO statements
    const batches = migrationSQL
      .split(/^\s*GO\s*$/gim)
      .map(batch => batch.trim())
      .filter(batch => batch.length > 0);

    console.log(`🚀 Executing ${batches.length} SQL batches...\n`);

    // Execute each batch
    for (let i = 0; i < batches.length; i++) {
      console.log(`   Batch ${i + 1}/${batches.length}...`);
      const result = await pool.request().query(batches[i]);
      
      // Print any messages from SQL Server
      if (result.recordset && result.recordset.length > 0) {
        result.recordset.forEach((row: any) => {
          console.log(`   ${JSON.stringify(row)}`);
        });
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('');
    console.log('📊 Verifying changes...');

    // Verify the columns were added
    const verifyQuery = `
      SELECT 
        COLUMN_NAME, 
        DATA_TYPE, 
        IS_NULLABLE,
        CHARACTER_MAXIMUM_LENGTH,
        NUMERIC_PRECISION,
        NUMERIC_SCALE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'PurchaseOrderItems'
        AND COLUMN_NAME IN ('base_quantity', 'base_cost', 'base_unit_id')
      ORDER BY COLUMN_NAME;
    `;

    const verifyResult = await pool.request().query(verifyQuery);
    
    if (verifyResult.recordset.length > 0) {
      console.log('\n✅ Columns verified:');
      verifyResult.recordset.forEach((col: any) => {
        console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE}${col.NUMERIC_PRECISION ? `(${col.NUMERIC_PRECISION},${col.NUMERIC_SCALE})` : ''}) ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    } else {
      console.log('\n⚠️  Warning: Could not verify columns');
    }

    console.log('\n🎉 All done! You can now restart the backend server.');

  } catch (error) {
    console.error('\n❌ Migration failed!');
    console.error('Error:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Get migration file from command line argument
const migrationFile = process.argv[2] || 'add-base-unit-columns.sql';

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║         SmartInventory - Database Migration           ║');
console.log('╚════════════════════════════════════════════════════════╝');
console.log('');

runMigration(migrationFile);
