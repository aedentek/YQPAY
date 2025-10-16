const mongoose = require('mongoose');
const Role = require('./models/Role');
const Theater = require('./models/Theater');

// Load environment variables
require('dotenv').config({ path: './_1.env' });

async function checkTheaterExistence() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const theaterId = '68ed25e6962cb3e997acc163';
    
    // Check if theater exists
    console.log('🎭 Checking if theater exists:', theaterId);
    const theater = await Theater.findById(theaterId);
    
    if (theater) {
      console.log('✅ Theater EXISTS in database');
      console.log('   Name:', theater.name);
      console.log('   Location:', theater.location);
    } else {
      console.log('❌ Theater DOES NOT EXIST in database!');
    }
    
    console.log('\n🔍 Fetching roles with populate (like the API does):');
    const roles = await Role.find({
      theater: theaterId,
      isActive: true
    })
    .populate('theater', 'name location contactInfo')
    .lean();
    
    console.log('\n📊 Roles returned:', roles.length);
    roles.forEach((role, index) => {
      console.log(`\n🎭 Role #${index + 1}:`);
      console.log('   _id:', role._id);
      console.log('   name:', role.name);
      console.log('   theater (populated):', role.theater);
      console.log('   theater is null?', role.theater === null);
      console.log('   theater is undefined?', role.theater === undefined);
      
      if (role.theater === null) {
        console.log('   ❌❌❌ THIS IS THE PROBLEM! Theater field is NULL after populate!');
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

checkTheaterExistence();
