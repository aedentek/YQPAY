const mongoose = require('mongoose');
require('dotenv').config({ path: './_1.env' });

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

async function analyzeRoleAccessSystem() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 ROLE ACCESS MANAGEMENT - COMPREHENSIVE ANALYSIS');
    console.log('='.repeat(80) + '\n');

    const db = mongoose.connection.db;

    // Check pageaccesses collection
    console.log('📋 ANALYSIS 1: PageAccesses Collection\n');
    const pageAccessesColl = db.collection('pageaccesses');
    const pageAccessCount = await pageAccessesColl.countDocuments();
    const samplePageAccess = await pageAccessesColl.findOne();
    
    console.log(`  Total documents: ${pageAccessCount}`);
    console.log(`  Sample document structure:`);
    console.log(JSON.stringify(samplePageAccess, null, 2));

    // Check roles collection
    console.log('\n📋 ANALYSIS 2: Roles Collection\n');
    const rolesColl = db.collection('roles');
    const rolesCount = await rolesColl.countDocuments();
    const sampleRole = await rolesColl.findOne();
    
    console.log(`  Total roles: ${rolesCount}`);
    console.log(`  Sample role structure:`);
    console.log(JSON.stringify(sampleRole, null, 2));

    // Check for role-permissions or similar collections
    console.log('\n📋 ANALYSIS 3: Searching for Role-Permission Mappings\n');
    const collections = await db.listCollections().toArray();
    const relevantCollections = collections.filter(c => 
      c.name.toLowerCase().includes('role') || 
      c.name.toLowerCase().includes('permission') ||
      c.name.toLowerCase().includes('access')
    );
    
    console.log('  Relevant collections found:');
    relevantCollections.forEach(c => console.log(`    - ${c.name}`));

    // Check theaters for the test
    console.log('\n📋 ANALYSIS 4: Theaters (for Testing)\n');
    const theatersColl = db.collection('theaters');
    const testTheater = await theatersColl.findOne({ name: /sabarish/i });
    
    if (testTheater) {
      console.log(`  Test Theater: ${testTheater.name}`);
      console.log(`  Theater ID: ${testTheater._id}`);
    }

    // Check what the frontend is requesting
    console.log('\n📋 ANALYSIS 5: Expected API Endpoints\n');
    console.log('  Frontend expects these endpoints:');
    console.log('    1. GET /api/role-permissions?theaterId=XXX&page=1&limit=10');
    console.log('    2. GET /api/role-permissions/active-roles?theaterId=XXX');
    console.log('    3. GET /api/page-access?limit=100&isActive=true');
    console.log('    4. GET /api/theaters/{id}');

    // Check current backend routes
    console.log('\n📋 ANALYSIS 6: Current Backend Routes Status\n');
    console.log('  Routes that EXIST:');
    console.log('    ✅ /api/page-access (pageAccess.js)');
    console.log('    ✅ /api/roles (roles.js) - Recently added');
    console.log('    ✅ /api/theaters (theaters.js)');
    
    console.log('\n  Routes that are MISSING:');
    console.log('    ❌ /api/role-permissions');
    console.log('    ❌ /api/role-permissions/active-roles');

    console.log('\n' + '='.repeat(80));
    console.log('💡 KEY FINDINGS');
    console.log('='.repeat(80) + '\n');

    console.log('1. ISSUE: Frontend calls /api/role-permissions but this endpoint does NOT exist');
    console.log('2. ISSUE: Frontend calls /api/role-permissions/active-roles but this does NOT exist');
    console.log('3. DATABASE: pageaccesses collection exists with pages that can be assigned');
    console.log('4. DATABASE: roles collection exists with roles that need page access');
    console.log('5. MISSING: No relationship/mapping between roles and page access permissions');

    console.log('\n' + '='.repeat(80));
    console.log('🔧 RECOMMENDED FIX APPROACH');
    console.log('='.repeat(80) + '\n');

    console.log('OPTION 1: Use Existing Roles System (RECOMMENDED)');
    console.log('  - Roles already have "permissions" array with {page, pageName, hasAccess}');
    console.log('  - Frontend should use /api/roles endpoint instead of /api/role-permissions');
    console.log('  - Update Role Access Management to work with existing roles structure');
    console.log('  - Benefits: No new collections, uses existing working system\n');

    console.log('OPTION 2: Create New role-permissions Collection');
    console.log('  - Create rolePermissions model and routes');
    console.log('  - Store mappings between roles and page access');
    console.log('  - Benefits: Separation of concerns, more flexible\n');

    console.log('RECOMMENDATION: Use OPTION 1 - leverage existing roles.permissions structure');
    console.log('  because roles already contain page-level permissions!');

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error during analysis:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

analyzeRoleAccessSystem();
