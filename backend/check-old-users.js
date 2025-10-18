const mongoose = require('mongoose');

async function checkOldUsers() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/yqpaynow');
    console.log('✅ Connected to MongoDB');
    
    // Check old theaterusers collection (individual documents)
    const TheaterUser = mongoose.model('TheaterUser', new mongoose.Schema({}, { strict: false }));
    const oldUsers = await TheaterUser.find({}).limit(20);
    
    console.log('\n📋 OLD Theater Users (individual documents):', oldUsers.length);
    oldUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (Theater: ${user.theater}) - ${user.email}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkOldUsers();
