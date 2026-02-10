import sql from 'mssql';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  server: process.env.DB_SERVER || '118.69.126.49',
  database: process.env.DB_NAME || 'CuaHangSua',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Khanhlinh2011',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

async function deploySP() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('🔌 Connecting to database...');
    pool = await sql.connect(config);
    console.log('✅ Connected\n');

    const spPath = path.join(__dirname, 'stored-procedures', 'sp_Sales_Create.sql');
    console.log('📄 Reading SP file:', spPath);
    
    const spSQL = fs.readFileSync(spPath, 'utf8');

    // Split by GO and execute each batch
    console.log('🚀 Deploying sp_Sales_Create...');
    const batches = spSQL.split(/\bGO\b/gi).filter(batch => batch.trim());
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i].trim();
      if (batch) {
        console.log(`   Executing batch ${i + 1}/${batches.length}...`);
        await pool.request().query(batch);
      }
    }
    
    console.log('✅ sp_Sales_Create deployed successfully!');

  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 Database connection closed');
    }
  }
}

deploySP();
