const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/theater_canteen_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(async () => {
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Check productlist collection RAW
    const productlistCollection = db.collection('productlist');
    const allProductlistDocs = await productlistCollection.find({}).toArray();

    console.log('\n📦 PRODUCTLIST RAW DATA:');
    console.log(JSON.stringify(allProductlistDocs, null, 2));

    // Check producttypes collection RAW
    const productTypesCollection = db.collection('producttypes');
    const allProductTypes = await productTypesCollection.find({}).toArray();

    console.log('\n\n🏷️  PRODUCTTYPES RAW DATA:');
    console.log(JSON.stringify(allProductTypes, null, 2));

    await mongoose.connection.close();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
