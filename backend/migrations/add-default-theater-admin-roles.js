/**
 * Migration Script: Add Default Theater Admin Roles to Existing Theaters
 * 
 * This script creates a default "Theater Admin" role for all theaters that don't have one yet.
 * It's safe to run multiple times (idempotent).
 * 
 * Usage:
 *   node backend/migrations/add-default-theater-admin-roles.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Theater = require('../models/Theater');
const Role = require('../models/Role');
const roleService = require('../services/roleService');

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/YQPAY';

console.log('\n========================================');
console.log('🚀 MIGRATION: Add Default Theater Admin Roles');
console.log('========================================\n');

async function addDefaultRolesToExistingTheaters() {
  try {
    // Connect to database
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Fetch all theaters
    console.log('🎭 Fetching all theaters...');
    const allTheaters = await Theater.find({ isActive: true }).select('_id name').lean();
    console.log(`✅ Found ${allTheaters.length} active theaters\n`);

    if (allTheaters.length === 0) {
      console.log('⚠️  No active theaters found. Nothing to migrate.');
      return;
    }

    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    console.log('🔄 Processing theaters...\n');

    // Process each theater
    for (const theater of allTheaters) {
      try {
        console.log(`\n🎭 Theater: ${theater.name} (${theater._id})`);
        
        // Check if theater already has a default role
        const existingDefaultRole = await Role.findOne({
          theater: theater._id,
          isDefault: true
        });

        if (existingDefaultRole) {
          console.log(`   ⏭️  Already has default role: ${existingDefaultRole.name} (${existingDefaultRole._id})`);
          skippedCount++;
          continue;
        }

        // Create default Theater Admin role
        console.log('   🔨 Creating default Theater Admin role...');
        const defaultRole = await roleService.createDefaultTheaterAdminRole(
          theater._id,
          theater.name
        );

        console.log(`   ✅ Created: ${defaultRole.name} (${defaultRole._id})`);
        console.log(`   📋 Permissions: ${defaultRole.permissions.length}`);
        createdCount++;

      } catch (theaterError) {
        console.error(`   ❌ Error processing theater ${theater.name}:`, theaterError.message);
        errorCount++;
      }
    }

    // Summary
    console.log('\n========================================');
    console.log('📊 MIGRATION SUMMARY');
    console.log('========================================');
    console.log(`✅ Default roles created: ${createdCount}`);
    console.log(`⏭️  Theaters skipped (already have default role): ${skippedCount}`);
    console.log(`❌ Errors encountered: ${errorCount}`);
    console.log(`🎭 Total theaters processed: ${allTheaters.length}`);
    console.log('========================================\n');

    if (createdCount > 0) {
      console.log('✅ Migration completed successfully!');
      console.log('🔍 Verifying results...\n');
      
      // Verify: Count theaters with default roles
      const theatersWithDefaultRoles = await Role.countDocuments({ isDefault: true });
      console.log(`📊 Total theaters with default roles: ${theatersWithDefaultRoles}`);
      console.log(`📊 Total active theaters: ${allTheaters.length}`);
      
      if (theatersWithDefaultRoles === allTheaters.length) {
        console.log('✅ Verification passed! All active theaters now have default roles.\n');
      } else {
        console.log(`⚠️  Warning: ${allTheaters.length - theatersWithDefaultRoles} theaters still missing default roles.\n`);
      }
    } else if (skippedCount === allTheaters.length) {
      console.log('✅ All theaters already have default roles. No migration needed.\n');
    } else {
      console.log('⚠️  Migration completed with warnings. Please check the logs above.\n');
    }

  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    console.log('🔌 Closing database connection...');
    await mongoose.connection.close();
    console.log('✅ Database connection closed\n');
  }
}

// Run migration
addDefaultRolesToExistingTheaters()
  .then(() => {
    console.log('🎉 Migration script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });
