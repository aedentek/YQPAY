const mongoose = require('mongoose');
require('dotenv').config({ path: '_1.env' });

const THEATER_ID = '68ed25e6962cb3e997acc163';

async function analyzeProductTypes() {
  try {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  Product Types Analysis                ║');
    console.log('╚════════════════════════════════════════╝\n');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Check producttypes collection
    console.log('📊 Checking "producttypes" collection...\n');
    
    const productTypes = await db.collection('producttypes')
      .find({ theaterId: new mongoose.Types.ObjectId(THEATER_ID) })
      .toArray();

    console.log(`Found ${productTypes.length} product types\n`);

    if (productTypes.length > 0) {
      console.log('📋 Product Types List:\n');
      productTypes.forEach((pt, index) => {
        console.log(`${index + 1}. ${pt.isActive ? '🟢' : '⚪'} ${pt.name}`);
        console.log(`   ID: ${pt._id}`);
        console.log(`   Code: ${pt.productCode || 'N/A'}`);
        console.log(`   Quantity: ${pt.quantity || 'N/A'}`);
        console.log(`   Description: ${pt.description || 'N/A'}`);
        console.log(`   Image URL: ${pt.imageUrl || pt.image || 'No image'}`);
        console.log('');
      });
    }

    // Check database structure
    console.log('\n═══════════════════════════════════════');
    console.log('📊 STRUCTURE ANALYSIS:');
    console.log('═══════════════════════════════════════\n');
    
    const sampleDoc = productTypes[0];
    if (sampleDoc) {
      console.log('Sample Document Structure:');
      console.log(JSON.stringify(sampleDoc, null, 2));
    }

    console.log('\n═══════════════════════════════════════');
    console.log('📊 COMPARISON WITH CATEGORIES:');
    console.log('═══════════════════════════════════════\n');

    // Check categories for comparison
    const categoryDoc = await db.collection('categories')
      .findOne({ theater: new mongoose.Types.ObjectId(THEATER_ID) });

    console.log('Categories Structure:');
    console.log('- Storage: One document per theater');
    console.log('- Array field: categoryList[]');
    console.log(`- Total categories: ${categoryDoc?.categoryList?.length || 0}`);

    console.log('\nProductTypes Structure:');
    console.log('- Storage: Separate documents (one per product type)');
    console.log('- Collection: producttypes');
    console.log(`- Total product types: ${productTypes.length}`);

    console.log('\n🎯 KEY DIFFERENCE:');
    console.log('Categories: Embedded array in single document');
    console.log('ProductTypes: Individual documents (traditional MongoDB approach)');

  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Connection closed.');
  }
}

analyzeProductTypes();
