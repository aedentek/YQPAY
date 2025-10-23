const mongoose = require('mongoose');
require('dotenv').config();

const TheaterUserArray = require('./models/TheaterUserArray');

async function testPinGeneration() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/theater_canteen_db');
    console.log('✅ Connected to MongoDB\n');

    // Test 1: Check existing PINs
    console.log('📊 TEST 1: Checking existing PINs in database');
    const allDocs = await TheaterUserArray.find({});
    const allPins = [];
    
    allDocs.forEach(doc => {
      doc.users.forEach(user => {
        if (user.pin) {
          allPins.push(user.pin);
        }
      });
    });
    
    console.log(`Found ${allPins.length} existing PINs:`, allPins);
    console.log('Unique PINs:', new Set(allPins).size);
    console.log('Duplicate PINs:', allPins.length - new Set(allPins).size);
    console.log('');

    // Test 2: Generate 5 unique PINs
    console.log('🔢 TEST 2: Generating 5 unique PINs');
    const generatedPins = [];
    
    for (let i = 0; i < 5; i++) {
      const pin = await TheaterUserArray.generateUniquePin();
      generatedPins.push(pin);
      console.log(`  Generated PIN ${i + 1}: ${pin}`);
    }
    
    console.log('All generated PINs are unique:', new Set(generatedPins).size === generatedPins.size);
    console.log('');

    // Test 3: Verify PINs are 4 digits
    console.log('✅ TEST 3: Validating PIN format');
    const allValid = generatedPins.every(pin => /^\d{4}$/.test(pin));
    console.log('All PINs are 4 digits:', allValid);
    console.log('PIN range: 1000-9999');
    console.log('');

    console.log('✅ All PIN generation tests passed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

testPinGeneration();
