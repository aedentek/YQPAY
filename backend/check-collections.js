const mongoose = require('mongoose');
require('dotenv').config();

async function checkCollections() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/theater_canteen_db');
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('📚 Available collections:');
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });

    // Check theateruserarrays collection
    console.log('\n🔍 Checking theateruserarrays collection...');
    const arrayUsers = await db.collection('theateruserarrays').find({}).toArray();
    console.log(`Found ${arrayUsers.length} documents in theateruserarrays`);
    
    if (arrayUsers.length > 0) {
      arrayUsers.forEach((doc, index) => {
        console.log(`\n  Document ${index + 1}:`);
        console.log(`    Theater ID: ${doc.theaterId}`);
        console.log(`    Users count: ${doc.users?.length || 0}`);
        if (doc.users && doc.users.length > 0) {
          doc.users.forEach((user, userIndex) => {
            console.log(`\n    User ${userIndex + 1}:`);
            console.log(`      Username: ${user.username}`);
            console.log(`      Email: ${user.email}`);
            console.log(`      PIN: ${user.pin || 'NO PIN'}`);
            console.log(`      Phone: ${user.phoneNumber}`);
          });
        }
      });
    }

    // Check old theaterusers collection
    console.log('\n\n🔍 Checking old theaterusers collection...');
    const oldUsers = await db.collection('theaterusers').find({}).limit(5).toArray();
    console.log(`Found ${oldUsers.length} documents (showing first 5)`);
    
    if (oldUsers.length > 0) {
      oldUsers.forEach((user, index) => {
        console.log(`\n  User ${index + 1}:`);
        console.log(`    Username: ${user.username}`);
        console.log(`    Email: ${user.email}`);
        console.log(`    Has PIN: ${user.pin ? 'YES - ' + user.pin : 'NO'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

checkCollections();
