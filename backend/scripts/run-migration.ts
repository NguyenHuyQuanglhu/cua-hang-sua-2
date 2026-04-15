import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import sql from 'mssql';

dotenv.config();

const config: sql.config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'SmartInventory',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT !== 'false',
  },
};

async function runMigration(migrationFile: string) {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('🔌 Connecting to database...');
    pool = await sql.connect(config);
    console.log('✅ Connected to database');

    const migrationPath = path.join(__dirname, 'migrations', migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log(`📄 Running migration: ${migrationFile}`);
    
    // Split the SQL file by GO statements
    // This allows running multiple statements in a single file
    const batches = migrationSQL.split(/^\s*GO\s*$/im);
    
    let successCount = 0;
    for (const batch of batches) {
      if (batch.trim().length > 0) {
        try {
          await pool.request().query(batch);
          successCount++;
        } catch (err: any) {
          console.error(`❌ Failed on batch:\n${batch.substring(0, 100)}...`);
          throw err;
        }
      }
    }
    
    console.log(`✅ Migration completed successfully (${successCount} batches executed)`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 Database connection closed');
    }
  }
}

// Get migration file from command line argument
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('❌ Please provide a migration file name');
  console.log('Usage: npm run migrate <migration-file.sql>');
  process.exit(1);
}

runMigration(migrationFile)
  .then(() => {
    console.log('✅ Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
