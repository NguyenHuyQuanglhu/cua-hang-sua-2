/**
 * Script to sync Products.stock_quantity from ProductInventory
 * This fixes the issue where stock_quantity was not updated during purchase orders
 */

import { query, queryOne } from '../src/db/query.js';

async function syncStockQuantity() {
  console.log('Starting stock quantity sync...');
  
  try {
    // Get all products with their inventory
    const inventoryQuery = `
      SELECT 
        p.id,
        p.name,
        p.store_id,
        p.stock_quantity as current_stock,
        ISNULL(SUM(pi.Quantity), 0) as calculated_stock
      FROM Products p
      LEFT JOIN ProductInventory pi ON p.id = pi.ProductId AND p.store_id = pi.StoreId
      GROUP BY p.id, p.name, p.store_id, p.stock_quantity
      HAVING p.stock_quantity != ISNULL(SUM(pi.Quantity), 0)
    `;
    
    const products = await query<{
      id: string;
      name: string;
      store_id: string;
      current_stock: number;
      calculated_stock: number;
    }>(inventoryQuery, {});
    
    console.log(`Found ${products.length} products with mismatched stock`);
    
    if (products.length === 0) {
      console.log('All products are in sync!');
      return;
    }
    
    // Update each product
    for (const product of products) {
      console.log(`Updating ${product.name}:`);
      console.log(`  Current: ${product.current_stock}`);
      console.log(`  Calculated: ${product.calculated_stock}`);
      
      await query(
        `UPDATE Products SET stock_quantity = @stock WHERE id = @id AND store_id = @storeId`,
        { 
          id: product.id, 
          storeId: product.store_id, 
          stock: product.calculated_stock 
        }
      );
      
      console.log(`  ✓ Updated to ${product.calculated_stock}`);
    }
    
    console.log('\nStock sync completed successfully!');
    
  } catch (error) {
    console.error('Error syncing stock:', error);
    throw error;
  }
}

// Run the sync
syncStockQuantity()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
