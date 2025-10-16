/**
 * Verify Theater Schema Fix
 * Check if documents are now being saved correctly
 */

require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');

async function verifySchemaFix() {
  try {
    console.log('🔍 Verifying Theater Schema Fix\n');
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/theater_canteen_db');
    console.log('✅ Connected to MongoDB\n');

    // Check if Theater model has the new fields
    const Theater = require('./models/Theater');
    const schema = Theater.schema;
    
    console.log('📋 Checking Theater Schema Fields:');
    console.log('═══════════════════════════════════════════════\n');
    
    const requiredFields = [
      'documents',
      'documents.logo',
      'documents.theaterPhoto',
      'documents.aadharCard',
      'documents.panCard',
      'documents.gstCertificate',
      'documents.fssaiCertificate',
      'ownerDetails',
      'ownerDetails.name',
      'ownerDetails.contactNumber',
      'ownerDetails.personalAddress',
      'agreementDetails',
      'agreementDetails.startDate',
      'agreementDetails.endDate',
      'agreementDetails.copy',
      'socialMedia',
      'socialMedia.facebook',
      'socialMedia.instagram',
      'branding.logo',
      'branding.logoUrl'
    ];
    
    requiredFields.forEach(field => {
      const exists = schema.path(field) !== undefined;
      const status = exists ? '✅' : '❌';
      console.log(`${status} ${field}`);
    });
    
    console.log('\n\n📊 Recent Theaters:');
    console.log('═══════════════════════════════════════════════\n');
    
    const theaters = await Theater.find({})
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();
    
    if (theaters.length === 0) {
      console.log('❌ No theaters found');
      console.log('\n💡 Create a new theater to test the fix!');
    } else {
      theaters.forEach((theater, index) => {
        console.log(`${index + 1}. ${theater.name}`);
        console.log(`   Created: ${theater.createdAt}`);
        
        // Check if documents exist
        if (theater.documents) {
          console.log('   ✅ Has documents field');
          const docCount = Object.keys(theater.documents).filter(k => theater.documents[k]).length;
          console.log(`   📄 ${docCount} documents uploaded`);
          
          if (theater.documents.logo) {
            console.log('   🎨 Logo: ' + theater.documents.logo.substring(0, 80) + '...');
            
            // Check folder structure
            if (theater.documents.logo.includes('theater%20list/')) {
              console.log('   ✅ Using NEW folder structure');
            } else if (theater.documents.logo.includes('theaters/')) {
              console.log('   ⚠️  Using OLD folder structure');
            }
          } else {
            console.log('   ❌ No logo uploaded');
          }
          
          if (theater.documents.theaterPhoto) {
            console.log('   📷 Theater Photo: Uploaded');
          }
        } else {
          console.log('   ❌ No documents field (OLD theater or not uploaded)');
        }
        
        // Check owner details
        if (theater.ownerDetails && theater.ownerDetails.name) {
          console.log(`   👤 Owner: ${theater.ownerDetails.name}`);
        }
        
        // Check branding
        if (theater.branding) {
          if (theater.branding.logo || theater.branding.logoUrl) {
            console.log('   ✅ Branding logo set');
          }
        }
        
        console.log('');
      });
    }
    
    console.log('\n💡 Test the Fix:');
    console.log('═══════════════════════════════════════════════');
    console.log('1. Go to: http://localhost:3001/add-theater');
    console.log('2. Create a new theater with files');
    console.log('3. Check if documents appear in database');
    console.log('4. View Theater Management page');
    console.log('5. Images should display correctly!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Verification completed!\n');
  }
}

verifySchemaFix();
