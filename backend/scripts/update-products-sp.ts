/**
 * Update Products Stored Procedures
 * 
 * This script updates the sp_Products_GetByStore and sp_Products_GetById
 * stored procedures to correctly calculate currentStock by summing all
 * ProductInventory records instead of joining to a single record.
 */

import * as sql from 'mssql';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const config: sql.config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'master',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
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

async function updateStoredProcedures() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('Connected successfully!');

    // Read the products module SQL file
    const sqlFilePath = path.join(__dirname, 'stored-procedures', 'products-module.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('\nDeploying updated stored procedures...');
    
    // Split by GO statements and execute each batch
    const batches = sqlContent
      .split(/^\s*GO\s*$/gim)
      .map(batch => batch.trim())
      .filter(batch => batch.length > 0);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      if (batch) {
        try {
          await pool.request().query(batch);
          console.log(`✓ Executed batch ${i + 1}/${batches.length}`);
        } catch (error) {
          console.error(`✗ Error in batch ${i + 1}:`, error);
          throw error;
        }
      }
    }

    console.log('\n✓ All stored procedures updated successfully!');
    console.log('\nUpdated procedures:');
    console.log('  - sp_Products_GetByStore (now uses SUM for currentStock)');
    console.log('  - sp_Products_GetById (now uses SUM for currentStock)');
    console.log('\nChanges:');
    console.log('  - currentStock now sums ALL ProductInventory records for a product');
    console.log('  - Fixes issue where stock was not updating after purchases');

  } catch (error) {
    console.error('Error updating stored procedures:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\nDatabase connection closed.');
    }
  }
}

// Run the update
updateStoredProcedures();
