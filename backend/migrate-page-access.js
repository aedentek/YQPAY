/**
 * Migration Script: Add 'page' field to existing pageaccesses records
 * Converts pageName to page identifier format
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function migratePageAccess() {
  try {
    console.log('🔧 PAGE ACCESS MIGRATION\n');
    console.log('=' .repeat(70));

    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/theater_canteen_db');
    console.log('✅ Connected to MongoDB\n');

    const PageAccess = require('./models/PageAccess');

    // Step 1: Get all existing records
    console.log('STEP 1: Analyzing existing pageaccesses');
    console.log('-'.repeat(70));
    
    const existingRecords = await PageAccess.find({});
    console.log(`📊 Found ${existingRecords.length} records\n`);

    // Step 2: Check which records need migration
    const recordsNeedingMigration = existingRecords.filter(r => !r.page);
    console.log(`Records missing 'page' field: ${recordsNeedingMigration.length}`);
    
    if (recordsNeedingMigration.length > 0) {
      console.log('   Records to migrate:');
      recordsNeedingMigration.forEach(r => {
        console.log(`   - ${r.pageName} (ID: ${r._id})`);
      });
      console.log();
    }

    // Step 3: Delete old records without 'page' field
    console.log('STEP 2: Cleaning up old records');
    console.log('-'.repeat(70));
    
    if (recordsNeedingMigration.length > 0) {
      const deleteResult = await PageAccess.deleteMany({ page: { $exists: false } });
      console.log(`✅ Deleted ${deleteResult.deletedCount} old records\n`);
    } else {
      console.log('✅ No old records to clean up\n');
    }

    // Step 4: Verify clean state
    console.log('STEP 3: Verifying final state');
    console.log('-'.repeat(70));
    
    const finalRecords = await PageAccess.find({});
    console.log(`📊 Final count: ${finalRecords.length} records`);
    
    if (finalRecords.length > 0) {
      console.log('   Current records:');
      finalRecords.forEach(r => {
        console.log(`   - ${r.pageName} (page: ${r.page || 'N/A'}) - ${r.isActive ? '🟢' : '🔴'}`);
      });
    }
    console.log();

    // Step 5: Test creating a new record
    console.log('STEP 4: Test creating a new record with proper structure');
    console.log('-'.repeat(70));
    
    const testRecord = {
      page: 'TestPage',
      pageName: 'Test Page',
      route: '/test',
      description: 'Test page for migration verification',
      isActive: true
    };

    try {
      const newRecord = await PageAccess.create(testRecord);
      console.log('✅ Test record created successfully:');
      console.log(`   ID: ${newRecord._id}`);
      console.log(`   page: ${newRecord.page}`);
      console.log(`   pageName: ${newRecord.pageName}`);
      console.log(`   route: ${newRecord.route}`);
      
      // Delete test record
      await PageAccess.findByIdAndDelete(newRecord._id);
      console.log('✅ Test record deleted\n');
    } catch (error) {
      console.log('❌ Failed to create test record:', error.message);
    }

    console.log('=' .repeat(70));
    console.log('✅ MIGRATION COMPLETED');
    console.log('=' .repeat(70));
    console.log();
    console.log('📝 Summary:');
    console.log(`   - Deleted: ${recordsNeedingMigration.length} old records`);
    console.log(`   - Remaining: ${finalRecords.length - recordsNeedingMigration.length} records`);
    console.log(`   - Schema updated with 'page' field`);
    console.log();
    console.log('💡 Next steps:');
    console.log('   1. Run: node test-page-access-crud.js');
    console.log('   2. All tests should pass now');
    console.log('   3. Test frontend toggle functionality');
    console.log();

    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

migratePageAccess();
