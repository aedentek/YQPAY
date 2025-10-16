/**
 * Test the backend /api/settings/image/logo endpoint with detailed logging
 */

const axios = require('axios');
const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://localhost:27017/theater_canteen_db';

async function detailedTest() {
  try {
    // First check database
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    const settingsDoc = await db.collection('settings').findOne({ type: 'general' });
    
    console.log('1. Database Check:');
    console.log('   Has generalConfig?', !!settingsDoc?.generalConfig);
    console.log('   Has logoUrl?', !!settingsDoc?.generalConfig?.logoUrl);
    
    if (settingsDoc?.generalConfig?.logoUrl) {
      console.log('   Logo URL exists:', settingsDoc.generalConfig.logoUrl.substring(0, 100) + '...');
    }
    
    await mongoose.connection.close();
    
    // Then test backend endpoint
    console.log('\n2. Backend Endpoint Test:');
    
    try {
      const response = await axios.get('http://localhost:3001/api/settings/image/logo', {
        maxRedirects: 0,
        validateStatus: () => true
      });
      
      console.log('   Status:', response.status);
      console.log('   Status Text:', response.statusText);
      
      if (response.status === 302 || response.status === 301) {
        console.log('   ✅ Redirect to:', response.headers.location);
      } else if (response.status === 404) {
        console.log('   ❌ 404 - Endpoint not found or settings not available');
        console.log('   Response:', response.data);
      } else if (response.status === 200) {
        console.log('   ✅ Image served successfully');
        console.log('   Content-Type:', response.headers['content-type']);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('   ❌ Cannot connect to backend server');
      } else {
        console.log('   ❌ Error:', error.message);
      }
    }
    
    // Test if route exists at all
    console.log('\n3. Route Existence Test:');
    try {
      const response = await axios.get('http://localhost:3001/api/settings', {
        validateStatus: () => true
      });
      console.log('   /api/settings responds with:', response.status);
    } catch (error) {
      console.log('   ❌ Error accessing /api/settings:', error.message);
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

detailedTest();
