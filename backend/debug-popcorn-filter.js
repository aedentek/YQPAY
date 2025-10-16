const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/theater_canteen_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(async () => {
    console.log('✅ Connected to MongoDB');

    const Product = require('./models/Product');
    const ProductType = require('./models/ProductType');

    const theaterId = '68ed25e6962cb3e997acc163';

    // Get existing products
    const products = await Product.find({ 
      theaterId: new mongoose.Types.ObjectId(theaterId) 
    }).select('name sku inventory categoryId');

    console.log('\n📦 EXISTING PRODUCTS:');
    products.forEach(p => {
      console.log({
        name: p.name,
        sku: p.sku,
        quantity: p.inventory?.currentStock,
        categoryId: p.categoryId?.toString()
      });
    });

    // Get product types
    const productTypes = await ProductType.find({
      theaterId: new mongoose.Types.ObjectId(theaterId),
      isActive: true
    }).select('productName productCode quantity');

    console.log('\n🏷️  PRODUCT TYPES:');
    productTypes.forEach(pt => {
      console.log({
        name: pt.productName,
        code: pt.productCode,
        quantity: pt.quantity
      });
    });

    // Check Pop Corn specifically
    console.log('\n🔍 POP CORN COMPARISON:');
    const popCornProduct = products.find(p => p.name === 'Pop Corn');
    const popCornType = productTypes.find(pt => pt.productName === 'Pop Corn');

    if (popCornProduct && popCornType) {
      console.log('Product:', {
        name: popCornProduct.name,
        sku: popCornProduct.sku,
        quantity: popCornProduct.inventory?.currentStock
      });
      console.log('ProductType:', {
        name: popCornType.productName,
        code: popCornType.productCode,
        quantity: popCornType.quantity
      });

      const nameMatch = popCornProduct.name === popCornType.productName;
      const codeMatch = popCornProduct.sku === popCornType.productCode;
      const quantityMatch = (popCornProduct.inventory?.currentStock || 0) === (popCornType.quantity || 0);

      console.log('\nMatches:', { nameMatch, codeMatch, quantityMatch });
      console.log('Should filter?', nameMatch && codeMatch && quantityMatch);

      // Check types
      console.log('\nType comparison:');
      console.log('Product quantity type:', typeof popCornProduct.inventory?.currentStock, '=', popCornProduct.inventory?.currentStock);
      console.log('ProductType quantity type:', typeof popCornType.quantity, '=', popCornType.quantity);
    }

    await mongoose.connection.close();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
