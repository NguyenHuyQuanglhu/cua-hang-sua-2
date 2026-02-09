import sql from 'mssql';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  server: process.env.DB_SERVER || '',
  database: process.env.DB_NAME || '',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function deployStoredProcedure() {
  try {
    console.log('Connecting to database...');
    const pool = await sql.connect(config);
    console.log('Connected successfully!');

    // Read the stored procedure file
    const spPath = path.join(__dirname, 'stored-procedures', 'sp_Customers_GetByStore.sql');
    const spContent = fs.readFileSync(spPath, 'utf8');

    console.log('Deploying sp_Customers_GetByStore...');
    
    // Split by GO statements and execute each batch
    const batches = spContent.split(/\bGO\b/gi).filter(batch => batch.trim());
    
    for (const batch of batches) {
      if (batch.trim()) {
        await pool.request().query(batch);
      }
    }

    console.log('✅ sp_Customers_GetByStore deployed successfully!');

    await pool.close();
  } catch (error) {
    console.error('❌ Error deploying stored procedure:', error);
    process.exit(1);
  }
}

deployStoredProcedure();
