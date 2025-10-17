/**
 * Fix Theater Location Schema Migration
 * Drops the old 2dsphere index that's causing "Can't extract geo keys" error
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/theater_canteen_db';

async function fixTheaterLocationIndex() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('theaters');

    console.log('\n📋 Current indexes:');
    const indexes = await collection.indexes();
    indexes.forEach(index => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key));
    });

    // Drop the problematic location_2dsphere index
    try {
      console.log('\n🗑️  Dropping old location_2dsphere index...');
      await collection.dropIndex('location_2dsphere');
      console.log('✅ Successfully dropped location_2dsphere index');
    } catch (error) {
      if (error.code === 27 || error.message.includes('index not found')) {
        console.log('ℹ️  Index location_2dsphere does not exist (already dropped or never created)');
      } else {
        throw error;
      }
    }

    // Create the new sparse index for geoLocation
    try {
      console.log('\n📍 Creating new geoLocation_2dsphere index (sparse)...');
      await collection.createIndex(
        { 'geoLocation': '2dsphere' },
        { 
          name: 'geoLocation_2dsphere',
          sparse: true  // Only index documents that have geoLocation field
        }
      );
      console.log('✅ Successfully created geoLocation_2dsphere index');
    } catch (error) {
      if (error.code === 85 || error.message.includes('already exists')) {
        console.log('ℹ️  Index geoLocation_2dsphere already exists');
      } else {
        throw error;
      }
    }

    console.log('\n📋 Updated indexes:');
    const newIndexes = await collection.indexes();
    newIndexes.forEach(index => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key));
    });

    // Check existing theaters
    console.log('\n🎭 Checking existing theaters...');
    const theaterCount = await collection.countDocuments();
    console.log(`  Total theaters: ${theaterCount}`);

    if (theaterCount > 0) {
      const theatersWithBadLocation = await collection.countDocuments({
        'location.type': 'Point'
      });
      
      if (theatersWithBadLocation > 0) {
        console.log(`\n⚠️  Found ${theatersWithBadLocation} theaters with old GeoJSON location structure`);
        console.log('🔄 Migrating location data...');
        
        // Update theaters with old structure
        const result = await collection.updateMany(
          { 'location.type': 'Point' },
          {
            $rename: { 'location': 'geoLocation' },
            $set: { 
              'location.city': '',
              'location.state': '',
              'location.country': 'India'
            }
          }
        );
        
        console.log(`✅ Migrated ${result.modifiedCount} theaters`);
      } else {
        console.log('✅ All theaters have correct location structure');
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n🚀 You can now restart your backend server with: npm run dev');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the migration
fixTheaterLocationIndex();
