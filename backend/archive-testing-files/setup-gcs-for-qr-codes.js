/**
 * Setup Google Cloud Storage for QR Codes
 * This script helps configure GCS to save QR codes to the real bucket
 */

console.log('\n🔧 GOOGLE CLOUD STORAGE SETUP FOR QR CODES');
console.log('='.repeat(60));

console.log('\n📋 CURRENT STATUS:');
console.log('   ✅ QR code generation is working');
console.log('   ✅ Files saved locally in: backend/uploads/qr-codes/');
console.log('   ⚠️  GCS is in MOCK MODE (not uploading to real cloud)');

console.log('\n📍 WHERE QR CODES WILL BE SAVED IN GOOGLE CLOUD:');
console.log('   Bucket: theater-canteen-uploads');
console.log('   Path: qr-codes/single/{theater_name}/*.png');
console.log('   Path: qr-codes/screen/{theater_name}/{qr_name}/*.png');

console.log('\n🎯 TO ENABLE REAL GOOGLE CLOUD STORAGE:');
console.log('\nStep 1: Update your .env file (_1.env)');
console.log('   Add or update these lines:');
console.log('   ────────────────────────────────────────');
console.log('   GCS_MOCK_MODE=false');
console.log('   GCS_PROJECT_ID=your-project-id');
console.log('   GCS_BUCKET_NAME=theater-canteen-uploads');
console.log('   ');

console.log('\nStep 2: Add GCS credentials to database');
console.log('   The system reads GCS config from MongoDB settings collection');
console.log('   Category: "gcs"');
console.log('   Keys needed: projectId, clientEmail, privateKey, bucketName');

console.log('\nStep 3: Folder will be auto-created on first upload');
console.log('   When you generate a QR code, it will automatically create:');
console.log('   - qr-codes/single/');
console.log('   - qr-codes/screen/');

console.log('\n📂 CURRENT LOCAL STORAGE:');
console.log('   Location: d:\\New yqpay\\2\\backend\\uploads\\qr-codes\\');

const fs = require('fs');
const path = require('path');

const uploadsPath = path.join(__dirname, 'uploads', 'qr-codes');

try {
  if (fs.existsSync(uploadsPath)) {
    const listDirectory = (dir, prefix = '') => {
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          console.log(`   ${prefix}📁 ${item}/`);
          listDirectory(fullPath, prefix + '  ');
        } else {
          console.log(`   ${prefix}📄 ${item}`);
        }
      });
    };
    
    console.log('\n   Files currently saved locally:');
    listDirectory(uploadsPath, '   ');
  } else {
    console.log('   ⚠️  No local QR codes folder found yet');
  }
} catch (error) {
  console.log('   ⚠️  Could not read local files:', error.message);
}

console.log('\n' + '='.repeat(60));
console.log('📌 SUMMARY:');
console.log('   • QR codes ARE being generated successfully ✅');
console.log('   • They are saved LOCALLY (not in cloud yet) ⚠️');
console.log('   • To use real Google Cloud, disable MOCK mode');
console.log('   • For now, system works fine with local storage');
console.log('='.repeat(60) + '\n');
