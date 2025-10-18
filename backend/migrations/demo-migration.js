// Demo script to show theater user migration process
const mongoose = require('mongoose');
require('dotenv').config();

console.log('🔄 Theater User Migration Demo');
console.log('==============================');

async function runDemo() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/theater_canteen_db');
    console.log('✅ Connected successfully!');

    // Import models
    const TheaterUserModel = require('../models/TheaterUserModel');
    const TheaterUserArray = require('../models/TheaterUserArray');
    const Theater = require('../models/Theater');

    console.log('\n📊 Current Database State:');
    
    // Count current individual users
    const totalUsers = await TheaterUserModel.countDocuments();
    console.log(`   Individual User Documents: ${totalUsers}`);

    // Count current array documents
    const arrayDocs = await TheaterUserArray.countDocuments();
    console.log(`   Theater User Array Documents: ${arrayDocs}`);

    // Get theater breakdown
    const theaters = await Theater.find({}, 'name location').lean();
    console.log(`   Total Theaters: ${theaters.length}`);

    console.log('\n🎭 Theater Breakdown:');
    for (const theater of theaters) {
      const userCount = await TheaterUserModel.countDocuments({ theater: theater._id });
      console.log(`   ${theater.name} (${theater.location}): ${userCount} users`);
    }

    console.log('\n📋 Sample User Data Structure:');
    const sampleUser = await TheaterUserModel.findOne({}).lean();
    if (sampleUser) {
      console.log('   Current Structure (Individual Documents):');
      console.log(`   - _id: ${sampleUser._id}`);
      console.log(`   - theater: ${sampleUser.theater}`);
      console.log(`   - username: ${sampleUser.username}`);
      console.log(`   - email: ${sampleUser.email}`);
      console.log(`   - fullName: ${sampleUser.fullName}`);
      console.log(`   - isActive: ${sampleUser.isActive}`);
      console.log(`   - createdAt: ${sampleUser.createdAt}`);
    }

    console.log('\n🎯 Migration Target Structure:');
    console.log('   New Structure (Theater-wise Arrays):');
    console.log('   {');
    console.log('     _id: ObjectId,');
    console.log('     theater: ObjectId (reference),');
    console.log('     userList: [');
    console.log('       {');
    console.log('         _id: ObjectId,');
    console.log('         username: String,');
    console.log('         email: String,');
    console.log('         fullName: String,');
    console.log('         phoneNumber: String,');
    console.log('         role: ObjectId (reference),');
    console.log('         permissions: Object,');
    console.log('         isActive: Boolean,');
    console.log('         createdAt: Date,');
    console.log('         // ... other user fields');
    console.log('       }');
    console.log('     ],');
    console.log('     metadata: {');
    console.log('       totalUsers: Number,');
    console.log('       activeUsers: Number,');
    console.log('       lastUpdated: Date');
    console.log('     }');
    console.log('   }');

    console.log('\n💡 Migration Benefits:');
    console.log('   ✅ Better Performance: Fewer database queries');
    console.log('   ✅ Consistency: Same pattern as roles and QR codes');
    console.log('   ✅ Scalability: Efficient theater-wise data organization');
    console.log('   ✅ Maintenance: Easier to manage and backup');
    console.log('   ✅ Features: Built-in search, pagination, and metadata');

    console.log('\n🚀 Migration Process:');
    console.log('   1. Create backup of existing data');
    console.log('   2. For each theater:');
    console.log('      - Get all users for that theater');
    console.log('      - Create/find theater user array document');
    console.log('      - Convert individual users to array items');
    console.log('      - Update metadata (counts, timestamps)');
    console.log('   3. Verify data integrity');
    console.log('   4. Test new endpoints');
    console.log('   5. Update frontend to use new API');

    console.log('\n🔧 Ready to Migrate:');
    console.log('   Command: node migrations/theater-user-migration.js migrate');
    console.log('   Options: --dry-run (preview), --theater <id> (specific theater)');
    console.log('   Rollback: node migrations/theater-user-migration.js rollback <backup-file>');

    console.log('\n✅ Demo Complete! Ready for migration.');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the demo
runDemo();