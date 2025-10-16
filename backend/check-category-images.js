const mongoose = require('mongoose');
require('dotenv').config({ path: '_1.env' });

const Category = require('./models/Category');

const THEATER_ID = '68ed25e6962cb3e997acc163';

async function checkCategoryImages() {
  try {
    console.log('\n🔍 Checking Category Images...\n');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const categoryDoc = await Category.findOne({ theater: THEATER_ID });
    
    if (!categoryDoc) {
      console.log('❌ No category document found');
      process.exit(1);
    }

    console.log('📦 Categories for Theater:', THEATER_ID);
    console.log('Total Categories:', categoryDoc.categoryList?.length || 0);
    console.log('\n');

    categoryDoc.categoryList.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.categoryName}`);
      console.log(`   _id: ${cat._id}`);
      console.log(`   categoryType: ${cat.categoryType}`);
      console.log(`   imageUrl: ${cat.imageUrl || 'NOT SET'}`);
      console.log(`   isActive: ${cat.isActive}`);
      console.log(`   sortOrder: ${cat.sortOrder}`);
      console.log('');
    });

    // Log the raw data
    console.log('\n📄 Raw Category Data:');
    console.log(JSON.stringify(categoryDoc.categoryList, null, 2));

    await mongoose.connection.close();
    console.log('\n✅ Done!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkCategoryImages();
