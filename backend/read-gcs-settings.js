const mongoose = require('mongoose');
require('dotenv').config({ path: './_1.env' });

async function readGCSSettings() {
  try {
    await mongoose.connect('mongodb://localhost:27017/theater_canteen_db');
    const db = mongoose.connection.db;
    
    console.log('\n🔍 Searching for GCS Configuration...\n');
    
    // Find the document with gcsConfig (note capital C)
    const gcsDoc = await db.collection('settings').findOne({ 
      type: 'gcs'
    });
    
    if (gcsDoc && gcsDoc.gcsConfig) {
      console.log('✅ Found GCS Configuration in settings!\n');
      
      const config = gcsDoc.gcsConfig;
      console.log('📋 GCS Configuration:');
      console.log('   Project ID:', config.projectId);
      console.log('   Bucket Name:', config.bucketName);
      console.log('   Region:', config.region);
      console.log('   Key Filename:', config.keyFilename);
      
      if (config.serviceAccountKey) {
        console.log('\n🔑 Service Account Key: EXISTS');
        try {
          const serviceAccount = JSON.parse(config.serviceAccountKey);
          console.log('   Type:', serviceAccount.type);
          console.log('   Project ID:', serviceAccount.project_id);
          console.log('   Client Email:', serviceAccount.client_email);
          console.log('   Private Key:', serviceAccount.private_key ? `EXISTS (${serviceAccount.private_key.length} chars)` : 'MISSING');
          
          // Now update the GCS settings in the format our utility expects
          console.log('\n📝 Updating GCS settings for QR code generator...');
          
          await db.collection('settings').deleteMany({ category: 'gcs' });
          console.log('   Cleared old GCS settings');
          
          await db.collection('settings').insertMany([
            { 
              category: 'gcs',
              key: 'projectId',
              value: serviceAccount.project_id,
              isSystem: true,
              type: 'gcs_projectId'
            },
            { 
              category: 'gcs',
              key: 'clientEmail',
              value: serviceAccount.client_email,
              isSystem: true,
              type: 'gcs_clientEmail'
            },
            { 
              category: 'gcs',
              key: 'privateKey',
              value: serviceAccount.private_key,
              isSystem: true,
              type: 'gcs_privateKey'
            },
            { 
              category: 'gcs',
              key: 'bucketName',
              value: config.bucketName,
              isSystem: true,
              type: 'gcs_bucketName'
            }
          ]);
          
          console.log('✅ GCS settings updated successfully!');
          console.log('\n🎯 QR codes will now upload to Google Cloud Storage!');
          console.log('   Bucket:', config.bucketName);
          console.log('   Project:', serviceAccount.project_id);
          
        } catch (err) {
          console.error('❌ Error parsing service account key:', err.message);
        }
      } else {
        console.log('\n⚠️  Service Account Key is missing');
      }
      
    } else {
      console.log('❌ GCS configuration not found in settings collection');
      console.log('\nSearching for any gcs-related documents...');
      const allSettings = await db.collection('settings').find({}).limit(20).toArray();
      allSettings.forEach((doc, i) => {
        console.log(`${i+1}. Type: ${doc.type}, Category: ${doc.category}, Keys: ${Object.keys(doc).join(', ')}`);
      });
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Done!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

readGCSSettings();
