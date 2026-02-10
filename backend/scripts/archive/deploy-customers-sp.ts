import sql from 'mssql';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

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

async function deployCustomersSP() {
  try {
    await sql.connect(config);
    console.log('Connected to database');

    const procedures = [
      'sp_Customers_GetByStore.sql',
      'sp_Customers_Delete.sql',
    ];

    for (const proc of procedures) {
      const filePath = path.join(__dirname, 'stored-procedures', proc);
      const sqlContent = fs.readFileSync(filePath, 'utf8');
      
      console.log(`\nDeploying ${proc}...`);
      
      // Split by GO statements and execute each batch
      const batches = sqlContent
        .split(/\bGO\b/gi)
        .map(batch => batch.trim())
        .filter(batch => batch.length > 0);
      
      for (const batch of batches) {
        await sql.query(batch);
      }
      
      console.log(`✓ ${proc} deployed successfully`);
    }

    console.log('\n✓ All Customers stored procedures deployed successfully!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deployCustomersSP();
