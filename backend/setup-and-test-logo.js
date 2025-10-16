const mongoose = require('mongoose');
require('dotenv').config({ path: './_1.env' });
const path = require('path');

async function setupTestLogo() {
  try {
    await mongoose.connect('mongodb://localhost:27017/theater_canteen_db');
    console.log('✅ Connected to MongoDB\n');
    
    const Settings = require('./models/Settings');
    
    // Option 1: Use a public logo URL for testing
    const testLogoUrl = 'https://cdn-icons-png.flaticon.com/512/3597/3597075.png'; // Theater icon
    
    console.log('🔧 Setting up test logo...');
    console.log('   Using public icon:', testLogoUrl);
    
    const result = await Settings.findOneAndUpdate(
      { category: 'general', key: 'qrCodeImage' },
      {
        category: 'general',
        key: 'qrCodeImage',
        value: testLogoUrl,
        type: 'string',
        description: 'Default logo image to display in center of QR codes',
        isPublic: true
      },
      { upsert: true, new: true }
    );
    
    console.log('\n✅ Default logo configured:');
    console.log('   URL:', result.value);
    console.log('   Category:', result.category);
    console.log('   Key:', result.key);
    
    console.log('\n📋 Now testing QR generation with logo...\n');
    
    // Now test QR generation with this logo
    const { generateQRCodes } = require('./utils/qrCodeGenerator');
    const Theater = require('./models/Theater');
    
    const theater = await Theater.findOne();
    if (!theater) {
      console.log('❌ No theater found');
      return;
    }
    
    console.log('🎭 Theater:', theater.name || theater.theaterName);
    console.log('   Primary Color:', theater.primaryColor || '#6B0E9B');
    
    console.log('\n🔄 Generating QR code with logo...');
    const result2 = await generateQRCodes({
      theaterId: theater._id,
      qrType: 'single',
      name: 'Logo_Test_' + Date.now(),
      logoType: 'default',
      userId: theater._id
    });
    
    console.log('\n✅ QR Code Generated Successfully!');
    console.log('   ID:', result2.qrCode._id);
    console.log('   URL:', result2.qrCode.qrCodeUrl);
    console.log('   Logo Type:', result2.qrCode.logoType);
    console.log('   Has Logo:', result2.qrCode.metadata?.hasLogo);
    console.log('   Primary Color:', result2.qrCode.metadata?.primaryColor);
    
    console.log('\n📥 Download the QR code from Google Cloud Storage and verify:');
    console.log('   1. Logo is centered in QR code');
    console.log('   2. QR code uses primary color:', result2.qrCode.metadata?.primaryColor || '#6B0E9B');
    console.log('   3. QR code is scannable with mobile device');
    
    await mongoose.connection.close();
    console.log('\n✅ Test completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setupTestLogo();
