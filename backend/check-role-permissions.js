/**
 * Quick debug script to check role permissions in database
 */

const mongoose = require('mongoose');
const mongodbConfig = require('./config/mongodb.json');

async function checkRolePermissions() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(mongodbConfig.uri);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Find the manager user
    console.log('\n📥 Looking for manager user...');
    const usersDoc = await db.collection('theaterusers').findOne({
      'users.username': 'manager'
    });
    
    if (!usersDoc) {
      console.log('❌ No user document found with username "manager"');
      return;
    }
    
    const manager = usersDoc.users.find(u => u.username === 'manager');
    console.log('\n✅ Found manager user:');
    console.log('   - User ID:', manager._id);
    console.log('   - Username:', manager.username);
    console.log('   - Role ID:', manager.role);
    console.log('   - Theater ID:', usersDoc.theaterId);
    
    // Find the role
    console.log('\n📥 Looking for role...');
    const rolesDoc = await db.collection('roles').findOne({
      theater: usersDoc.theaterId
    });
    
    if (!rolesDoc) {
      console.log('❌ No roles document found for theater:', usersDoc.theaterId);
      return;
    }
    
    console.log('\n✅ Found roles document:');
    console.log('   - Theater ID:', rolesDoc.theater);
    console.log('   - Total roles:', rolesDoc.roleList?.length || 0);
    
    // Find the specific role
    if (manager.role && rolesDoc.roleList) {
      const userRole = rolesDoc.roleList.find(r => 
        r._id.toString() === manager.role.toString()
      );
      
      if (userRole) {
        console.log('\n✅ Found user\'s role:');
        console.log('   - Role ID:', userRole._id);
        console.log('   - Role name:', userRole.name);
        console.log('   - Is active:', userRole.isActive);
        console.log('   - Is default:', userRole.isDefault);
        console.log('   - Permissions count:', userRole.permissions?.length || 0);
        
        if (userRole.permissions && userRole.permissions.length > 0) {
          console.log('\n📋 Permissions:');
          userRole.permissions.forEach(p => {
            console.log(`   - ${p.pageName || p.page}: ${p.hasAccess ? '✅ ALLOWED' : '❌ DENIED'}`);
          });
        } else {
          console.log('\n⚠️  WARNING: Role has NO permissions!');
        }
      } else {
        console.log('\n❌ Role not found in roleList array');
        console.log('   Looking for role ID:', manager.role);
        console.log('   Available role IDs:');
        rolesDoc.roleList.forEach(r => {
          console.log('      -', r._id, '(', r.name, ')');
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

checkRolePermissions()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
