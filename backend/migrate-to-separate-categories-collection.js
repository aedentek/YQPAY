const mongoose = require('mongoose');
require('dotenv').config({ path: '_1.env' });

const Theater = require('./models/Theater');
const Category = require('./models/Category');

const THEATER_ID = '68ed25e6962cb3e997acc163';

async function migrateCategoriesBack() {
  try {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  Migrate Categories Back to Collection  ║');
    console.log('╚════════════════════════════════════════╝\n');

    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!\n');

    // Find the theater
    console.log('🔍 Finding theater:', THEATER_ID);
    const theater = await Theater.findById(THEATER_ID);
    
    if (!theater) {
      console.log('❌ Theater not found!');
      process.exit(1);
    }

    console.log('✅ Found theater:', theater.theaterName);
    console.log('   Categories in Theater.categories:', theater.categories?.length || 0);

    if (!theater.categories || theater.categories.length === 0) {
      console.log('⚠️  No categories found in Theater.categories array');
      process.exit(0);
    }

    // Transform categories from embedded format to categoryList format
    console.log('\n📦 Transforming categories...');
    const categoryList = theater.categories.map(cat => ({
      _id: cat._id,
      categoryName: cat.name || cat.categoryName,
      categoryType: cat.categoryType || 'Food',
      imageUrl: cat.imageUrl || null,
      isActive: cat.isActive !== undefined ? cat.isActive : true,
      sortOrder: cat.sortOrder || 0,
      items: cat.items || [],
      description: cat.description || '',
      createdAt: cat.createdAt || new Date(),
      updatedAt: cat.updatedAt || new Date()
    }));

    console.log('✅ Transformed', categoryList.length, 'categories\n');

    // Check if Category document already exists for this theater
    let categoryDoc = await Category.findOne({ theater: THEATER_ID });

    if (categoryDoc) {
      console.log('📝 Updating existing Category document...');
      categoryDoc.categoryList = categoryList;
      categoryDoc.metadata = {
        totalCategories: categoryList.length,
        activeCategories: categoryList.filter(cat => cat.isActive).length,
        lastUpdatedAt: new Date()
      };
      await categoryDoc.save();
    } else {
      console.log('📝 Creating new Category document...');
      categoryDoc = new Category({
        theater: THEATER_ID,
        categoryList: categoryList,
        metadata: {
          totalCategories: categoryList.length,
          activeCategories: categoryList.filter(cat => cat.isActive).length,
          lastUpdatedAt: new Date()
        },
        isActive: true
      });
      await categoryDoc.save();
    }

    console.log('✅ Categories saved to "categories" collection!\n');

    // Display migrated categories
    console.log('═══════════════════════════════════════');
    console.log('📊 MIGRATED CATEGORIES:');
    console.log('═══════════════════════════════════════\n');
    
    categoryList.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.isActive ? '🟢' : '⚪'} ${cat.categoryName}`);
      console.log(`   ID: ${cat._id}`);
      console.log(`   Type: ${cat.categoryType}`);
      if (cat.description) console.log(`   Description: ${cat.description}`);
      console.log('');
    });

    console.log('═══════════════════════════════════════');
    console.log('📊 SUMMARY:');
    console.log('═══════════════════════════════════════');
    console.log('Database:', mongoose.connection.name);
    console.log('Collection: categories');
    console.log('Theater:', theater.theaterName);
    console.log('Total Categories Migrated:', categoryList.length);
    console.log('Active:', categoryList.filter(cat => cat.isActive).length, '🟢');
    console.log('Inactive:', categoryList.filter(cat => !cat.isActive).length, '⚪');

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  NEXT STEPS:                           ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('1. ✅ Categories now in "categories" collection');
    console.log('2. 🔄 Backend routes will be updated to use Category model');
    console.log('3. 🧹 Theater.categories array will be cleared');
    console.log('4. 🌐 Frontend will fetch from /api/categories');
    console.log('\n🎉 Migration complete!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Connection closed.');
  }
}

migrateCategoriesBack();
