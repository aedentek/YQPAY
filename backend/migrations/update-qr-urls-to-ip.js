/**
 * Migration Script: Update QR Code URLs from localhost to IP address
 * This script updates all existing QR codes in the database to use IP address instead of localhost
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://192.168.1.6:27017/theater_canteen_db';
const OLD_URL = 'http://localhost:3001';
const NEW_URL = 'http://192.168.1.6:3001';

async function updateQRUrls() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    
    // Get the singleqrcodes collection
    const collection = db.collection('singleqrcodes');
    
    // Find all documents with localhost URLs
    console.log('🔍 Finding QR codes with localhost URLs...');
    const qrCodes = await collection.find({
      $or: [
        { qrCodeUrl: { $regex: 'localhost' } },
        { qrCodeData: { $regex: 'localhost' } }
      ]
    }).toArray();
    
    console.log(`📊 Found ${qrCodes.length} QR codes to update\n`);
    
    if (qrCodes.length === 0) {
      console.log('✅ No QR codes need updating');
      return;
    }
    
    let updateCount = 0;
    let errorCount = 0;
    
    for (const qr of qrCodes) {
      try {
        const updates = {};
        
        // Update qrCodeUrl if it contains localhost
        if (qr.qrCodeUrl && qr.qrCodeUrl.includes('localhost')) {
          updates.qrCodeUrl = qr.qrCodeUrl.replace(/localhost/g, '192.168.1.6');
        }
        
        // Update qrCodeData if it contains localhost
        if (qr.qrCodeData && qr.qrCodeData.includes('localhost')) {
          updates.qrCodeData = qr.qrCodeData.replace(/localhost/g, '192.168.1.6');
        }
        
        if (Object.keys(updates).length > 0) {
          await collection.updateOne(
            { _id: qr._id },
            { $set: updates }
          );
          
          updateCount++;
          console.log(`✅ Updated QR: ${qr.qrDetails?.qrName || qr._id}`);
          console.log(`   Old URL: ${qr.qrCodeData?.substring(0, 80)}...`);
          console.log(`   New URL: ${updates.qrCodeData?.substring(0, 80)}...`);
          console.log('');
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Error updating QR ${qr._id}:`, error.message);
      }
    }
    
    console.log('\n📈 Migration Summary:');
    console.log(`   Total found: ${qrCodes.length}`);
    console.log(`   Successfully updated: ${updateCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log('');
    
    if (updateCount > 0) {
      console.log('✅ QR code URLs have been updated successfully!');
      console.log(`   Changed from: ${OLD_URL}`);
      console.log(`   Changed to: ${NEW_URL}`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the migration
updateQRUrls()
  .then(() => {
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
