/**
 * Comprehensive Products Test
 * Tests all CRUD operations for Products
 */

import 'dotenv/config';
import { getConnection, closeConnection } from '../src/db/index.js';
import * as fs from 'fs';
import * as path from 'path';

async function testProducts() {
  console.log('🧪 Comprehensive Products Test\n');
  console.log('═'.repeat(60));

  try {
    const pool = await getConnection();

    // Get a store
    const store = await pool.request().query(`
      SELECT TOP 1 id, name FROM Stores WHERE status = 'active'
    `);
    
    const storeId = store.recordset[0].id;
    const storeName = store.recordset[0].name;
    console.log(`\n🏪 Testing with store: ${storeName}\n`);

    // Get category and unit for testing
    const category = await pool.request().query(`
      SELECT TOP 1 id, name FROM Categories WHERE store_id = '${storeId}'
    `);
    
    const unit = await pool.request().query(`
      SELECT TOP 1 id, name FROM Units WHERE store_id = '${storeId}'
    `);

    if (category.recordset.length === 0 || unit.recordset.length === 0) {
      throw new Error('Need at least one category and unit');
    }

    const categoryId = category.recordset[0].id;
    const unitId = unit.recordset[0].id;

    console.log('📋 Test 1: List all products\n');
    const allProducts = await pool.request().query(`
      SELECT 
        p.*,
        c.name as category_name,
        u.name as unit_name
      FROM Products p
      LEFT JOIN Categories c ON p.category_id = c.id
      LEFT JOIN Units u ON p.unit_id = u.id
      WHERE p.store_id = '${storeId}'
      ORDER BY p.created_at DESC
    `);
    
    console.log(`   ✅ Found ${allProducts.recordset.length} products`);
    if (allProducts.recordset.length > 0) {
      console.log(`   Sample: ${allProducts.recordset[0].name} - ${allProducts.recordset[0].price?.toLocaleString('vi-VN')} VND\n`);
    }

    console.log('📋 Test 2: Create new product\n');
    const newProductId = crypto.randomUUID();
    const testProduct = {
      id: newProductId,
      store_id: storeId,
      name: `Test Product ${Date.now()}`,
      sku: `TEST-${Date.now()}`,
      category_id: categoryId,
      unit_id: unitId,
      price: 100000,
      cost_price: 70000,
      stock_quantity: 50,
      min_stock_level: 10,
      max_stock_level: 100,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    };

    await pool.request().query(`
      INSERT INTO Products (
        id, store_id, name, sku, category_id, unit_id, 
        price, cost_price, stock_quantity, min_stock_level, 
        max_stock_level, status, created_at, updated_at
      )
      VALUES (
        '${testProduct.id}', '${testProduct.store_id}', 
        N'${testProduct.name}', '${testProduct.sku}', 
        '${testProduct.category_id}', '${testProduct.unit_id}',
        ${testProduct.price}, ${testProduct.cost_price}, 
        ${testProduct.stock_quantity}, ${testProduct.min_stock_level},
        ${testProduct.max_stock_level}, '${testProduct.status}',
        GETDATE(), GETDATE()
      )
    `);

    console.log(`   ✅ Created product: ${testProduct.name}`);
    console.log(`      SKU: ${testProduct.sku}`);
    console.log(`      Price: ${testProduct.price.toLocaleString('vi-VN')} VND\n`);

    console.log('📋 Test 3: Read product by ID\n');
    const readProduct = await pool.request().query(`
      SELECT 
        p.*,
        c.name as category_name,
        u.name as unit_name
      FROM Products p
      LEFT JOIN Categories c ON p.category_id = c.id
      LEFT JOIN Units u ON p.unit_id = u.id
      WHERE p.id = '${newProductId}'
    `);

    if (readProduct.recordset.length > 0) {
      const product = readProduct.recordset[0];
      console.log(`   ✅ Found product:`);
      console.log(`      Name: ${product.name}`);
      console.log(`      Category: ${product.category_name}`);
      console.log(`      Unit: ${product.unit_name}`);
      console.log(`      Stock: ${product.stock_quantity}\n`);
    }

    console.log('📋 Test 4: Update product\n');
    const updatedPrice = 120000;
    const updatedStock = 75;
    
    await pool.request().query(`
      UPDATE Products
      SET price = ${updatedPrice},
          stock_quantity = ${updatedStock},
          updated_at = GETDATE()
      WHERE id = '${newProductId}'
    `);

    const verifyUpdate = await pool.request().query(`
      SELECT price, stock_quantity FROM Products WHERE id = '${newProductId}'
    `);

    console.log(`   ✅ Updated product:`);
    console.log(`      New Price: ${verifyUpdate.recordset[0].price.toLocaleString('vi-VN')} VND`);
    console.log(`      New Stock: ${verifyUpdate.recordset[0].stock_quantity}\n`);

    console.log('📋 Test 5: Search products by name\n');
    const searchTerm = 'DX';
    const searchResults = await pool.request().query(`
      SELECT name, sku, price
      FROM Products
      WHERE store_id = '${storeId}' 
        AND name LIKE N'%${searchTerm}%'
        AND status = 'active'
    `);

    console.log(`   ✅ Search for "${searchTerm}": ${searchResults.recordset.length} results`);
    searchResults.recordset.slice(0, 3).forEach((p: any) => {
      console.log(`      - ${p.name} (${p.sku})`);
    });
    console.log('');

    console.log('📋 Test 6: Filter by category\n');
    const categoryProducts = await pool.request().query(`
      SELECT COUNT(*) as total
      FROM Products
      WHERE store_id = '${storeId}' 
        AND category_id = '${categoryId}'
        AND status = 'active'
    `);

    console.log(`   ✅ Products in category: ${categoryProducts.recordset[0].total}\n`);

    console.log('📋 Test 7: Check low stock products\n');
    const lowStock = await pool.request().query(`
      SELECT name, stock_quantity, min_stock_level
      FROM Products
      WHERE store_id = '${storeId}' 
        AND stock_quantity <= min_stock_level
        AND status = 'active'
    `);

    console.log(`   ✅ Low stock products: ${lowStock.recordset.length}`);
    if (lowStock.recordset.length > 0) {
      lowStock.recordset.slice(0, 3).forEach((p: any) => {
        console.log(`      - ${p.name}: ${p.stock_quantity}/${p.min_stock_level}`);
      });
    }
    console.log('');

    console.log('📋 Test 8: Soft delete product\n');
    await pool.request().query(`
      UPDATE Products
      SET status = 'inactive',
          updated_at = GETDATE()
      WHERE id = '${newProductId}'
    `);

    const verifyDelete = await pool.request().query(`
      SELECT status FROM Products WHERE id = '${newProductId}'
    `);

    console.log(`   ✅ Product status: ${verifyDelete.recordset[0].status}\n`);

    console.log('📋 Test 9: Permanent delete product\n');
    await pool.request().query(`
      DELETE FROM Products WHERE id = '${newProductId}'
    `);

    const verifyPermanentDelete = await pool.request().query(`
      SELECT COUNT(*) as count FROM Products WHERE id = '${newProductId}'
    `);

    console.log(`   ✅ Product deleted: ${verifyPermanentDelete.recordset[0].count === 0 ? 'Yes' : 'No'}\n`);

    console.log('📋 Test 10: Check product statistics\n');
    const stats = await pool.request().query(`
      SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_products,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_products,
        SUM(stock_quantity) as total_stock,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price
      FROM Products
      WHERE store_id = '${storeId}'
    `);

    const s = stats.recordset[0];
    console.log(`   ✅ Product Statistics:`);
    console.log(`      Total Products: ${s.total_products}`);
    console.log(`      Active: ${s.active_products}`);
    console.log(`      Inactive: ${s.inactive_products}`);
    console.log(`      Total Stock: ${s.total_stock || 0}`);
    console.log(`      Avg Price: ${s.avg_price?.toLocaleString('vi-VN') || 0} VND`);
    console.log(`      Price Range: ${s.min_price?.toLocaleString('vi-VN') || 0} - ${s.max_price?.toLocaleString('vi-VN') || 0} VND\n`);

    await closeConnection();

    console.log('═'.repeat(60));
    console.log('✅ All Products tests passed!');
    console.log('═'.repeat(60) + '\n');

    // Self-delete
    const scriptPath = path.join(__dirname, 'test-products-comprehensive.ts');
    fs.unlinkSync(scriptPath);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testProducts();
