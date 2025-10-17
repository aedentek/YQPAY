const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/theater_canteen_db';
const theaterId = '68ed25e6962cb3e997acc163';

async function checkStockData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log('📊 Database:', mongoose.connection.name);
    
    const db = mongoose.connection.db;
    
    // Check ProductTypes (Templates)
    console.log('\n🔍 Checking ProductTypes (Product Templates)...');
    const productTypes = await db.collection('producttypes').findOne({
      theater: new mongoose.Types.ObjectId(theaterId)
    });
    
    if (productTypes && productTypes.productTypeList) {
      console.log(`\n✅ Found ${productTypes.productTypeList.length} product types`);
      
      productTypes.productTypeList.forEach((type, index) => {
        console.log(`\n${index + 1}. ${type.productName}`);
        console.log(`   Product Code: ${type.productCode || 'N/A'}`);
        console.log(`   Quantity (Template): ${type.quantity}`);
        console.log(`   IsActive: ${type.isActive}`);
      });
    } else {
      console.log('❌ No product types found');
    }
    
    // Check NEW structure (productlist)
    console.log('\n\n🔍 Checking Actual Products (productlist collection)...');
    const productContainer = await db.collection('productlist').findOne({
      theater: new mongoose.Types.ObjectId(theaterId)
    });
    
    if (productContainer && productContainer.productList) {
      console.log(`\n✅ Found ${productContainer.productList.length} products in productlist`);
      
      productContainer.productList.forEach((product, index) => {
        console.log(`\n${index + 1}. ${product.name}`);
        console.log(`   Stock: ${product.inventory?.currentStock || 0}`);
        console.log(`   Full Inventory:`, product.inventory);
      });
    } else {
      console.log('❌ No products found in productlist collection');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkStockData();
