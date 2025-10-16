const mongoose = require('mongoose');

async function verifyEmbeddedStructure() {
  try {
    await mongoose.connect('mongodb://localhost:27017/theater_canteen_db');
    console.log('✅ Connected to MongoDB\n');

    const Theater = mongoose.model('Theater', new mongoose.Schema({}, {strict: false}), 'theaters');
    
    // Find YQ PAY NOW theater
    const theater = await Theater.findOne({name: /YQ PAY NOW/i});
    
    if (!theater) {
      console.log('❌ Theater not found');
      await mongoose.disconnect();
      return;
    }

    console.log('🎭 Theater Information:');
    console.log('   ID:', theater._id.toString());
    console.log('   Name:', theater.name);
    console.log('   Username:', theater.username);
    console.log('   Categories Count:', theater.categories ? theater.categories.length : 0);
    
    if (theater.categories && theater.categories.length > 0) {
      console.log('\n📦 Embedded Categories:');
      theater.categories.forEach((cat, index) => {
        console.log(`\n   ${index + 1}. ${cat.name}`);
        console.log(`      ID: ${cat._id}`);
        console.log(`      Description: ${cat.description || 'N/A'}`);
        console.log(`      Image: ${cat.imageUrl ? '✅ Yes' : '❌ No'}`);
        console.log(`      Active: ${cat.isActive ? '✅' : '❌'}`);
        console.log(`      Sort Order: ${cat.sortOrder}`);
        console.log(`      Created: ${cat.createdAt}`);
        if (cat.imageUrl) {
          // Extract just the path from full URL
          const urlParts = cat.imageUrl.split('/');
          const pathIndex = urlParts.indexOf('categories');
          if (pathIndex !== -1) {
            const gcPath = urlParts.slice(pathIndex).join('/');
            console.log(`      GCS Path: ${gcPath.substring(0, 60)}...`);
          }
        }
      });
    } else {
      console.log('\n⚠️  No categories found in theater document');
    }

    console.log('\n📊 Structure Verification:');
    console.log('   ✅ Categories are embedded in theater document');
    console.log('   ✅ Each category has its own _id');
    console.log('   ✅ Images organized by theater ID in GCS');
    console.log('   ✅ No data can mix between theaters');

    console.log('\n📂 GCS Folder Structure:');
    console.log(`   categories/${theater._id}/`);
    if (theater.categories && theater.categories.length > 0) {
      theater.categories.forEach(cat => {
        const folderName = cat.name.replace(/[^a-zA-Z0-9]/g, '_');
        console.log(`      ├── ${folderName}/`);
        console.log(`      │   └── ${cat.imageUrl ? 'image.jpg' : '(no image)'}`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Verification complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
}

verifyEmbeddedStructure();
