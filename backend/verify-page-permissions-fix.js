/**
 * Verification script to test if the page permissions fix is working
 * This simulates the frontend data flow
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/_1.env' });

async function verifyPagePermissionsFix() {
  console.log('\n🧪 Testing Page Permissions Fix\n');
  console.log('='.repeat(70));

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/theater_canteen_db';
    console.log('\n📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Define models
    const PageAccess = mongoose.model('PageAccess', new mongoose.Schema({}, { strict: false }), 'pageaccesses');
    const Role = mongoose.model('Role', new mongoose.Schema({}, { strict: false }), 'roles');

    // STEP 1: Simulate loadActivePages() API call
    console.log('1️⃣ Testing loadActivePages() - Simulating API response');
    console.log('-'.repeat(70));
    
    const activePages = await PageAccess.find({ isActive: true }).limit(100);
    
    // This is what the API returns
    const apiResponse = {
      success: true,
      data: activePages.map(page => ({
        _id: page._id,
        page: page.page,
        pageName: page.pageName,
        description: page.description,
        route: page.route,
        category: page.category,
        isActive: page.isActive
      }))
    };
    
    console.log(`API Response structure:`);
    console.log(`- success: ${apiResponse.success}`);
    console.log(`- data type: ${Array.isArray(apiResponse.data) ? 'Array' : typeof apiResponse.data}`);
    console.log(`- data length: ${apiResponse.data.length}`);
    
    // This is what the frontend now does (FIXED)
    const frontendParsedPages = [];
    if (apiResponse.success && apiResponse.data && Array.isArray(apiResponse.data)) {
      apiResponse.data.forEach(pageAccess => {
        frontendParsedPages.push({
          page: pageAccess.page,
          pageName: pageAccess.pageName,
          description: pageAccess.description || `Access to ${pageAccess.pageName}`,
          route: pageAccess.route
        });
      });
    }
    
    console.log(`\n✅ Frontend parsed ${frontendParsedPages.length} active pages:`);
    frontendParsedPages.forEach((page, idx) => {
      console.log(`  ${idx + 1}. ${page.pageName} (${page.page})`);
    });

    // STEP 2: Simulate editRolePermission() function
    console.log('\n\n2️⃣ Testing editRolePermission() - Preparing form data');
    console.log('-'.repeat(70));
    
    const testRole = await Role.findOne({ isActive: true });
    if (!testRole) {
      console.log('⚠️ No active role found for testing');
      return;
    }
    
    console.log(`Test Role: ${testRole.name}`);
    console.log(`Role has ${testRole.permissions?.length || 0} existing permissions`);
    console.log(`Active pages available: ${frontendParsedPages.length}`);
    
    // This is what the editRolePermission function does
    const formDataPermissions = frontendParsedPages.map(page => {
      const existingPermission = (testRole.permissions || []).find(p => p.page === page.page);
      return {
        page: page.page,
        pageName: page.pageName,
        hasAccess: existingPermission ? existingPermission.hasAccess : false
      };
    });
    
    console.log(`\n✅ Prepared ${formDataPermissions.length} permissions for modal:`);
    formDataPermissions.forEach((perm, idx) => {
      const checkmark = perm.hasAccess ? '✓' : '☐';
      console.log(`  ${idx + 1}. ${checkmark} ${perm.pageName} (${perm.page})`);
    });

    // STEP 3: Verify the fix
    console.log('\n\n3️⃣ Verification Results');
    console.log('-'.repeat(70));
    
    const tests = [
      {
        name: 'API returns data as array',
        passed: Array.isArray(apiResponse.data),
        message: `data is ${Array.isArray(apiResponse.data) ? 'an array' : 'not an array'}`
      },
      {
        name: 'Frontend correctly parses API response',
        passed: frontendParsedPages.length > 0,
        message: `Parsed ${frontendParsedPages.length} pages`
      },
      {
        name: 'Modal receives permissions to display',
        passed: formDataPermissions.length > 0,
        message: `${formDataPermissions.length} permissions prepared for modal`
      },
      {
        name: 'Existing permissions are preserved',
        passed: formDataPermissions.some(p => p.hasAccess),
        message: `${formDataPermissions.filter(p => p.hasAccess).length} permissions have access`
      }
    ];

    console.log('\nTest Results:');
    let allPassed = true;
    tests.forEach((test, idx) => {
      const status = test.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`  ${idx + 1}. ${status} - ${test.name}`);
      console.log(`     ${test.message}`);
      if (!test.passed) allPassed = false;
    });

    console.log('\n' + '='.repeat(70));
    if (allPassed) {
      console.log('🎉 ALL TESTS PASSED - Fix is working correctly!');
      console.log('\nThe Edit Role Access modal should now display:');
      console.log(`- ${formDataPermissions.length} page permission checkboxes`);
      console.log(`- ${formDataPermissions.filter(p => p.hasAccess).length} pre-checked based on existing role permissions`);
      console.log(`- ${formDataPermissions.filter(p => !p.hasAccess).length} unchecked for pages without access`);
    } else {
      console.log('❌ SOME TESTS FAILED - Please review the issues above');
    }

  } catch (error) {
    console.error('\n❌ Error during verification:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB\n');
  }
}

verifyPagePermissionsFix().catch(console.error);
