const mongoose = require('mongoose');
require('dotenv').config();

const TheaterUserArray = require('./models/TheaterUserArray');

async function checkUserPins() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/theater_canteen_db');
    console.log('✅ Connected to MongoDB\n');

    // Find all theater users
    console.log('📊 Checking all users with their PINs:');
    const allDocs = await TheaterUserArray.find({}).populate('theaterId', 'name');
    
    if (allDocs.length === 0) {
      console.log('❌ No theater user documents found');
      return;
    }

    allDocs.forEach(doc => {
      console.log(`\n🏢 Theater: ${doc.theaterId?.name || 'Unknown'} (${doc.theaterId?._id})`);
      console.log(`   Total users: ${doc.users.length}`);
      
      if (doc.users.length > 0) {
        console.log('   Users:');
        doc.users.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.username}`);
          console.log(`      📧 Email: ${user.email}`);
          console.log(`      📱 Phone: ${user.phoneNumber}`);
          console.log(`      🔢 PIN: ${user.pin || '❌ NO PIN'}`);
          console.log(`      👤 Full Name: ${user.fullName}`);
          console.log(`      ✅ Active: ${user.isActive}`);
        });
      }
    });

    // Check for duplicate PINs
    console.log('\n\n🔍 Checking for duplicate PINs...');
    const allPins = [];
    allDocs.forEach(doc => {
      doc.users.forEach(user => {
        if (user.pin) {
          allPins.push(user.pin);
        }
      });
    });

    const duplicates = allPins.filter((item, index) => allPins.indexOf(item) !== index);
    if (duplicates.length > 0) {
      console.log('❌ Found duplicate PINs:', [...new Set(duplicates)]);
    } else {
      console.log('✅ All PINs are unique across all theaters!');
    }

    console.log(`\n📊 Total unique PINs: ${new Set(allPins).size}`);
    console.log(`📊 Total users with PINs: ${allPins.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

checkUserPins();
