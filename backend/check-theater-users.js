const mongoose = require('mongoose');
const TheaterUserArray = require('./models/TheaterUserArray');

async function checkUsers() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/yqpaynow');
    console.log('✅ Connected to MongoDB');
    
    const theaterId = '68ed25e6962cb3e997acc163';
    
    // Find users document for this theater
    const usersDoc = await TheaterUserArray.findOne({ theater: theaterId });
    
    if (!usersDoc) {
      console.log('❌ No users document found for theater:', theaterId);
      process.exit(0);
    }
    
    console.log('\n📋 Users in theater:', theaterId);
    console.log('Total users:', usersDoc.users.length);
    console.log('\nUsernames:');
    usersDoc.users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.email}) - Active: ${user.isActive}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUsers();
