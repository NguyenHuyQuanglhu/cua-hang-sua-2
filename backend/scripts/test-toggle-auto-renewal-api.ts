import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

async function testToggleAutoRenewal() {
  try {
    console.log('Testing toggle auto-renewal API endpoint...\n');

    // First, login to get a token
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@example.com', // Update with actual admin email
      password: 'password123', // Update with actual password
    });

    const token = loginResponse.data.token;
    console.log('✓ Login successful, got token\n');

    // Get current subscription status
    console.log('2. Getting current subscription...');
    const currentResponse = await axios.get(`${API_URL}/subscription/current`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('Current subscription:', {
      planId: currentResponse.data.planId,
      autoRenewal: currentResponse.data.autoRenewal,
      status: currentResponse.data.status,
    });
    console.log('');

    // Toggle auto-renewal
    const newValue = !currentResponse.data.autoRenewal;
    console.log(`3. Toggling auto-renewal to: ${newValue}`);
    
    const toggleResponse = await axios.post(
      `${API_URL}/subscription/toggle-auto-renewal`,
      { autoRenewal: newValue },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✓ Toggle successful:', toggleResponse.data);
    console.log('');

    // Verify the change
    console.log('4. Verifying the change...');
    const verifyResponse = await axios.get(`${API_URL}/subscription/current`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('After toggle:', {
      planId: verifyResponse.data.planId,
      autoRenewal: verifyResponse.data.autoRenewal,
      status: verifyResponse.data.status,
    });

    if (verifyResponse.data.autoRenewal === newValue) {
      console.log('\n✅ SUCCESS: Auto-renewal toggle is working correctly!');
    } else {
      console.log('\n❌ FAILED: Auto-renewal value did not change');
    }
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

testToggleAutoRenewal();
