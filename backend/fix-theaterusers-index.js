/**
 * Fix Theater Users Collection - Drop Old Username Index
 * 
 * This script removes the old username_1 unique index that conflicts with the new array-based structure
 * The old index was created when theater users were stored as individual documents
 * The new structure uses an array of users within a single document per theater
 */

const mongoose = require('mongoose');
const mongodbConfig = require('./config/mongodb.json');

async function fixTheaterUsersIndex() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(mongodbConfig.uri);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collectionName = 'theaterusers';

    // Check if collection exists
    const collections = await db.listCollections({ name: collectionName }).toArray();
    if (collections.length === 0) {
      console.log(`⚠️  Collection "${collectionName}" does not exist. Nothing to fix.`);
      await mongoose.connection.close();
      return;
    }

    const collection = db.collection(collectionName);

    // Get all indexes
    console.log('\n📋 Current indexes on theaterusers collection:');
    const indexes = await collection.indexes();
    indexes.forEach(index => {
      console.log(`   - ${index.name}:`, JSON.stringify(index.key));
    });

    // Check for problematic username index
    const usernameIndex = indexes.find(idx => idx.name === 'username_1');
    
    if (usernameIndex) {
      console.log('\n⚠️  Found old username_1 index that conflicts with array structure');
      console.log('🗑️  Dropping username_1 index...');
      
      await collection.dropIndex('username_1');
      console.log('✅ Successfully dropped username_1 index');
    } else {
      console.log('\n✅ No conflicting username_1 index found');
    }

    // Check for other potentially problematic indexes
    const problematicIndexes = indexes.filter(idx => 
      idx.name !== '_id_' && 
      idx.name !== 'theaterId_1' &&
      !idx.name.startsWith('users.')
    );

    if (problematicIndexes.length > 0) {
      console.log('\n⚠️  Found other potentially problematic indexes:');
      for (const index of problematicIndexes) {
        if (index.name !== 'username_1') { // Already handled
          console.log(`   - ${index.name}:`, JSON.stringify(index.key));
          console.log(`   🗑️  Dropping ${index.name}...`);
          try {
            await collection.dropIndex(index.name);
            console.log(`   ✅ Dropped ${index.name}`);
          } catch (error) {
            console.log(`   ⚠️  Could not drop ${index.name}:`, error.message);
          }
        }
      }
    }

    // Show final indexes
    console.log('\n📋 Final indexes on theaterusers collection:');
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach(index => {
      console.log(`   - ${index.name}:`, JSON.stringify(index.key));
    });

    console.log('\n✅ Theater users index fix completed successfully!');
    console.log('💡 You can now create users without the duplicate key error');

  } catch (error) {
    console.error('❌ Error fixing theater users index:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the fix
if (require.main === module) {
  fixTheaterUsersIndex()
    .then(() => {
      console.log('\n🎉 Script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixTheaterUsersIndex };
