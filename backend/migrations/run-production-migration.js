// Production migration script
const mongoose = require('mongoose');
const TheaterUserMigration = require('./theater-user-migration');
require('dotenv').config();

console.log('🚀 Starting Production Theater User Migration');
console.log('==============================================');

async function runProduction() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/theater_canteen_db');
    console.log('✅ Connected successfully!');

    // Create migration instance
    const migration = new TheaterUserMigration();

    // Run migration with backup
    console.log('🔄 Starting migration with backup...');
    const result = await migration.migrate({
      createBackup: true,
      dryRun: false
    });

    if (result.success) {
      console.log('✅ Migration completed successfully!');
      console.log('📊 Migration Stats:');
      console.log(`   Total Users: ${result.stats.totalUsers}`);
      console.log(`   Migrated Users: ${result.stats.migratedUsers}`);
      console.log(`   Failed Users: ${result.stats.failedUsers}`);
      console.log(`   Processed Theaters: ${result.stats.processedTheaters}`);
      console.log(`   Backup Path: ${result.backupPath}`);

      // Verify migration
      console.log('\n🔍 Verifying migration integrity...');
      const verification = await migration.verifyMigration();
      
      if (verification.integrityCheck) {
        console.log('✅ Migration integrity verified!');
        console.log(`   Original: ${verification.originalCount} users`);
        console.log(`   Migrated: ${verification.migratedCount} users`);
      } else {
        console.log('❌ Migration integrity check failed!');
      }

    } else {
      console.log('❌ Migration failed!');
    }

  } catch (error) {
    console.error('❌ Production migration failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run production migration
runProduction();