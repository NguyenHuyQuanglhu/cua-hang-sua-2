import sql from 'mssql';
import fs from 'fs';
import path from 'path';

const config = {
  server: '118.69.126.49',
  database: 'Data_QuanLyBanHang_Online',
  user: 'userquanlybanhangonline',
  password: '123456789',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function deploySP() {
  try {
    await sql.connect(config);
    console.log('✓ Connected to database\n');

    const spPath = path.join(__dirname, 'stored-procedures', 'sp_Products_GetByStore.sql');
    const spContent = fs.readFileSync(spPath, 'utf8');
    
    // Split by GO and execute each batch
    const batches = spContent.split(/^\s*GO\s*$/gim).filter(b => b.trim());
    
    console.log(`Found ${batches.length} SQL batches`);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i].trim();
      if (batch) {
        console.log(`\nExecuting batch ${i + 1}...`);
        await sql.query(batch);
        console.log(`✓ Batch ${i + 1} completed`);
      }
    }
    
    console.log('\n✅ All done!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.close();
  }
}

deploySP();
