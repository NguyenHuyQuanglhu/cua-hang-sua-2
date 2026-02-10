import { query } from '../src/db';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  try {
    console.log('🔄 Running migration: add-payment-method-to-payments.sql');
    
    const migrationPath = path.join(__dirname, 'migrations', 'add-payment-method-to-payments.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by GO statements and execute each batch
    const batches = sql.split(/\bGO\b/gi).filter(batch => batch.trim());
    
    for (const batch of batches) {
      if (batch.trim()) {
        await query(batch);
      }
    }
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

runMigration()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
