import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

import { getConnection } from '../src/db/connection';

/**
 * Script to check Units table columns
 */

async function checkUnitsColumns() {
  console.log('Checking Units table columns...');

  try {
    const pool = await getConnection();

    const columns = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Units'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('\nUnits table columns:');
    console.log('='.repeat(80));
    columns.recordset.forEach((col: any) => {
      console.log(`${col.COLUMN_NAME.padEnd(30)} ${col.DATA_TYPE.padEnd(20)} ${col.IS_NULLABLE}`);
    });
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Failed:', error);
    throw error;
  }
}

// Run script
checkUnitsColumns()
  .then(() => {
    console.log('\nScript completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
