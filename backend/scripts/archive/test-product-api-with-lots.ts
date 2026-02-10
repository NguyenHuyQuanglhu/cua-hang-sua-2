import fetch from 'node-fetch';

async function testProductAPI() {
  try {
    // Get auth token (you'll need to replace this with actual token)
    const storeId = 'B6E006C7-0115-4C46-9764-6BA61B911964';
    
    // Find a product ID first
    const productsResponse = await fetch('http://localhost:3001/api/products', {
      headers: {
        'X-Store-Id': storeId,
      },
    });
    
    const products = await productsResponse.json();
    console.log('Products count:', products.length);
    
    if (products.length > 0) {
      const firstProduct = products[0];
      console.log('\n=== Testing product API for:', firstProduct.name, '===');
      console.log('Product ID:', firstProduct.id);
      
      // Get product details
      const productResponse = await fetch(`http://localhost:3001/api/products/${firstProduct.id}`, {
        headers: {
          'X-Store-Id': storeId,
        },
      });
      
      const productDetails = await productResponse.json();
      console.log('\nProduct Details:');
      console.log('Name:', productDetails.name);
      console.log('Unit ID:', productDetails.unitId);
      console.log('Stock:', productDetails.stockQuantity);
      console.log('\nPurchase Lots:', productDetails.purchaseLots);
      
      if (productDetails.purchaseLots && productDetails.purchaseLots.length > 0) {
        console.log('\n✅ Purchase lots found:');
        productDetails.purchaseLots.forEach((lot: any, i: number) => {
          console.log(`${i + 1}. ${lot.remaining_quantity} ${lot.unit_name} (imported: ${new Date(lot.import_date).toLocaleDateString()})`);
        });
      } else {
        console.log('\n❌ No purchase lots found');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testProductAPI();
