const mongoose = require('mongoose');
require('dotenv').config({ path: './_1.env' });

/**
 * Configure Google Cloud Storage Settings in Database
 * This will enable real cloud storage for QR codes
 */

async function configureGCS() {
  try {
    console.log('\n🔧 CONFIGURING GOOGLE CLOUD STORAGE');
    console.log('='.repeat(60));

    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/theater_canteen_db');
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const settingsCollection = db.collection('settings');

    // Check existing GCS settings
    const existingSettings = await settingsCollection.find({ category: 'gcs' }).toArray();
    console.log('\n📋 Current GCS Settings:');
    
    if (existingSettings.length > 0) {
      existingSettings.forEach(s => {
        console.log(`   ${s.key}: ${s.value ? '✅ Set' : '❌ Empty'}`);
      });
    } else {
      console.log('   ⚠️  No GCS settings found');
    }

    // Get the bucket name from the first image or product URL
    console.log('\n🔍 Detecting bucket name from existing uploads...');
    
    const theaters = await db.collection('theaters').findOne({ 
      $or: [
        { 'media.logo': { $exists: true } },
        { logoUrl: { $exists: true } }
      ]
    });

    let detectedBucket = 'theater-canteen-uploads';
    let detectedProjectId = null;
    
    if (theaters && theaters.media && theaters.media.logo) {
      const url = theaters.media.logo;
      const match = url.match(/storage\.googleapis\.com\/([^\/]+)/);
      if (match) {
        detectedBucket = match[1];
        console.log(`   ✅ Detected bucket: ${detectedBucket}`);
      }
    }

    // Update or insert GCS settings
    const gcsSettings = [
      {
        category: 'gcs',
        key: 'bucketName',
        value: detectedBucket,
        label: 'GCS Bucket Name',
        description: 'Google Cloud Storage bucket name for uploads'
      },
      {
        category: 'gcs',
        key: 'projectId',
        value: detectedProjectId || 'your-gcp-project-id',
        label: 'GCS Project ID',
        description: 'Google Cloud Platform project ID'
      }
    ];

    console.log('\n📝 Updating GCS settings in database...');
    
    for (const setting of gcsSettings) {
      await settingsCollection.updateOne(
        { category: 'gcs', key: setting.key },
        { $set: setting },
        { upsert: true }
      );
      console.log(`   ✅ ${setting.key}: ${setting.value}`);
    }

    console.log('\n✅ GCS Configuration Updated!');
    console.log('\n📍 QR codes will now be saved to:');
    console.log(`   Bucket: ${detectedBucket}`);
    console.log('   Path: qr-codes/single/{theater_name}/');
    console.log('   Path: qr-codes/screen/{theater_name}/{qr_name}/');

    console.log('\n⚠️  IMPORTANT:');
    console.log('   For REAL cloud storage, you need to:');
    console.log('   1. Add GCS credentials (clientEmail, privateKey) to database');
    console.log('   2. Or use Application Default Credentials');
    console.log('   3. Ensure the service account has Storage Admin role');
    
    console.log('\n💡 For now, files will be saved locally at:');
    console.log('   d:\\New yqpay\\2\\backend\\uploads\\qr-codes\\');
    console.log('   (This works fine for testing!)');

    console.log('\n' + '='.repeat(60));

    await mongoose.connection.close();
    console.log('✅ Configuration complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

configureGCS();
