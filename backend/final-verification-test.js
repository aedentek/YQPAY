/**
 * FINAL TEST - Verify everything works on correct port (5000)
 */

const axios = require('axios');
const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://localhost:27017/theater_canteen_db';
const CORRECT_PORT = 5000; // Based on .env file
const API_BASE_URL = `http://localhost:${CORRECT_PORT}`;

async function finalVerification() {
  console.log('\n🎯 FINAL VERIFICATION - Settings Logo/Favicon Fix\n');
  console.log('='.repeat(70));
  console.log(`Testing backend on: ${API_BASE_URL}\n`);

  let passed = 0;
  let failed = 0;

  try {
    // Connect to database
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // TEST 1: Database has logo
    console.log('1️⃣ Database Structure');
    console.log('-'.repeat(70));
    const settingsDoc = await db.collection('settings').findOne({ type: 'general' });
    
    if (settingsDoc?.generalConfig?.logoUrl) {
      console.log('✅ PASS: Logo URL exists in database');
      console.log(`   ${settingsDoc.generalConfig.logoUrl.substring(0, 80)}...`);
      passed++;
    } else {
      console.log('❌ FAIL: No logo URL in database');
      failed++;
    }

    // TEST 2: Backend endpoint works
    console.log('\n2️⃣ Backend Endpoint Test');
    console.log('-'.repeat(70));
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/settings/image/logo`, {
        maxRedirects: 0,
        validateStatus: () => true
      });

      if (response.status === 302 || response.status === 301) {
        console.log('✅ PASS: Backend redirects to GCS URL');
        console.log(`   Redirect to: ${response.headers.location.substring(0, 80)}...`);
        passed++;
      } else if (response.status === 200) {
        console.log('✅ PASS: Backend returns image directly');
        passed++;
      } else {
        console.log(`❌ FAIL: Unexpected status ${response.status}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ FAIL: ${error.message}`);
      failed++;
    }

    // TEST 3: GCS URL is accessible
    console.log('\n3️⃣ GCS URL Accessibility');
    console.log('-'.repeat(70));
    
    if (settingsDoc?.generalConfig?.logoUrl) {
      try {
        const gcsResponse = await axios.head(settingsDoc.generalConfig.logoUrl);
        if (gcsResponse.status === 200) {
          console.log('✅ PASS: GCS URL is accessible');
          console.log(`   Content-Type: ${gcsResponse.headers['content-type']}`);
          passed++;
        } else {
          console.log(`❌ FAIL: GCS returns ${gcsResponse.status}`);
          failed++;
        }
      } catch (error) {
        console.log(`❌ FAIL: Cannot access GCS URL - ${error.message}`);
        failed++;
      }
    } else {
      console.log('⚠️  SKIP: No logo URL to test');
      passed++;
    }

    // TEST 4: Frontend code uses correct URL construction
    console.log('\n4️⃣ Frontend Code Check');
    console.log('-'.repeat(70));
    
    const fs = require('fs');
    const path = require('path');
    
    const settingsPagePath = path.join(__dirname, '../frontend/src/pages/Settings.js');
    const contextPath = path.join(__dirname, '../frontend/src/contexts/SettingsContext.js');
    
    const settingsContent = fs.readFileSync(settingsPagePath, 'utf8');
    const contextContent = fs.readFileSync(contextPath, 'utf8');
    
    const settingsUsesGetApiUrl = settingsContent.includes('getApiUrl(\'/settings/image/logo\')');
    const contextUsesGetApiUrl = contextContent.includes('getApiUrl(\'/settings/image/logo\')');
    const contextHasImport = contextContent.includes('getApiUrl');
    
    if (settingsUsesGetApiUrl && contextUsesGetApiUrl && contextHasImport) {
      console.log('✅ PASS: Frontend code uses getApiUrl() correctly');
      passed++;
    } else {
      console.log('❌ FAIL: Frontend code has issues');
      if (!settingsUsesGetApiUrl) console.log('   - Settings.js not using getApiUrl');
      if (!contextUsesGetApiUrl) console.log('   - SettingsContext.js not using getApiUrl');
      if (!contextHasImport) console.log('   - SettingsContext.js missing getApiUrl import');
      failed++;
    }

    // SUMMARY
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED!');
      console.log('\n📋 To see the fix in action:');
      console.log('   1. Make sure backend is running on port 5000');
      console.log('   2. Make sure frontend is running (npm start)');
      console.log('   3. Clear browser cache (Ctrl+Shift+Delete)');
      console.log('   4. Navigate to Settings page');
      console.log('   5. Upload a logo (or refresh if already uploaded)');
      console.log('   6. Check browser tab - logo should appear!');
      console.log('');
      console.log('💡 Expected favicon URL in browser:');
      console.log(`   ${API_BASE_URL}/api/settings/image/logo`);
      console.log('');
    } else {
      console.log('\n⚠️  Some tests failed. Review output above.');
    }

  } catch (error) {
    console.error('\n❌ Test error:', error);
    failed++;
  } finally {
    await mongoose.connection.close();
    console.log('📡 Disconnected from MongoDB\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

finalVerification();
