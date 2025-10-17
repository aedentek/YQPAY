const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/theater_canteen_db';

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

async function checkUsers() {
  try {
    const User = require('./models/User');
    
    console.log('🔍 Checking all users in database...');
    const users = await User.find({}).select('username role theaterId createdAt');
    console.log('Users found:', users.length);
    
    users.forEach((user, index) => {
      console.log(`\n👤 User ${index + 1}:`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Theater ID: ${user.theaterId}`);
      console.log(`   Created: ${user.createdAt}`);
    });
    
    // Check specifically for admin111
    const admin = await User.findOne({ username: 'admin111' });
    if (admin) {
      console.log('\n🔑 Admin111 user found:');
      console.log(`   Real ID: ${admin._id}`);
      console.log(`   Role: ${admin.role}`);
    } else {
      console.log('\n❌ Admin111 user NOT found in database');
    }
    
  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkUsers();