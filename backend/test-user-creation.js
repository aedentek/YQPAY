/**
 * Test theater user creation directly
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const mongodbConfig = require('./config/mongodb.json');
const TheaterUserArray = require('./models/TheaterUserArray');

async function testUserCreation() {
  try {
    await mongoose.connect(mongodbConfig.uri);
    console.log('✅ Connected to MongoDB');
    
    const theaterId = new mongoose.Types.ObjectId("68f839d8717558bf3c1f3324");
    const testUsername = 'testuser' + Date.now();
    
    console.log('\n🧪 Testing user creation...');
    console.log('   Theater ID:', theaterId);
    console.log('   Username:', testUsername);
    
    // Hash password
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    // Find or create users document
    let usersDoc = await TheaterUserArray.findOrCreateByTheater(theaterId);
    console.log('   Current users:', usersDoc.users.length);
    
    // Add user
    const newUser = await usersDoc.addUser({
      username: testUsername,
      email: `${testUsername}@test.com`,
      password: hashedPassword,
      fullName: 'Test User',
      phoneNumber: '1234567890',
      role: null,
      isActive: true,
      isEmailVerified: false
    });
    
    console.log('\n✅ SUCCESS! User created:');
    console.log('   User ID:', newUser._id);
    console.log('   Username:', newUser.username);
    console.log('   Total users now:', usersDoc.users.length);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await mongoose.connection.close();
  }
}

testUserCreation();
