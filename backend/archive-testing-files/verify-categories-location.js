const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/YQPAY';
const THEATER_ID = '68ed25e6962cb3e997acc163';

async function verifyCategories() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected!\n');

    // Get the theater document
    console.log('🔍 Searching for theater in "theaters" collection...');
    console.log(`   Theater ID: ${THEATER_ID}\n`);

    const Theater = mongoose.model('Theater', new mongoose.Schema({}, { strict: false }));
    const theater = await Theater.findById(THEATER_ID);

    if (!theater) {
      console.log('❌ Theater not found!');
      return;
    }

    console.log('✅ FOUND THEATER!');
    console.log('═══════════════════════════════════════\n');
    console.log('📍 Location in MongoDB:');
    console.log('   Database: theater_canteen_db');
    console.log('   Collection: theaters  ← (Not "categories"!)');
    console.log(`   Document ID: ${theater._id}`);
    console.log(`   Theater Name: ${theater.name}`);
    console.log(`   Username: ${theater.username}\n`);

    if (!theater.categories || theater.categories.length === 0) {
      console.log('❌ No categories found in this theater!');
      return;
    }

    console.log('✅ CATEGORIES ARRAY FOUND!');
    console.log('═══════════════════════════════════════\n');
    console.log(`📊 Total Categories: ${theater.categories.length}`);
    console.log('\n📋 Full Category List:\n');

    theater.categories.forEach((cat, index) => {
      const status = cat.isActive ? '🟢' : '⚪';
      console.log(`${String(index + 1).padStart(2, ' ')}. ${status} ${cat.name}`);
      console.log(`    ID: ${cat._id}`);
      console.log(`    Description: ${cat.description || 'N/A'}`);
      console.log(`    Active: ${cat.isActive}`);
      console.log('');
    });

    console.log('═══════════════════════════════════════');
    console.log('🎯 TO VIEW IN MONGODB COMPASS:');
    console.log('═══════════════════════════════════════');
    console.log('1. Click on: YQPAY > theater_canteen_db');
    console.log('2. Click on: theaters collection (NOT categories!)');
    console.log('3. Find document with _id: 68ed25e6962cb3e997acc163');
    console.log('4. Expand the "categories" array field');
    console.log('5. You will see all 22 categories there!\n');

    console.log('═══════════════════════════════════════');
    console.log('🌐 TO VIEW IN FRONTEND:');
    console.log('═══════════════════════════════════════');
    console.log(`http://localhost:3001/theater-categories/${THEATER_ID}\n`);

    // Calculate stats
    const active = theater.categories.filter(c => c.isActive).length;
    const inactive = theater.categories.filter(c => c.isActive === false).length;

    console.log('═══════════════════════════════════════');
    console.log('📊 STATISTICS:');
    console.log('═══════════════════════════════════════');
    console.log(`Total Categories: ${theater.categories.length}`);
    console.log(`Active:   ${active} 🟢`);
    console.log(`Inactive: ${inactive} ⚪`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Connection closed.');
  }
}

console.log('\n╔════════════════════════════════════════╗');
console.log('║  Verify Categories Location            ║');
console.log('╚════════════════════════════════════════╝\n');

verifyCategories();
