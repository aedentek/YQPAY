const mongoose = require('mongoose');
require('dotenv').config();

async function migrateCategoriesToTheaters() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/theater_canteen_db');
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Get all categories
    const categories = await db.collection('categories').find({}).toArray();
    console.log(`\n📊 Found ${categories.length} categories to migrate`);

    if (categories.length === 0) {
      console.log('✅ No categories to migrate');
      await mongoose.disconnect();
      return;
    }

    // Group categories by theater
    const categoriesByTheater = {};
    categories.forEach(cat => {
      const theaterId = cat.theater || cat.theaterId;
      if (theaterId) {
        const theaterIdStr = theaterId.toString();
        if (!categoriesByTheater[theaterIdStr]) {
          categoriesByTheater[theaterIdStr] = [];
        }
        categoriesByTheater[theaterIdStr].push({
          _id: cat._id,
          name: cat.name,
          description: cat.description || '',
          imageUrl: cat.imageUrl || null,
          color: cat.color || '#6B8E98',
          sortOrder: cat.sortOrder || 0,
          isActive: cat.isActive !== undefined ? cat.isActive : true,
          createdAt: cat.createdAt || new Date(),
          updatedAt: cat.updatedAt || new Date()
        });
      }
    });

    console.log(`\n📊 Categories grouped by ${Object.keys(categoriesByTheater).length} theaters`);

    // Update each theater with its categories
    let successCount = 0;
    let errorCount = 0;

    for (const [theaterId, cats] of Object.entries(categoriesByTheater)) {
      try {
        const theater = await db.collection('theaters').findOne({ 
          _id: new mongoose.Types.ObjectId(theaterId) 
        });

        if (!theater) {
          console.log(`⚠️  Theater not found: ${theaterId}`);
          errorCount++;
          continue;
        }

        // Update theater with categories array
        await db.collection('theaters').updateOne(
          { _id: new mongoose.Types.ObjectId(theaterId) },
          { 
            $set: { 
              categories: cats,
              updatedAt: new Date()
            } 
          }
        );

        console.log(`✅ Migrated ${cats.length} categories to theater: ${theater.name}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error migrating theater ${theaterId}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Success: ${successCount} theaters updated`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📦 Total categories migrated: ${categories.length}`);

    // Ask user before removing old collection
    console.log(`\n⚠️  Old 'categories' collection still exists.`);
    console.log(`   You can manually delete it after verifying the migration.`);
    console.log(`   Run: db.categories.drop() in MongoDB shell`);

    await mongoose.disconnect();
    console.log('\n✅ Migration completed!');

  } catch (error) {
    console.error('❌ Migration error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

migrateCategoriesToTheaters();
