import sql from 'mssql';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const config: sql.config = {
  server: process.env.DB_SERVER || '118.69.126.49',
  database: process.env.DB_NAME || 'CuaHangSua',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Khanhlinh2011',
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

async function runMigration() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('🔌 Connecting to database...');
    pool = await sql.connect(config);
    console.log('✅ Connected to database');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', 'add-created-by-to-sales.sql');
    console.log('📄 Reading migration file:', migrationPath);
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split by GO and execute each batch
    console.log('🚀 Running migration...');
    const batches = migrationSQL.split(/\bGO\b/gi).filter(batch => batch.trim());
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i].trim();
      if (batch) {
        console.log(`   Executing batch ${i + 1}/${batches.length}...`);
        await pool.request().query(batch);
      }
    }
    console.log('✅ Migration completed successfully!');

    // Verify column was added
    const result = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Sales' AND COLUMN_NAME = 'CreatedBy'
    `);

    if (result.recordset.length > 0) {
      console.log('✅ Verified: CreatedBy column exists');
      console.log('   Column details:', result.recordset[0]);
    } else {
      console.log('⚠️  Warning: CreatedBy column not found after migration');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run migration
runMigration();
