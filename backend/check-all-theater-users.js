const mongoose = require('mongoose');
require('dotenv').config();

async function checkTheaterUsers() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/theater_canteen_db');
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    
    // Check theaterusers collection (it seems to be using a different collection name)
    console.log('🔍 Checking all collections with "theater" in the name...\n');
    const collections = await db.listCollections().toArray();
    const theaterColls = collections.filter(c => c.name.toLowerCase().includes('theater') || c.name.toLowerCase().includes('user'));
    
    console.log('Found collections:', theaterColls.map(c => c.name).join(', '));
    
    for (const coll of theaterColls) {
      console.log(`\n\n📚 Collection: ${coll.name}`);
      console.log('='.repeat(50));
      
      const docs = await db.collection(coll.name).find({}).toArray();
      console.log(`Documents found: ${docs.length}`);
      
      if (docs.length > 0) {
        docs.forEach((doc, docIndex) => {
          console.log(`\n📄 Document ${docIndex + 1}:`);
          console.log(`   _id: ${doc._id}`);
          console.log(`   theaterId: ${doc.theaterId || 'N/A'}`);
          
          // Check if it has a users array
          if (doc.users && Array.isArray(doc.users)) {
            console.log(`   ✅ Has users array with ${doc.users.length} users`);
            doc.users.forEach((user, userIndex) => {
              console.log(`\n   👤 User ${userIndex + 1}:`);
              console.log(`      Username: ${user.username}`);
              console.log(`      Email: ${user.email}`);
              console.log(`      🔢 PIN: ${user.pin ? '✅ ' + user.pin : '❌ NO PIN'}`);
              console.log(`      Phone: ${user.phoneNumber}`);
              console.log(`      Full Name: ${user.fullName}`);
              console.log(`      Active: ${user.isActive}`);
            });
          } else if (doc.username) {
            // It's a flat user document
            console.log(`   👤 Username: ${doc.username}`);
            console.log(`   📧 Email: ${doc.email}`);
            console.log(`   🔢 PIN: ${doc.pin ? '✅ ' + doc.pin : '❌ NO PIN'}`);
            console.log(`   📱 Phone: ${doc.phoneNumber}`);
          }
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n\n🔌 MongoDB connection closed');
  }
}

checkTheaterUsers();
