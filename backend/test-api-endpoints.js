const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

const BASE_URL = 'http://localhost:5000/api';
const THEATER_ID = '68f8837a541316c6ad54b79f';
const AUTH_TOKEN = 'your-auth-token-here'; // You need to get this from localStorage

async function testKioskTypeEndpoints() {
  console.log('\n🧪 TESTING KIOSK TYPE API ENDPOINTS\n');

  try {
    // TEST 1: GET - Fetch kiosk types
    console.log('========== TEST 1: GET /api/theater-kiosk-types/:theaterId ==========');
    const getResponse = await fetch(`${BASE_URL}/theater-kiosk-types/${THEATER_ID}?page=1&limit=10`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const getData = await getResponse.json();
    console.log('Status:', getResponse.status);
    console.log('Response:', JSON.stringify(getData, null, 2));

    // TEST 2: POST - Create kiosk type (without auth will fail, that's expected)
    console.log('\n========== TEST 2: POST /api/theater-kiosk-types/:theaterId ==========');
    const postResponse = await fetch(`${BASE_URL}/theater-kiosk-types/${THEATER_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      body: JSON.stringify({
        name: 'API Test Kiosk Type',
        description: 'Created via API test',
        isActive: true,
        sortOrder: 0
      })
    });
    const postData = await postResponse.json();
    console.log('Status:', postResponse.status);
    console.log('Response:', JSON.stringify(postData, null, 2));
    console.log('Note: This may fail due to missing auth token, which is expected');

    console.log('\n✅ API ENDPOINT TESTS COMPLETE');
    console.log('GET endpoint working:', getResponse.status === 200);
    console.log('Response structure matches expected format:', getData.success !== undefined);

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testKioskTypeEndpoints();
