import * as fs from 'fs';
import * as path from 'path';
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const DB_CONFIG: sql.config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'SmartInventory',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
  },
};

async function deploy() {
  let pool: sql.ConnectionPool | null = null;
  
  try {
    console.log('Connecting to database...');
    pool = await sql.connect(DB_CONFIG);
    console.log('Connected!\n');

    const filePath = path.join(__dirname, 'stored-procedures', 'sales-module.sql');
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    
    const batches = sqlContent
      .split(/^\s*GO\s*$/gim)
      .map(batch => batch.trim())
      .filter(batch => batch.length > 0);

    console.log(`Deploying sales-module.sql (${batches.length} batches)...`);
    
    for (const batch of batches) {
      try {
        await pool.request().query(batch);
      } catch (err) {
        const error = err as Error;
        console.error(`Error: ${error.message.substring(0, 100)}`);
      }
    }
    
    console.log('Done!');

  } catch (error) {
    console.error('Failed:', error);
  } finally {
    if (pool) await pool.close();
  }
}

deploy();
