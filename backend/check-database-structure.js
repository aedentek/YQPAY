const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/theater_canteen_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(async () => {
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('\n📚 Collections:', collections.map(c => c.name));

    const theaterId = '68ed25e6962cb3e997acc163';

    // Check productlist collection (NEW structure)
    const productlistCollection = db.collection('productlist');
    
    // Try both string and ObjectId
    let productlistDocs = await productlistCollection.find({ 
      theaterId: theaterId 
    }).toArray();

    if (productlistDocs.length === 0) {
      productlistDocs = await productlistCollection.find({ 
        theaterId: new mongoose.Types.ObjectId(theaterId) 
      }).toArray();
    }

    console.log('\n📦 PRODUCTLIST DOCUMENTS:', productlistDocs.length);
    if (productlistDocs.length > 0) {
      productlistDocs.forEach(doc => {
        console.log('\nTheater:', doc.theaterName);
        console.log('Products:', doc.products?.length || 0);
        if (doc.products) {
          doc.products.forEach(p => {
            console.log('  -', {
              name: p.name,
              sku: p.sku,
              quantity: p.inventory?.currentStock,
              categoryId: p.categoryId
            });
          });
        }
      });
    }

    // Check producttypes collection
    const productTypesCollection = db.collection('producttypes');
    
    let productTypes = await productTypesCollection.find({ 
      theaterId: theaterId 
    }).toArray();

    if (productTypes.length === 0) {
      productTypes = await productTypesCollection.find({ 
        theaterId: new mongoose.Types.ObjectId(theaterId) 
      }).toArray();
    }

    console.log('\n🏷️  PRODUCT TYPES:', productTypes.length);
    productTypes.forEach(pt => {
      console.log('  -', {
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
