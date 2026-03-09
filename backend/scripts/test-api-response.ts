import axios from 'axios';

async function testAPIResponse() {
  try {
    console.log('Testing API response format...\n');

    // Test without auth (will fail but we can see the response structure)
    const baseURL = 'http://localhost:3001'; // Adjust if your backend runs on different port
    
    console.log(`Calling: ${baseURL}/api/products?pageSize=1000\n`);
    
    try {
      const response = await axios.get(`${baseURL}/api/products?pageSize=1000`, {
        headers: {
          'X-Store-Id': 'B6E006C7-0115-4C46-9764-6BA61B911964', // cửa hàng sữa
        },
        validateStatus: () => true, // Don't throw on any status
      });

      console.log('Status:', response.status);
      console.log('Response type:', typeof response.data);
      console.log('Is array?', Array.isArray(response.data));
      
      if (response.data) {
        console.log('\nResponse structure:');
        console.log('Keys:', Object.keys(response.data));
        
        if (response.data.success !== undefined) {
          console.log('  - success:', response.data.success);
        }
        if (response.data.data !== undefined) {
          console.log('  - data: array of', Array.isArray(response.data.data) ? response.data.data.length : 'not array', 'items');
          
          if (Array.isArray(response.data.data) && response.data.data.length > 0) {
            console.log('\nFirst product sample:');
            const first = response.data.data[0];
            console.log('  - id:', first.id);
            console.log('  - name:', first.name);
            console.log('  - unitId:', first.unitId);
            console.log('  - status:', first.status);
            
            // Check for missing products
            const missingProducts = [
              'TH True Milk Nguyên chất 180ml',
              'TH True Milk Nguyên chất 1L',
              'TH True Yogurt Dâu 100g',
              'Vinamilk Ít đường 1L',
              'Vinamilk Optimum Gold 900g',
              'Vinamilk Probi Dâu 100ml'
            ];
            
            console.log('\n\nChecking for missing products in API response:');
            missingProducts.forEach(productName => {
              const found = response.data.data.find((p: any) => p.name === productName);
              if (found) {
                console.log(`✓ ${productName} - unitId: ${found.unitId}`);
              } else {
                console.log(`❌ ${productName} - NOT FOUND`);
              }
            });
          }
        }
        if (response.data.total !== undefined) {
          console.log('  - total:', response.data.total);
        }
        if (response.data.page !== undefined) {
          console.log('  - page:', response.data.page);
        }
        if (response.data.pageSize !== undefined) {
          console.log('  - pageSize:', response.data.pageSize);
        }
      }
      
    } catch (error: any) {
      if (error.response) {
        console.log('Error status:', error.response.status);
        console.log('Error data:', error.response.data);
      } else {
        console.log('Error:', error.message);
        console.log('\n⚠ Backend server might not be running!');
        console.log('Please start the backend server with: npm run dev');
      }
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAPIResponse();
