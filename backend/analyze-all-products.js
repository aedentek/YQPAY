const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/theater_canteen_db').then(async () => {
  const db = mongoose.connection.db;
  
  console.log('Checking ALL documents in productlist collection:\n');
  
  const allDocs = await db.collection('productlist').find({}).toArray();
  console.log('Total documents:', allDocs.length);
  
  allDocs.forEach((doc, index) => {
    console.log(`\n========== Document ${index + 1} ==========`);
    console.log('_id:', doc._id);
    console.log('theater:', doc.theater);
    console.log('theaterId:', doc.theaterId);
    
    // Check if it's a single product or a product container
    if (doc.name) {
      // Single product document (old structure)
      console.log('Type: SINGLE PRODUCT');
      console.log('Product Name:', doc.name);
      console.log('Has images array:', !!doc.images);
      console.log('Has productImage:', !!doc.productImage);
    } else if (doc.productList || doc.products) {
      // Product container (new structure)
      console.log('Type: PRODUCT CONTAINER (new structure)');
      const list = doc.productList || doc.products;
      console.log('Products in container:', list.length);
      
      if (list.length > 0) {
        console.log('\nProducts:');
        list.forEach((p, i) => {
          console.log(`  ${i + 1}. ${p.name}`);
          console.log(`     - images: ${p.images ? p.images.length : 0}`);
          console.log(`     - productImage: ${!!p.productImage}`);
        });
      }
    } else {
      console.log('Type: UNKNOWN');
      console.log('Keys:', Object.keys(doc));
    }
  });
  
  process.exit();
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
