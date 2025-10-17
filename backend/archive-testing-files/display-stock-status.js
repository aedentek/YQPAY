/**
 * Display Current Stock Status
 * 
 * Shows the current state of all monthly stock documents
 */

require('dotenv').config();
const mongoose = require('mongoose');
const MonthlyStock = require('./models/MonthlyStock');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/YQPAY';

async function displayStockStatus() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const theaterId = '68ed25e6962cb3e997acc163';
    const productId = '68f1246d95b17dc32bf21640';

    console.log('📊 Current Stock Status\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    const docs = await MonthlyStock.find({
      theaterId,
      productId
    }).sort({ year: 1, monthNumber: 1 });

    console.log(`Found ${docs.length} monthly documents:\n`);

    docs.forEach((doc, index) => {
      console.log(`${index + 1}. ${doc.month} ${doc.year}`);
      console.log(`   📥 Carry Forward: ${doc.carryForward}`);
      console.log(`   ➕ Total Added: ${doc.totalStockAdded}`);
      console.log(`   🛒 Total Sales: ${doc.totalUsedStock}`);
      console.log(`   ⏰ Total Expired: ${doc.totalExpiredStock}`);
      console.log(`   💔 Total Damaged: ${doc.totalDamageStock}`);
      console.log(`   📊 Closing Balance: ${doc.closingBalance}`);
      console.log(`   🧮 Calculation: ${doc.carryForward} + ${doc.totalStockAdded} - ${doc.totalUsedStock} - ${doc.totalExpiredStock} - ${doc.totalDamageStock} = ${doc.carryForward + doc.totalStockAdded - doc.totalUsedStock - doc.totalExpiredStock - doc.totalDamageStock}`);
      console.log(`   ✅ Match: ${doc.closingBalance === (doc.carryForward + doc.totalStockAdded - doc.totalUsedStock - doc.totalExpiredStock - doc.totalDamageStock) ? 'YES' : 'NO'}`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n📈 Carry Forward Chain:\n');
    
    docs.forEach((doc, index) => {
      if (index < docs.length - 1) {
        const nextDoc = docs[index + 1];
        const matches = doc.closingBalance === nextDoc.carryForward;
        console.log(`${doc.month} ${doc.year} Closing (${doc.closingBalance}) → ${nextDoc.month} ${nextDoc.year} Carry (${nextDoc.carryForward}) ${matches ? '✅' : '❌'}`);
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the display
displayStockStatus();
