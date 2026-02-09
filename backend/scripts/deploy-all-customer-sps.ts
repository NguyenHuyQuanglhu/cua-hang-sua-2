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

async function deployStoredProcedures() {
  try {
    console.log('Connecting to database...');
    const pool = await sql.connect(config);
    console.log('Connected successfully!\n');

    const spFiles = [
      'sp_Customers_Create.sql',
      'sp_Customers_Update.sql',
      'sp_Customers_GetByStore.sql',
    ];

    for (const spFile of spFiles) {
      console.log(`📦 Deploying ${spFile}...`);
      const spPath = path.join(__dirname, 'stored-procedures', spFile);
      const spContent = fs.readFileSync(spPath, 'utf8');

      // Split by GO statements and execute each batch
      const batches = spContent.split(/\bGO\b/gi).filter(batch => batch.trim());
      
      for (const batch of batches) {
        if (batch.trim()) {
          await pool.request().query(batch);
        }
      }

      console.log(`✅ ${spFile} deployed successfully!\n`);
    }

    console.log('🎉 All customer stored procedures deployed successfully!');
    await pool.close();
  } catch (error) {
    console.error('❌ Error deploying stored procedures:', error);
    process.exit(1);
  }
}

deployStoredProcedures();
