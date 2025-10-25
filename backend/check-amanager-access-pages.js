const mongoose = require('mongoose');

// MongoDB URI
const MONGODB_URI = 'mongodb://localhost:27017/yqpaynow';

// Import models
const User = require('./models/User');
const Theater = require('./models/Theater');
const Role = require('./models/Role');
const RolePermission = require('./models/RolePermission');

async function checkAmanagerAccessPages() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find amanager user
    const user = await User.findOne({ username: 'amanager' }).populate('theater');
    
    if (!user) {
      console.log('❌ User "amanager" not found');
      return;
    }

    console.log('\n📋 User Details:');
    console.log('Username:', user.username);
    console.log('User Type:', user.userType);
    console.log('Theater:', user.theater?.name || 'No theater');
    console.log('Theater ID:', user.theater?._id);

    // Find the user's role
    const userRole = await Role.findOne({ 
      theater: user.theater._id,
      assignedTo: user._id 
    });

    if (!userRole) {
      console.log('❌ No role found for amanager');
      return;
    }

    console.log('\n📋 Role Details:');
    console.log('Role Name:', userRole.name);
    console.log('Role ID:', userRole._id);

    // Find role permissions
    const rolePermissions = await RolePermission.find({ 
      role: userRole._id 
    }).populate('page');

    console.log('\n📋 Role Permissions:');
    console.log('Total permissions:', rolePermissions.length);
    
    console.log('\n✅ Pages with Access:');
    const accessPages = rolePermissions.filter(rp => rp.hasAccess);
    accessPages.forEach(rp => {
      console.log(`  - ${rp.page?.pageName || rp.page} (${rp.page?.page || 'Unknown'})`);
    });

    console.log('\n❌ Pages without Access:');
    const noAccessPages = rolePermissions.filter(rp => !rp.hasAccess);
    noAccessPages.forEach(rp => {
      console.log(`  - ${rp.page?.pageName || rp.page} (${rp.page?.page || 'Unknown'})`);
    });

    // Check for access pages specifically
    const accessPageKeys = [
      'TheaterRoles',
      'TheaterRoleAccess',
      'TheaterQRCodeNames',
      'TheaterGenerateQR',
      'TheaterQRManagement',
      'TheaterUserManagement'
    ];

    console.log('\n🔍 Checking Access Pages:');
    for (const pageKey of accessPageKeys) {
      const permission = rolePermissions.find(rp => rp.page?.page === pageKey);
      if (permission) {
        console.log(`  ${permission.hasAccess ? '✅' : '❌'} ${pageKey}: ${permission.hasAccess ? 'HAS ACCESS' : 'NO ACCESS'}`);
      } else {
        console.log(`  ⚠️  ${pageKey}: NOT IN PERMISSIONS`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Connection closed');
  }
}

checkAmanagerAccessPages();
