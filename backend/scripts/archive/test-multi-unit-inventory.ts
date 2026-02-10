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

async function testMultiUnitInventory() {
  try {
    await sql.connect(config);
    const storeId = 'B6E006C7-0115-4C46-9764-6BA61B911964';
    
    const result = await sql.query`EXEC sp_Products_GetByStore @storeId = ${storeId}`;
    
    console.log('=== Products with Multi-Unit Inventory ===\n');
    
    result.recordset.slice(0, 5).forEach((p: any, i: number) => {
      console.log(`${i + 1}. ${p.name}`);
      console.log(`   Main Unit: ${p.unitId}`);
      console.log(`   Current Stock (total): ${p.currentStock}`);
      
      if (p.inventoryUnits) {
        try {
          const units = JSON.parse(p.inventoryUnits);
          console.log(`   Inventory by units:`);
          units.forEach((u: any) => {
            console.log(`     - ${u.quantity} ${u.unitName}`);
          });
        } catch (e) {
          console.log(`   Inventory: ${p.inventoryUnits}`);
        }
      } else {
        console.log(`   No inventory data`);
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.close();
  }
}

testMultiUnitInventory();
