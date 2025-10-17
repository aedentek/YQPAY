const mongoose = require('mongoose');
require('dotenv').config({ path: './_1.env' });

async function verifyLatestQR() {
  try {
    await mongoose.connect('mongodb://localhost:27017/theater_canteen_db');
    
    const ScreenQRCode = require('./models/ScreenQRCode');
    const Theater = require('./models/Theater'); // Load Theater model
    
    // Get latest QR code with logo
    const latestQR = await ScreenQRCode.findOne({ 'metadata.hasLogo': true })
      .sort({ createdAt: -1 })
      .populate('theater', 'name theaterName primaryColor');
    
    if (!latestQR) {
      console.log('❌ No QR codes with logos found');
      return;
    }
    
    console.log('\n=== Latest QR Code with Logo ===\n');
    console.log('📋 Basic Info:');
    console.log('   ID:', latestQR._id);
    console.log('   Name:', latestQR.qrName);
    console.log('   Type:', latestQR.qrType);
    console.log('   Theater:', latestQR.theater?.name || latestQR.theater?.theaterName || 'N/A');
    console.log('   Created:', latestQR.createdAt.toISOString());
    
    console.log('\n🎨 Branding:');
    console.log('   Logo Type:', latestQR.logoType);
    console.log('   Logo URL:', latestQR.logoUrl || 'N/A');
    console.log('   Has Logo:', latestQR.metadata?.hasLogo || false);
    console.log('   Primary Color:', latestQR.metadata?.primaryColor || 'N/A');
    
    console.log('\n📦 File Info:');
    console.log('   File Size:', (latestQR.metadata?.fileSize / 1024).toFixed(2), 'KB');
    console.log('   Storage URL:', latestQR.qrCodeUrl);
    
    console.log('\n🔗 QR Code Data:');
    console.log('   Embedded URL:', latestQR.qrCodeData);
    
    console.log('\n✅ Verification:');
    console.log('   ✓ Logo embedded:', latestQR.metadata?.hasLogo ? 'YES' : 'NO');
    console.log('   ✓ Custom color:', latestQR.metadata?.primaryColor ? 'YES' : 'NO');
    console.log('   ✓ Uploaded to GCS:', latestQR.qrCodeUrl.includes('storage.googleapis.com') ? 'YES' : 'NO');
    console.log('   ✓ Metadata saved:', (latestQR.metadata?.primaryColor && latestQR.metadata?.hasLogo) ? 'YES' : 'NO');
    
    console.log('\n📥 To view the QR code:');
    console.log('   Copy this URL to browser:');
    console.log('   ' + latestQR.qrCodeUrl);
    
    console.log('\n📱 To test scanning:');
    console.log('   1. Open the URL above in browser');
    console.log('   2. Scan with phone camera or QR scanner app');
    console.log('   3. Should redirect to:', latestQR.qrCodeData);
    
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyLatestQR();
