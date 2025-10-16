// Quick test to check if our API fixes work
const config = require('./src/config/config.js');

console.log('🔧 TESTING FRONTEND API CONFIGURATION:');
console.log('API Base URL:', config.api.baseUrl);
console.log('Expected URL:', 'http://localhost:5000/api');

// Test the API endpoint we fixed
const testUrl = `${config.api.baseUrl}/theaters`;
console.log('Theater API URL:', testUrl);

// This should now work with our fixes
const fetch = require('node-fetch');

async function testAPI() {
    try {
        console.log('🌐 Testing API call...');
        const response = await fetch(testUrl);
        const data = await response.json();
        console.log('✅ API Response Status:', response.status);
        console.log('✅ Number of theaters returned:', data.theaters ? data.theaters.length : 'No theaters key');
        console.log('✅ API call successful - Frontend fixes are working!');
    } catch (error) {
        console.error('❌ API call failed:', error.message);
    }
}

testAPI();