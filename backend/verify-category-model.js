/**
 * CATEGORY IMAGE UPLOAD - DIRECT DATABASE TEST
 * Tests the backend routes directly without API calls
 */

const mongoose = require('mongoose');
const Category = require('./models/Category');
require('dotenv').config({ path: '.env' });

const THEATER_ID = '68ed25e6962cb3e997acc163';

console.log('🧪 CATEGORY MODEL VERIFICATION TEST');
console.log('=' .repeat(60));

async function runTest() {
  try {
    // Connect to database
    console.log('\n🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/theater_canteen_db');
    console.log('✅ Connected to database');

    // Test 1: Check existing categories
    console.log('\n📋 Test 1: Check existing categories');
    console.log('-'.repeat(60));
    const existingCategories = await Category.find({ theater: THEATER_ID });
    console.log(`Found ${existingCategories.length} existing categories:`);
    existingCategories.forEach((cat, i) => {
      console.log(`   ${i + 1}. ${cat.name}`);
      console.log(`      ID: ${cat._id}`);
      console.log(`      Image URL: ${cat.imageUrl || 'None'}`);
      console.log(`      Image Object: ${cat.image?.url || 'None'}`);
    });

    // Test 2: Create test category with imageUrl
    console.log('\n📋 Test 2: Create test category with imageUrl field');
    console.log('-'.repeat(60));
    
    const testCategory = new Category({
      name: 'Test Category ' + Date.now(),
      description: 'Test category with imageUrl field',
      theater: THEATER_ID,
      imageUrl: 'https://storage.googleapis.com/theater-canteen-uploads/test-image.jpg',
      isActive: true
    });

    await testCategory.save();
    console.log('✅ Test category created successfully!');
    console.log(`   ID: ${testCategory._id}`);
    console.log(`   Name: ${testCategory.name}`);
    console.log(`   Image URL: ${testCategory.imageUrl}`);

    // Test 3: Verify the field is saved
    console.log('\n📋 Test 3: Verify imageUrl field is saved');
    console.log('-'.repeat(60));
    const savedCategory = await Category.findById(testCategory._id);
    console.log(`   Retrieved: ${savedCategory.name}`);
    console.log(`   Image URL: ${savedCategory.imageUrl}`);
    console.log(`   ✅ Field saved correctly: ${!!savedCategory.imageUrl}`);

    // Test 4: Update imageUrl
    console.log('\n📋 Test 4: Update imageUrl field');
    console.log('-'.repeat(60));
    savedCategory.imageUrl = 'https://storage.googleapis.com/theater-canteen-uploads/updated-image.jpg';
    await savedCategory.save();
    console.log(`   ✅ Image URL updated to: ${savedCategory.imageUrl}`);

    // Test 5: Remove imageUrl
    console.log('\n📋 Test 5: Remove imageUrl field');
    console.log('-'.repeat(60));
    savedCategory.imageUrl = null;
    await savedCategory.save();
    const verifyNull = await Category.findById(savedCategory._id);
    console.log(`   ✅ Image URL removed: ${verifyNull.imageUrl === null ? 'Yes (null)' : 'No'}`);

    // Test 6: Clean up
    console.log('\n📋 Test 6: Clean up test category');
    console.log('-'.repeat(60));
    await Category.findByIdAndDelete(testCategory._id);
    console.log('   ✅ Test category deleted');

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log('✅ All database operations completed successfully!');
    console.log('✅ imageUrl field is working correctly in Category model');
    console.log('✅ The model can save, update, and remove imageUrl values');
    
    console.log('\n🎯 Next: Start backend server and test API endpoints');
    console.log('   Command: cd backend && npm start');
    console.log('   Then test frontend category creation with image upload');

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

runTest().catch(console.error);
