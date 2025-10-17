const mongoose = require('mongoose');
const Role = require('./models/Role');

// Load environment variables
require('dotenv').config({ path: './_1.env' });

async function debugRoleData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const theaterId = '68ed25e6962cb3e997acc163';
    
    console.log('🔍 Fetching roles for theater:', theaterId);
    
    // Fetch roles exactly as the API does
    const roles = await Role.find({
      theater: theaterId,
      isActive: true
    }).lean();
    
    console.log('\n📋 Raw Database Results:');
    console.log('Total roles found:', roles.length);
    console.log('\n');
    
    roles.forEach((role, index) => {
      console.log(`\n🎭 Role #${index + 1}:`);
      console.log('  _id:', role._id);
      console.log('  _id type:', typeof role._id);
      console.log('  _id is null?', role._id === null);
      console.log('  _id is undefined?', role._id === undefined);
      console.log('  _id toString():', role._id ? role._id.toString() : 'NULL');
      console.log('  name:', role.name);
      console.log('  isActive:', role.isActive);
      console.log('  isDefault:', role.isDefault);
      console.log('  theater:', role.theater);
      console.log('  Full object keys:', Object.keys(role));
    });
    
    // Check if any role has null/undefined _id
    const nullIdRoles = roles.filter(r => !r._id);
    if (nullIdRoles.length > 0) {
      console.log('\n❌ FOUND ROLES WITH NULL/UNDEFINED _id:');
      console.log(JSON.stringify(nullIdRoles, null, 2));
    } else {
      console.log('\n✅ All roles have valid _id fields');
    }
    
    // Show what would be sent to frontend
    console.log('\n📤 Data that would be sent to frontend:');
    const frontendData = roles.map(role => ({
      id: role._id,
      _id: role._id,
      name: role.name,
      isActive: role.isActive
    }));
    console.log(JSON.stringify(frontendData, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

debugRoleData();
