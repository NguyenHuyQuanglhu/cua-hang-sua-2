import sql from 'mssql';

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

async function checkProductOrder() {
  try {
    await sql.connect(config);
    console.log('✓ Connected to database\n');

    const storeId = 'B6E006C7-0115-4C46-9764-6BA61B911964';
    
    console.log('=== Top 10 Products from sp_Products_GetByStore ===\n');
    const result = await sql.query`EXEC sp_Products_GetByStore @storeId = ${storeId}`;
    
    result.recordset.slice(0, 10).forEach((p: any, i: number) => {
      const updatedAt = new Date(p.updatedAt);
      const createdAt = new Date(p.createdAt);
      const updatedStr = updatedAt.toLocaleString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      const createdStr = createdAt.toLocaleString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      console.log(`${i + 1}. ${p.name}`);
      console.log(`   Updated: ${updatedStr}`);
      console.log(`   Created: ${createdStr}`);
      console.log(`   Stock: ${p.currentStock || 0}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.close();
  }
}

checkProductOrder();
