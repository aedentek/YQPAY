const mongoose = require('mongoose');
require('dotenv').config();

async function checkSpecificTheater() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/theater_canteen_db');
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const theaterId = '68f8618e4219b2b112f72899';
    
    console.log(`🔍 Looking for theater users with ID: ${theaterId}\n`);
    
    // Try different collection names
    const collectionNames = [
      'theateruserarrays',
      'theaterusers', 
      'theater_users',
      'theaterUsers',
      'TheaterUserArrays'
    ];
    
    for (const collName of collectionNames) {
      try {
        console.log(`\n📚 Trying collection: ${collName}`);
        const result = await db.collection(collName).findOne({ 
          theaterId: new mongoose.Types.ObjectId(theaterId) 
        });
        
        if (result) {
          console.log(`✅ FOUND in ${collName}!`);
          console.log(JSON.stringify(result, null, 2));
          
          if (result.users && Array.isArray(result.users)) {
            console.log(`\n👥 Users (${result.users.length}):`);
            result.users.forEach((user, index) => {
              console.log(`\n  ${index + 1}. ${user.username}`);
              console.log(`     🔢 PIN: ${user.pin || 'NO PIN'}`);
              console.log(`     📧 Email: ${user.email}`);
              console.log(`     📱 Phone: ${user.phoneNumber}`);
            });
          }
          break;
        } else {
          console.log(`   ❌ Not found`);
        }
      } catch (err) {
        console.log(`   ⚠️  Error: ${err.message}`);
      }
    }
    
    // Also list all documents in theaterusers to see the structure
    console.log(`\n\n📊 All documents in 'theaterusers' collection:`);
    const allDocs = await db.collection('theaterusers').find({}).toArray();
    console.log(`Found ${allDocs.length} documents`);
    allDocs.forEach((doc, index) => {
      console.log(`\nDocument ${index + 1}:`);
      console.log(JSON.stringify(doc, null, 2));
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

checkSpecificTheater();
