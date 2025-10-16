const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/theater_canteen_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(async () => {
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Check productlist collection (NEW structure)
    const productlistCollection = db.collection('productlist');
    const allProductlistDocs = await productlistCollection.find({}).toArray();

    console.log('\n📦 ALL PRODUCTLIST DOCUMENTS:', allProductlistDocs.length);
    allProductlistDocs.forEach((doc, index) => {
        console.log(`\nDocument ${index + 1}:`);
        console.log('  Theater ID:', doc.theaterId);
        console.log('  Theater Name:', doc.theaterName);
        console.log('  Products:', doc.products?.length || 0);
        if (doc.products && doc.products.length > 0) {
          doc.products.forEach(p => {
            console.log('    -', {
              name: p.name,
              sku: p.sku,
              quantity: p.inventory?.currentStock,
              categoryId: p.categoryId
            });
          });
        }
    });

    // Check producttypes collection
    const productTypesCollection = db.collection('producttypes');
    const allProductTypes = await productTypesCollection.find({}).toArray();

    console.log('\n\n🏷️  ALL PRODUCT TYPES:', allProductTypes.length);
    allProductTypes.forEach((pt, index) => {
      console.log(`${index + 1}.`, {
        theaterId: pt.theaterId,
        name: pt.productName,
        code: pt.productCode,
        quantity: pt.quantity,
        isActive: pt.isActive
      });
    });

    await mongoose.connection.close();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
