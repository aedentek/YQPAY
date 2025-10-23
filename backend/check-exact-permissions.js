/**
 * Check exact page names in Theater Admin role permissions
 */

const mongoose = require('mongoose');
const mongodbConfig = require('./config/mongodb.json');

async function checkPermissions() {
  try {
    await mongoose.connect(mongodbConfig.uri);
    
    const db = mongoose.connection.db;
    const rolesDoc = await db.collection('roles').findOne({
      theater: new mongoose.Types.ObjectId("68ed25e6962cb3e997acc163")
    });
    
    if (rolesDoc && rolesDoc.roleList && rolesDoc.roleList[0]) {
      const role = rolesDoc.roleList[0];
      console.log('Theater Admin Role Permissions:');
      console.log('=====================================');
      role.permissions.forEach(p => {
        console.log(`${p.page} (${p.pageName})`);
      });
      
      console.log('\n\nFrontend Mappings Expected:');
      console.log('=====================================');
      console.log('dashboard → TheaterDashboardWithId');
      console.log('order-interface → TheaterOrderInterface');
      console.log('online-pos → OnlinePOSInterface');
      console.log('order-history → TheaterOrderHistory');
      console.log('products → TheaterProductList');
      console.log('add-product → TheaterAddProductWithId');
      console.log('categories → TheaterCategories');
      console.log('product-types → TheaterProductTypes');
      console.log('reports → TheaterReports');
      console.log('settings → TheaterSettingsWithId');
    }
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkPermissions();
