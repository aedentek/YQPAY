const mongoose = require('mongoose');
const TheaterUser = require('./models/TheaterUserModel');
const Role = require('./models/Role');

require('dotenv').config({ path: './_1.env' });

async function fixOrphanedRoles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const theaterId = '68ed25e6962cb3e997acc163';
    
    // Step 1: Find Theater Admin role (default role)
    console.log('🔍 Finding Theater Admin role...');
    const theaterAdminRole = await Role.findOne({
      theater: theaterId,
      isDefault: true,
      isActive: true
    });
    
    if (!theaterAdminRole) {
      throw new Error('❌ Theater Admin role not found!');
    }
    
    console.log('✅ Found Theater Admin role:', theaterAdminRole._id.toString());
    console.log('   Name:', theaterAdminRole.name);
    
    // Step 2: Find all users for this theater
    console.log('\n🔍 Finding all theater users...');
    const users = await TheaterUser.find({ theater: theaterId });
    console.log(`📊 Found ${users.length} users`);
    
    // Step 3: Check which roles exist
    console.log('\n🔍 Checking role validity...');
    const allRoles = await Role.find({ theater: theaterId });
    const validRoleIds = allRoles.map(r => r._id.toString());
    console.log('✅ Valid role IDs:', validRoleIds);
    
    // Step 4: Find and fix orphaned users
    let fixedCount = 0;
    for (const user of users) {
      const userRoleId = user.role ? user.role.toString() : null;
      
      if (!userRoleId || !validRoleIds.includes(userRoleId)) {
        console.log(`\n⚠️  ORPHANED USER FOUND:`);
        console.log(`   User ID: ${user._id}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Invalid Role ID: ${userRoleId || 'NULL'}`);
        console.log(`   ✅ Fixing: Assigning Theater Admin role...`);
        
        await TheaterUser.updateOne(
          { _id: user._id },
          { $set: { role: theaterAdminRole._id } }
        );
        
        fixedCount++;
        console.log(`   ✅ Fixed! New role: ${theaterAdminRole._id}`);
      } else {
        console.log(`✅ User ${user.username} has valid role: ${userRoleId}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ CLEANUP COMPLETE!`);
    console.log(`   Total users checked: ${users.length}`);
    console.log(`   Orphaned users fixed: ${fixedCount}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

fixOrphanedRoles();
