import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.join(__dirname, '../.env') });

import { query } from '../src/db';

async function testStatusFix() {
  try {
    console.log('🧪 Testing automatic status fix...\n');

    // Get a store and product for testing
    const store = await query(`
      SELECT TOP 1 id FROM Stores WHERE status = 'active'
    `);

    const product = await query(`
      SELECT TOP 1 p.id, p.price 
      FROM Products p 
      INNER JOIN Inventory i ON p.id = i.product_id
      WHERE p.status = 'active' AND i.current_stock > 0
    `);

    if (store.length === 0 || product.length === 0) {
      console.log('❌ No suitable store/product found for testing');
      return;
    }

    const storeId = (store as any[])[0].id;
    const productId = (product as any[])[0].id;
    const productPrice = (product as any[])[0].price || 50000;

    console.log(`📦 Test setup:`);
    console.log(`  Store ID: ${storeId}`);
    console.log(`  Product ID: ${productId}`);
    console.log(`  Product Price: ${productPrice}`);

    // Test Case 1: Create order without status but with full payment
    console.log(`\n🧪 Test Case 1: Full payment, no status specified`);
    
    const testSale1 = {
      customerId: null,
      shiftId: null,
      items: [{
        productId: productId,
        quantity: 1,
        price: productPrice
      }],
      totalAmount: productPrice,
      finalAmount: productPrice,
      customerPayment: productPrice, // Full payment
      // No status specified - should auto-fix to 'processed'
    };

    try {
      // Simulate API call by calling the sales service directly
      const { salesService } = await import('../src/services/sales-service');
      
      const result1 = await salesService.createSale({
        customerId: testSale1.customerId,
        shiftId: testSale1.shiftId,
        items: testSale1.items,
        customerPayment: testSale1.customerPayment,
        // No status - should default to smart logic
      }, storeId);

      console.log(`  ✅ Sale created: ${result1.sale.invoiceNumber}`);
      console.log(`  📊 Status: ${result1.sale.status}`);
      
      if (result1.sale.status === 'processed') {
        console.log(`  🎉 SUCCESS: Status auto-fixed to 'processed'!`);
      } else {
        console.log(`  ❌ FAILED: Status is '${result1.sale.status}', expected 'processed'`);
      }

      // Clean up test sale
      await query(`DELETE FROM SalesItems WHERE sales_transaction_id = @saleId`, { saleId: result1.sale.id });
      await query(`DELETE FROM Sales WHERE id = @saleId`, { saleId: result1.sale.id });
      console.log(`  🧹 Test sale cleaned up`);

    } catch (error) {
      console.error(`  ❌ Test failed:`, error);
    }

    // Test Case 2: Partial payment - should remain pending
    console.log(`\n🧪 Test Case 2: Partial payment, no status specified`);
    
    try {
      const result2 = await salesService.createSale({
        customerId: null,
        shiftId: null,
        items: [{
          productId: productId,
          quantity: 1,
          price: productPrice
        }],
        customerPayment: Math.floor(productPrice / 2), // Half payment
      }, storeId);

      console.log(`  ✅ Sale created: ${result2.sale.invoiceNumber}`);
      console.log(`  📊 Status: ${result2.sale.status}`);
      
      if (result2.sale.status === 'pending') {
        console.log(`  🎉 SUCCESS: Partial payment correctly remains 'pending'!`);
      } else {
        console.log(`  ❌ FAILED: Status is '${result2.sale.status}', expected 'pending'`);
      }

      // Clean up test sale
      await query(`DELETE FROM SalesItems WHERE sales_transaction_id = @saleId`, { saleId: result2.sale.id });
      await query(`DELETE FROM Sales WHERE id = @saleId`, { saleId: result2.sale.id });
      console.log(`  🧹 Test sale cleaned up`);

    } catch (error) {
      console.error(`  ❌ Test failed:`, error);
    }

    console.log(`\n✅ Status fix testing completed!`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

testStatusFix()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });