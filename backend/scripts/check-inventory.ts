import 'dotenv/config';
import { getConnection, query } from '../src/db/index.js';

async function checkInventory() {
  try {
    await getConnection();
    
    // Kiểm tra cấu trúc bảng Products
    const columns = await query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Products'
    `);
    
    console.log('Products table columns:', columns);
    
    // Tìm sản phẩm Dalat Milk
    const dalatProducts = await query(`
      SELECT TOP 10 * 
      FROM Products 
      WHERE name LIKE '%Dalat%'
    `);
    
    console.log('Dalat products found:', dalatProducts);
    
    if (dalatProducts.length > 0) {
      const product = dalatProducts[0];
      
      // Kiểm tra tồn kho
      const inventory = await query(`
        SELECT pi.*, u.name as unitName, p.name as productName
        FROM ProductInventory pi
        LEFT JOIN Units u ON pi.UnitId = u.id
        LEFT JOIN Products p ON pi.ProductId = p.id
        WHERE pi.ProductId = '${product.id}'
      `);
      
      console.log('Inventory records:', inventory);
      
      // Kiểm tra units có sẵn cho store này
      const units = await query(`
        SELECT * FROM Units WHERE StoreId = '${product.store_id}'
      `);
      
      console.log('Available units:', units);
      
      // Test stored procedure
      const spResult = await query(`
        EXEC sp_Inventory_GetAvailable 
          @productId = '${product.id}',
          @storeId = '${product.store_id}',
          @unitId = '${product.unit_id}'
      `);
      
      console.log('SP Result:', spResult);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

checkInventory();