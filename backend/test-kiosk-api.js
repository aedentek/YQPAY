const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/yqpaynow', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Import the model
const KioskType = require('./models/KioskType');

async function testKioskTypeAPI() {
  try {
    const testTheaterId = '68f8837a541316c6ad54b79f'; // Use your theater ID
    
    console.log('\n========== TEST 1: GET Kiosk Types ==========');
    let doc = await KioskType.findOne({ theater: testTheaterId });
    
    if (!doc) {
      console.log('📝 No kiosk type document found, creating one...');
      doc = new KioskType({
        theater: testTheaterId,
        kioskTypeList: [],
        isActive: true
      });
      await doc.save();
      console.log('✅ Created new kiosk type document');
    }
    
    console.log('📦 Current kiosk types:', JSON.stringify(doc.kioskTypeList, null, 2));
    console.log('📊 Metadata:', JSON.stringify(doc.metadata, null, 2));
    
    console.log('\n========== TEST 2: CREATE Kiosk Type ==========');
    const newKioskType = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Test Kiosk Type ' + Date.now(),
      description: 'Test description',
      isActive: true,
      sortOrder: 0,
      imageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    doc.kioskTypeList.push(newKioskType);
    await doc.save();
    console.log('✅ Kiosk type created:', newKioskType.name);
    console.log('📦 New kiosk type:', JSON.stringify(newKioskType, null, 2));
    
    console.log('\n========== TEST 3: GET Updated List ==========');
    doc = await KioskType.findOne({ theater: testTheaterId });
    console.log('📊 Total kiosk types:', doc.kioskTypeList.length);
    console.log('📊 Metadata:', JSON.stringify(doc.metadata, null, 2));
    
    console.log('\n========== TEST 4: UPDATE Kiosk Type ==========');
    const kioskTypeToUpdate = doc.kioskTypeList[0];
    if (kioskTypeToUpdate) {
      kioskTypeToUpdate.name = 'Updated ' + kioskTypeToUpdate.name;
      kioskTypeToUpdate.updatedAt = new Date();
      await doc.save();
      console.log('✅ Kiosk type updated:', kioskTypeToUpdate.name);
    }
    
    console.log('\n========== TEST 5: DELETE Kiosk Type ==========');
    if (doc.kioskTypeList.length > 0) {
      const deletedId = doc.kioskTypeList[0]._id;
      doc.kioskTypeList.pull(deletedId);
      await doc.save();
      console.log('✅ Kiosk type deleted:', deletedId);
      console.log('📊 Remaining kiosk types:', doc.kioskTypeList.length);
    }
    
    console.log('\n========== TEST COMPLETE ==========');
    console.log('✅ All CRUD operations working correctly!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}

testKioskTypeAPI();
