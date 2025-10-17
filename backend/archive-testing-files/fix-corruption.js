const fs = require('fs');
const path = require('path');

console.log('🔧 Starting automatic corruption repair...');

// Files that need to be restored from backups
const restoreMap = [
  // Models
  { corrupted: 'models/PageAccess.js', backup: 'models/pageaccess_1.js' },
  { corrupted: 'models/Category.js', backup: 'models/category_1.js' },
  { corrupted: 'models/ProductType.js', backup: 'models/producttype_1.js' },
  { corrupted: 'models/Order.js', backup: 'models/order_1.js' },
  { corrupted: 'models/Settings.js', backup: 'models/settings_1.js' },
  { corrupted: 'models/Theater.js', backup: 'models/theater_1.js' },
  { corrupted: 'models/User.js', backup: 'models/user_1.js' },
  
  // Routes
  { corrupted: 'routes/qrcodes.js', backup: 'routes/qrcodes_1.js' },
  { corrupted: 'routes/auth.js', backup: 'routes/auth_1.js' },
  { corrupted: 'routes/orders.js', backup: 'routes/orders_1.js' },
  { corrupted: 'routes/settings.js', backup: 'routes/settings_1.js' },
  { corrupted: 'routes/theaters.js', backup: 'routes/theaters_1.js' },
  { corrupted: 'routes/upload.js', backup: 'routes/upload_1.js' },
  
  // Middleware
  { corrupted: 'middleware/auth.js', backup: 'middleware/auth_1.js' },
  { corrupted: 'middleware/theaterAccess.js', backup: 'middleware/theaterAccess_1.js' },
  { corrupted: 'middleware/uploadMiddleware.js', backup: 'middleware/uploadMiddleware_1.js' }
];

let restoredCount = 0;
let skippedCount = 0;

restoreMap.forEach(({ corrupted, backup }) => {
  const corruptedPath = path.resolve(corrupted);
  const backupPath = path.resolve(backup);
  
  // Check if backup exists
  if (!fs.existsSync(backupPath)) {
    console.log(`⚠️  Backup not found: ${backup}`);
    skippedCount++;
    return;
  }
  
  try {
    // Remove corrupted file if it exists
    if (fs.existsSync(corruptedPath)) {
      fs.unlinkSync(corruptedPath);
      console.log(`🗑️  Removed corrupted: ${corrupted}`);
    }
    
    // Copy backup to original location
    fs.copyFileSync(backupPath, corruptedPath);
    console.log(`✅ Restored: ${corrupted} from ${backup}`);
    restoredCount++;
    
  } catch (error) {
    console.error(`❌ Error restoring ${corrupted}:`, error.message);
    skippedCount++;
  }
});

console.log(`\n📊 Restoration Summary:`);
console.log(`✅ Files restored: ${restoredCount}`);
console.log(`⚠️  Files skipped: ${skippedCount}`);
console.log(`🎉 Corruption repair complete!`);