async function testLogin() {
  try {
    console.log('Testing login...');
    
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'phuc@lhu.edu.vn',
        password: '123456789',
      }),
    });

    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.token) {
      console.log('\n✅ Login successful!');
      console.log('Token:', data.token);
      console.log('\nTo use in browser console:');
      console.log(`localStorage.setItem('auth_token', '${data.token}');`);
      if (data.stores && data.stores.length > 0) {
        const storeId = typeof data.stores[0] === 'string' ? data.stores[0] : data.stores[0].storeId;
        console.log(`localStorage.setItem('store_id', '${storeId}');`);
      }
      console.log('location.reload();');
    } else {
      console.log('\n❌ Login failed!');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testLogin();
