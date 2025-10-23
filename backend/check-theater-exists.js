/**
 * Check if theater exists in database
 */

const mongoose = require('mongoose');
const mongodbConfig = require('./config/mongodb.json');

async function checkTheater() {
  try {
    await mongoose.connect(mongodbConfig.uri);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const theaterId = new mongoose.Types.ObjectId("68ed25e6962cb3e997acc163");
    
    console.log('\n🔍 Checking theater ID:', theaterId);
    
    // Check in theaters collection
    const theater = await db.collection('theaters').findOne({ _id: theaterId });
    
    if (theater) {
      console.log('\n✅ THEATER EXISTS in database:');
      console.log('   - Name:', theater.name);
      console.log('   - Username:', theater.username);
      console.log('   - Email:', theater.email);
      console.log('   - Status:', theater.status);
      console.log('   - Created:', theater.createdAt);
    } else {
      console.log('\n❌ THEATER DOES NOT EXIST in database!');
      console.log('   - This is a GHOST theater ID');
      console.log('   - The page shows because frontend doesn\'t validate theater existence');
      console.log('   - Any API calls will likely fail');
    }
    
    // Check all theaters
    console.log('\n📋 ALL THEATERS in database:');
    const allTheaters = await db.collection('theaters').find({}).toArray();
    allTheaters.forEach((t, i) => {
      console.log(`   ${i+1}. ${t.name} (${t._id})`);
    });
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
  }
}

checkTheater();
