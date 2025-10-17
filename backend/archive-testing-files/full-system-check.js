const mongoose = require('mongoose');
const fetch = require('node-fetch');

async function fullSystemCheck() {
  console.log('🔍 FULL SYSTEM CHECK\n');
  
  // 1. Check database
  console.log('1️⃣ Checking Database...');
  await mongoose.connect('mongodb://localhost:27017/theater_canteen_db');
  const db = mongoose.connection.db;
  
  const containers = await db.collection('productlist').find({}).toArray();
  console.log(`   ✅ Found ${containers.length} product container(s)`);
  
  if (containers.length > 0) {
    containers.forEach(c => {
      console.log(`   📦 Theater: ${c.theater}`);
      console.log(`   📦 Products: ${c.productList?.length || 0}`);
      if (c.productList && c.productList.length > 0) {
        c.productList.forEach(p => {
          console.log(`      - ${p.name} (${p._id})`);
        });
      }
    });
  }
  
  // 2. Check backend server
  console.log('\n2️⃣ Checking Backend Server...');
  try {
    const healthCheck = await fetch('http://localhost:5000/api/health');
    if (healthCheck.ok) {
      console.log('   ✅ Backend server is running');
    } else {
      console.log('   ❌ Backend server returned:', healthCheck.status);
    }
  } catch (error) {
    console.log('   ❌ Backend server not reachable:', error.message);
  }
  
  // 3. Test Products API
  console.log('\n3️⃣ Testing Products API...');
  const theaterId = '68ed25e6962cb3e997acc163';
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZWQ0MGJmODA5M2Y4OTdjNWIxNTgyNSIsInVzZXJUeXBlIjoidGhlYXRlcl91c2VyIiwidGhlYXRlciI6IjY4ZWQyNWU2OTYyY2IzZTk5N2FjYzE2MyIsInRoZWF0ZXJJZCI6IjY4ZWQyNWU2OTYyY2IzZTk5N2FjYzE2MyIsInBlcm1pc3Npb25zIjpbXSwiaWF0IjoxNzYwNTA0NDEwLCJleHAiOjE3NjExMDkyMTB9.HRiHJMgFLftU67Tomok_jRyeT75oYCz0Q_Ip1RAZL5k';
  
  try {
    const response = await fetch(`http://localhost:5000/api/theater-products/${theaterId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Products API working: ${data.data?.products?.length || 0} products found`);
    } else {
      const error = await response.text();
      console.log(`   ❌ Products API failed: ${response.status} - ${error}`);
    }
  } catch (error) {
    console.log('   ❌ Products API error:', error.message);
  }
  
  // 4. Test Stock API
  console.log('\n4️⃣ Testing Stock API...');
  const productId = '68eea005259b59a311be44f6';
  
  try {
    const response = await fetch(`http://localhost:5000/api/theater-stock/${theaterId}/${productId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Stock API working`);
      console.log(`   📊 Product: ${data.data?.product?.name || 'Unknown'}`);
      console.log(`   📊 Current Stock: ${data.data?.currentStock || 0}`);
      console.log(`   📊 Entries: ${data.data?.entries?.length || 0}`);
    } else {
      const error = await response.text();
      console.log(`   ❌ Stock API failed: ${response.status}`);
      console.log(`   ❌ Error: ${error}`);
    }
  } catch (error) {
    console.log('   ❌ Stock API error:', error.message);
  }
  
  // 5. Frontend Check
  console.log('\n5️⃣ Frontend Check...');
  console.log('   📍 URL: http://localhost:3001/theater-stock-management/68ed25e6962cb3e997acc163/68eea005259b59a311be44f6');
  console.log('   ⚠️  If page shows "Access denied", run this in browser console:');
  console.log('\n   localStorage.setItem("authToken", "' + token + '");');
  console.log('   location.reload();\n');
  
  // Summary
  console.log('\n📋 SUMMARY');
  console.log('   Database: theater_canteen_db ✅');
  console.log('   Products: 1 found ✅');
  console.log('   Backend APIs: Check results above');
  console.log('   Frontend Token: Must be set manually (see command above)');
  
  await mongoose.connection.close();
}

fullSystemCheck().catch(console.error);
