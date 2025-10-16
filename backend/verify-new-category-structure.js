const mongoose = require('mongoose');

async function verifyNewStructure() {
  try {
    await mongoose.connect('mongodb://localhost:27017/theater_canteen_db');
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    console.log('📊 NEW CATEGORY STRUCTURE VERIFICATION\n');

    // Check categories collection
    const categories = await db.collection('categories').find({}).toArray();
    console.log(`Found ${categories.length} category document(s)\n`);

    if (categories.length === 0) {
      console.log('⚠️  No category documents yet.');
      console.log('   This is expected - documents are created on first category add.');
      console.log('\n✅ Structure is ready!');
      console.log('   Go to frontend and add a category to create the document.');
    } else {
      categories.forEach((doc, index) => {
        console.log(`📄 Document ${index + 1}:`);
        console.log(`   _id: ${doc._id}`);
        console.log(`   theater: ${doc.theater}`);
        console.log(`   categoryList: ${doc.categoryList ? doc.categoryList.length : 0} categories`);
        
        if (doc.categoryList && doc.categoryList.length > 0) {
          console.log(`\n   📦 Categories in list:`);
          doc.categoryList.forEach((cat, i) => {
            console.log(`      ${i + 1}. ${cat.categoryName} (${cat.categoryType})`);
            console.log(`         - _id: ${cat._id}`);
            console.log(`         - Image: ${cat.imageUrl ? '✅ Yes' : '❌ No'}`);
            console.log(`         - Items: ${cat.items ? cat.items.length : 0}`);
            if (cat.items && cat.items.length > 0) {
              console.log(`         - Item List:`);
              cat.items.forEach((item, j) => {
                console.log(`           ${j + 1}. ${item.itemName} - ₹${item.price}`);
              });
            }
          });
        }
        
        console.log(`\n   📊 Metadata:`);
        console.log(`      - Total Categories: ${doc.metadata?.totalCategories || 0}`);
        console.log(`      - Active Categories: ${doc.metadata?.activeCategories || 0}`);
        console.log(`      - Last Updated: ${doc.metadata?.lastUpdatedAt || 'N/A'}`);
        console.log(`\n   ✅ isActive: ${doc.isActive}`);
        console.log(`   📅 Created: ${doc.createdAt}`);
        console.log(`   📅 Updated: ${doc.updatedAt}\n`);
      });
    }

    console.log('🎯 EXPECTED STRUCTURE:');
    console.log('   {');
    console.log('     _id: ObjectId,');
    console.log('     theater: ObjectId,  ← One per theater');
    console.log('     categoryList: [     ← Array of categories');
    console.log('       {');
    console.log('         _id: ObjectId,');
    console.log('         categoryName: "Popcorn",');
    console.log('         categoryType: "Food",');
    console.log('         imageUrl: "https://...",');
    console.log('         items: [        ← Nested items array');
    console.log('           {');
    console.log('             _id: ObjectId,');
    console.log('             itemName: "Butter Popcorn",');
    console.log('             price: 120,');
    console.log('             imageUrl: "https://..."');
    console.log('           }');
    console.log('         ]');
    console.log('       }');
    console.log('     ],');
    console.log('     metadata: {');
    console.log('       totalCategories: Number,');
    console.log('       activeCategories: Number');
    console.log('     }');
    console.log('   }');

    console.log('\n🧪 NEXT STEPS:');
    console.log('   1. Refresh browser and go to Categories page');
    console.log('   2. Add a new category with image');
    console.log('   3. Refresh Compass - see document created');
    console.log('   4. Check categoryList array in document');

    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
}

verifyNewStructure();
