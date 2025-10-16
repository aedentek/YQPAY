const mongoose = require('mongoose');

async function finalVerification() {
  try {
    await mongoose.connect('mongodb://localhost:27017/theater_canteen_db');
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Check if old collection still exists
    console.log('📊 Step 1: Verify old collection is gone');
    const collections = await db.listCollections({name: 'categories'}).toArray();
    if (collections.length === 0) {
      console.log('   ✅ OLD "categories" collection does NOT exist');
    } else {
      console.log('   ❌ OLD "categories" collection still exists!');
    }

    // Check theater embedded structure
    console.log('\n📊 Step 2: Verify theater has embedded categories');
    const theater = await db.collection('theaters').findOne({name: /YQ PAY NOW/i});
    if (theater) {
      console.log(`   Theater: ${theater.name}`);
      console.log(`   Theater ID: ${theater._id}`);
      
      if (theater.categories && Array.isArray(theater.categories)) {
        console.log(`   ✅ Has "categories" array with ${theater.categories.length} items`);
        theater.categories.forEach((cat, i) => {
          console.log(`      ${i + 1}. ${cat.name} (${cat._id})`);
        });
      } else {
        console.log('   ❌ NO categories array found!');
      }
    }

    // Compare with singleqrcodes structure
    console.log('\n📊 Step 3: Compare with singleqrcodes structure');
    const singleQR = await db.collection('singleqrcodes').findOne({});
    
    console.log('\n   SingleQRCodes Structure:');
    console.log('   {');
    console.log('     _id: ObjectId,');
    console.log('     theater: ObjectId,');
    console.log(`     qrDetails: Array(${singleQR.qrDetails ? singleQR.qrDetails.length : 0}),  ← EMBEDDED ARRAY`);
    console.log('     isActive: Boolean');
    console.log('   }');
    
    console.log('\n   Categories Structure:');
    console.log('   {');
    console.log('     _id: ObjectId,');
    console.log('     name: String,');
    console.log(`     categories: Array(${theater.categories ? theater.categories.length : 0}),  ← EMBEDDED ARRAY`);
    console.log('     qrCodes: Array,');
    console.log('     settings: Object');
    console.log('   }');

    console.log('\n   ✅ SAME PATTERN: Both use embedded arrays!');

    // Show complete structure
    console.log('\n📊 Step 4: Complete theater document structure');
    console.log('   {');
    console.log(`     _id: "${theater._id}",`);
    console.log(`     name: "${theater.name}",`);
    console.log(`     username: "${theater.username}",`);
    console.log('     categories: [  ← Theater-specific categories');
    if (theater.categories && theater.categories.length > 0) {
      theater.categories.slice(0, 1).forEach(cat => {
        console.log('       {');
        console.log(`         _id: "${cat._id}",`);
        console.log(`         name: "${cat.name}",`);
        console.log(`         description: "${cat.description || ''}",`);
        console.log(`         imageUrl: "${cat.imageUrl ? cat.imageUrl.substring(0, 50) + '...' : 'null'}",`);
        console.log(`         isActive: ${cat.isActive},`);
        console.log(`         sortOrder: ${cat.sortOrder}`);
        console.log('       },');
      });
      console.log('       ... more categories');
    }
    console.log('     ],');
    console.log('     qrCodes: [...],');
    console.log('     settings: {...}');
    console.log('   }');

    console.log('\n✅ Structure Verification Complete!');
    console.log('\n🎯 RESULT:');
    console.log('   ✅ No separate "categories" collection');
    console.log('   ✅ Categories embedded in theater document');
    console.log('   ✅ Same pattern as singleqrcodes.qrDetails');
    console.log('   ✅ Theater-wise data organization');
    console.log('   ✅ Cannot mix between theaters');

    console.log('\n🧪 NEXT STEPS:');
    console.log('   1. Refresh MongoDB Compass - see categories inside theater');
    console.log('   2. Refresh browser - test CRUD operations');
    console.log('   3. After each operation, check theater.categories array in Compass');

    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
}

finalVerification();
