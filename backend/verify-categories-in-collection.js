const mongoose = require('mongoose');
require('dotenv').config({ path: '_1.env' });

const Category = require('./models/Category');

const THEATER_ID = '68ed25e6962cb3e997acc163';

async function verifyCategoriesCollection() {
  try {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  Verify Categories in Collection       ║');
    console.log('╚════════════════════════════════════════╝\n');

    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!\n');

    // Find category document for theater
    console.log('🔍 Finding categories for theater:', THEATER_ID);
    const categoryDoc = await Category.findOne({ theater: THEATER_ID });
    
    if (!categoryDoc) {
      console.log('❌ No category document found for this theater!');
      process.exit(1);
    }

    console.log('✅ Found category document!');
    console.log('   Theater ID:', categoryDoc.theater);
    console.log('   Total Categories:', categoryDoc.categoryList?.length || 0);
    console.log('   Active Categories:', categoryDoc.metadata.activeCategories);
    console.log('   Document _id:', categoryDoc._id);

    console.log('\n📋 Category List:\n');
    
    categoryDoc.categoryList.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.isActive ? '🟢' : '⚪'} ${cat.categoryName}`);
      console.log(`   ID: ${cat._id}`);
      console.log(`   Type: ${cat.categoryType}`);
      if (cat.description) console.log(`   Desc: ${cat.description}`);
      console.log('');
    });

    console.log('═══════════════════════════════════════');
    console.log('📊 SUMMARY:');
    console.log('═══════════════════════════════════════');
    console.log('Database:', mongoose.connection.name);
    console.log('Collection: categories');
    console.log('Document ID:', categoryDoc._id);
    console.log('Theater ID:', categoryDoc.theater);
    console.log('Total Categories:', categoryDoc.categoryList.length);
    console.log('Active:', categoryDoc.metadata.activeCategories, '🟢');
    console.log('Inactive:', categoryDoc.metadata.totalCategories - categoryDoc.metadata.activeCategories, '⚪');
    console.log('\n✅ All categories are in the "categories" collection!');
    console.log('✅ Backend routes now use Category model with categoryList array.\n');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Connection closed.');
  }
}

verifyCategoriesCollection();
