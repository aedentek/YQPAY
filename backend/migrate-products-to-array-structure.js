const mongoose = require('mongoose');

/**
 * Migration Script: Convert Products from Individual Documents to Array Structure
 * 
 * BEFORE: Each product is a separate document with theaterId
 * AFTER: One document per theater with productList array (like categories)
 */

async function migrateProductsToArrayStructure() {
  try {
    await mongoose.connect('mongodb://localhost:27017/theater_canteen_db');
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const productsCollection = db.collection('productlist');
    
    // Step 1: Get all individual product documents
    const individualProducts = await productsCollection.find({
      name: { $exists: true } // Individual products have a 'name' field
    }).toArray();
    
    console.log(`\n📦 Found ${individualProducts.length} individual product documents`);
    
    if (individualProducts.length === 0) {
      console.log('✅ No individual products to migrate. Products may already be in array structure.');
      process.exit(0);
    }
    
    // Step 2: Group products by theater
    const productsByTheater = {};
    
    individualProducts.forEach(product => {
      const theaterId = product.theaterId || product.theater;
      const theaterIdStr = String(theaterId);
      
      if (!productsByTheater[theaterIdStr]) {
        productsByTheater[theaterIdStr] = [];
      }
      
      // Remove theater-level fields and prepare for array
      const { _id, theaterId: tid, theater, __v, ...productData } = product;
      
      productsByTheater[theaterIdStr].push({
        ...productData,
        _id: _id, // Keep the original _id for the product within the array
        createdAt: product.createdAt || new Date(),
        updatedAt: product.updatedAt || new Date()
      });
    });
    
    console.log(`\n🏢 Products grouped by ${Object.keys(productsByTheater).length} theaters:`);
    Object.entries(productsByTheater).forEach(([theaterId, products]) => {
      console.log(`   Theater ${theaterId}: ${products.length} products`);
    });
    
    // Step 3: Create new array-based documents for each theater
    console.log('\n🔄 Creating new array-based product documents...');
    
    for (const [theaterIdStr, products] of Object.entries(productsByTheater)) {
      const theaterObjectId = new mongoose.Types.ObjectId(theaterIdStr);
      
      // Check if a product container document already exists
      const existingContainer = await productsCollection.findOne({
        theater: theaterObjectId,
        productList: { $exists: true }
      });
      
      if (existingContainer) {
        console.log(`   ⚠️  Theater ${theaterIdStr}: Container already exists, skipping...`);
        continue;
      }
      
      const productContainer = {
        theater: theaterObjectId,
        productList: products,
        metadata: {
          totalProducts: products.length,
          activeProducts: products.filter(p => p.isActive).length,
          lastUpdatedAt: new Date()
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await productsCollection.insertOne(productContainer);
      console.log(`   ✅ Theater ${theaterIdStr}: Created container with ${products.length} products`);
    }
    
    // Step 4: Backup and delete individual product documents
    console.log('\n💾 Backing up and removing individual product documents...');
    
    // Create backup collection
    const backupCollection = db.collection('productlist_backup_' + Date.now());
    await backupCollection.insertMany(individualProducts);
    console.log(`   ✅ Backed up ${individualProducts.length} products to ${backupCollection.collectionName}`);
    
    // Delete individual product documents
    const deleteResult = await productsCollection.deleteMany({
      name: { $exists: true },
      productList: { $exists: false }
    });
    console.log(`   ✅ Deleted ${deleteResult.deletedCount} individual product documents`);
    
    // Step 5: Verify migration
    console.log('\n🔍 Verifying migration...');
    const containers = await productsCollection.find({ productList: { $exists: true } }).toArray();
    console.log(`   ✅ Found ${containers.length} product containers`);
    
    containers.forEach(container => {
      console.log(`      Theater ${container.theater}: ${container.productList.length} products`);
    });
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Migrated: ${individualProducts.length} products`);
    console.log(`   - Created: ${containers.length} product containers`);
    console.log(`   - Backup collection: ${backupCollection.collectionName}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run migration
console.log('🚀 Starting Products Migration to Array Structure...\n');
migrateProductsToArrayStructure()
  .then(() => {
    console.log('✅ All done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
