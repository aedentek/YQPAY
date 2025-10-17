const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/theater_canteen_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(async () => {
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const theaterId = '68ed25e6962cb3e997acc163';

    // Get productlist
    const productlistCollection = db.collection('productlist');
    const productlistDoc = await productlistCollection.findOne({
      theater: new mongoose.Types.ObjectId(theaterId)
    });

    console.log('📦 EXISTING PRODUCTS IN DATABASE:');
    console.log('=====================================');
    if (productlistDoc && productlistDoc.productList) {
      productlistDoc.productList.forEach((p, index) => {
        console.log(`\nProduct ${index + 1}:`);
        console.log(`  Name: "${p.name}"`);
        console.log(`  SKU: "${p.sku}"`);
        console.log(`  Quantity: ${p.inventory?.currentStock}`);
        console.log(`  Category ID: ${p.categoryId}`);
      });
    } else {
      console.log('  No products found');
    }

    // Get producttypes
    const productTypesCollection = db.collection('producttypes');
    const productTypesDoc = await productTypesCollection.findOne({
      theater: new mongoose.Types.ObjectId(theaterId)
    });

    console.log('\n\n🏷️  PRODUCT TYPES IN DATABASE:');
    console.log('=====================================');
    if (productTypesDoc && productTypesDoc.productTypeList) {
      productTypesDoc.productTypeList.forEach((pt, index) => {
        console.log(`\nProductType ${index + 1}:`);
        console.log(`  Name: "${pt.productName}"`);
        console.log(`  Code: "${pt.productCode}"`);
        console.log(`  Quantity: ${pt.quantity}`);
        console.log(`  IsActive: ${pt.isActive}`);
      });
    } else {
      console.log('  No product types found');
    }

    // Comparison logic
    console.log('\n\n🔍 FILTERING LOGIC ANALYSIS:');
    console.log('=====================================');
    
    if (productlistDoc?.productList && productTypesDoc?.productTypeList) {
      const existingProducts = productlistDoc.productList;
      const productTypes = productTypesDoc.productTypeList.filter(pt => pt.isActive);

      console.log(`\nTotal Existing Products: ${existingProducts.length}`);
      console.log(`Total Active ProductTypes: ${productTypes.length}`);

      productTypes.forEach(pt => {
        console.log(`\n--- Checking ProductType: "${pt.productName}" (${pt.productCode}) ---`);
        
        const shouldFilter = existingProducts.some(ep => {
          const nameMatch = ep.name === pt.productName;
          const codeMatch = ep.sku === pt.productCode;
          
          // UPDATED: Only check name + code (removed quantity check)
          const isDuplicate = nameMatch && codeMatch;
          
          console.log(`  Comparing with existing product "${ep.name}" (${ep.sku}):`);
          console.log(`    Name match: ${nameMatch}`);
          console.log(`    Code match: ${codeMatch}`);
          console.log(`    Is duplicate: ${isDuplicate}`);
          
          return isDuplicate;
        });

        console.log(`  Should be FILTERED OUT: ${shouldFilter}`);
        console.log(`  Should APPEAR in dropdown: ${!shouldFilter}`);
      });
    }

    await mongoose.connection.close();
    console.log('\n\n✅ Disconnected from MongoDB');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
