/**
 * Deploy updated Sales stored procedures with created_by support
 */

import { query } from '../src/db';
import * as fs from 'fs';
import * as path from 'path';

async function deploySP(filename: string) {
  const filePath = path.join(__dirname, 'stored-procedures', filename);
  const sql = fs.readFileSync(filePath, 'utf8');
  
  console.log(`Deploying ${filename}...`);
  await query(sql);
  console.log(`✓ ${filename} deployed`);
}

async function deployStoredProcedures() {
  try {
    console.log('Deploying Sales stored procedures with created_by support...\n');

    // Deploy updated stored procedures
    await deploySP('sp_Sales_Create.sql');
    await deploySP('sp_Sales_GetByStore.sql');

    console.log('\n✅ All stored procedures deployed successfully!');
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    throw error;
  }
}

// Run deployment
deployStoredProcedures()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
