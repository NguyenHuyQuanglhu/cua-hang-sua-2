import sql from 'mssql';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function deployStoredProcedures() {
  const config: sql.config = {
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'SmartInventory',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    options: { 
      encrypt: process.env.DB_ENCRYPT === 'true', 
      trustServerCertificate: true 
    }
  };
  
  console.log('🔌 Connecting to database...');
  const pool = await sql.connect(config);
  
  const procedures = [
    'sp_Products_GetByStore.sql',
    'sp_Products_GetById.sql',
  ];
  
  for (const proc of procedures) {
    const filePath = path.join(__dirname, 'stored-procedures', proc);
    const sqlScript = fs.readFileSync(filePath, 'utf8');
    
    console.log(`\n📝 Deploying ${proc}...`);
    
    try {
      // Split by GO and execute each batch separately
      const batches = sqlScript
        .split(/\bGO\b/gi)
        .map(batch => batch.trim())
        .filter(batch => batch.length > 0);
      
      for (const batch of batches) {
        await pool.request().batch(batch);
      }
      
      console.log(`✅ ${proc} deployed successfully`);
    } catch (error) {
      console.error(`❌ Error deploying ${proc}:`, error);
      throw error;
    }
  }
  
  console.log('\n✅ All stored procedures deployed successfully!');
  await pool.close();
}

deployStoredProcedures().catch(console.error);
