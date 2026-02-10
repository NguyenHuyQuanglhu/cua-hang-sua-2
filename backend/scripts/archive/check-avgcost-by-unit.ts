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

async function checkAvgCostByUnit() {
  try {
    await sql.connect(config);
    const storeId = 'B6E006C7-0115-4C46-9764-6BA61B911964';
    
    // List all products first
    console.log('=== All Products ===\n');
    const allProducts = await sql.query`
      SELECT id, name FROM Products 
      WHERE store_id = ${storeId}
      ORDER BY name
    `;
    
    allProducts.recordset.forEach((p: any, i: number) => {
      console.log(`${i + 1}. ${p.name} (${p.id})`);
    });
    
    // Check if "Sữa bò" has purchase lots with different units
    console.log('\n=== Checking PurchaseLots for "Sữa bò" ===\n');
    
    const product = await sql.query`
      SELECT id, name FROM Products 
      WHERE name = N'Sữa bò' AND store_id = ${storeId}
    `;
    
    if (product.recordset.length === 0) {
      console.log('Product "Sữa bò" not found');
      return;
    }
    
    console.log(`Found ${product.recordset.length} products named "Sữa bò"`);
    
    // Check the first one
    const productId = product.recordset[0].id;
    console.log('Product ID:', productId);
    console.log('Product Name:', product.recordset[0].name);
    
    // Get purchase lots
    const lots = await sql.query`
      SELECT 
        pl.id,
        pl.import_date,
        pl.quantity,
        pl.remaining_quantity,
        pl.cost,
        pl.unit_id,
        u.name as unit_name
      FROM PurchaseLots pl
      LEFT JOIN Units u ON pl.unit_id = u.id
      WHERE pl.product_id = ${productId} 
        AND pl.store_id = ${storeId} 
        AND pl.remaining_quantity > 0
      ORDER BY pl.import_date DESC
    `;
    
    console.log('\nPurchase Lots:');
    lots.recordset.forEach((lot: any, i: number) => {
      console.log(`${i + 1}. ${lot.remaining_quantity} ${lot.unit_name} @ ${lot.cost} (imported: ${new Date(lot.import_date).toLocaleDateString()})`);
    });
    
    // Test the avgCostByUnit query
    console.log('\n=== Testing avgCostByUnit query ===\n');
    const avgCost = await sql.query`
      SELECT 
        pl.unit_id as unitId,
        u.name as unitName,
        AVG(pl.cost) as avgCost,
        SUM(pl.remaining_quantity) as totalQty
      FROM PurchaseLots pl
      LEFT JOIN Units u ON pl.unit_id = u.id
      WHERE pl.product_id = ${productId} 
        AND pl.store_id = ${storeId} 
        AND pl.remaining_quantity > 0
      GROUP BY pl.unit_id, u.name
    `;
    
    console.log('Average Cost by Unit:');
    avgCost.recordset.forEach((unit: any) => {
      console.log(`- ${unit.avgCost} / ${unit.unitName} (${unit.totalQty} ${unit.unitName})`);
    });
    
    // Test stored procedure
    console.log('\n=== Testing sp_Products_GetByStore ===\n');
    const spResult = await sql.query`EXEC sp_Products_GetByStore @storeId = ${storeId}`;
    const suaBo = spResult.recordset.find((p: any) => p.name.includes('Sữa bò'));
    
    if (suaBo) {
      console.log('Product from SP:', suaBo.name);
      console.log('avgCostByUnit:', suaBo.avgCostByUnit);
      
      if (suaBo.avgCostByUnit) {
        try {
          const parsed = JSON.parse(suaBo.avgCostByUnit);
          console.log('Parsed avgCostByUnit:', parsed);
        } catch (e) {
          console.log('Failed to parse:', e);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.close();
  }
}

checkAvgCostByUnit();
