/**
 * Fix Closing Balance Calculation Bug
 * 
 * Recalculates closing balance for all months using the correct formula:
 * Closing Balance = Carry Forward + Total Added - Total Sales - Total Expired - Total Damaged
 */

require('dotenv').config();
const mongoose = require('mongoose');
const MonthlyStock = require('./models/MonthlyStock');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/YQPAY';

async function fixClosingBalances() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('🔍 Finding all monthly stock documents...\n');

    const allDocs = await MonthlyStock.find().sort({ theaterId: 1, productId: 1, year: 1, monthNumber: 1 });
    
    console.log(`📦 Found ${allDocs.length} documents\n`);
    console.log('═══════════════════════════════════════════════════════════\n');

    let fixedCount = 0;

    for (const doc of allDocs) {
      console.log(`📅 ${doc.month} ${doc.year}`);
      console.log(`   Theater: ${doc.theaterId}`);
      console.log(`   Product: ${doc.productId}`);
      console.log(`   Current Closing Balance: ${doc.closingBalance}`);

      // Calculate correct closing balance
      const correctClosing = Math.max(0,
        (doc.carryForward || 0) +
        (doc.totalStockAdded || 0) -
        (doc.totalUsedStock || 0) -
        (doc.totalExpiredStock || 0) -
        (doc.totalDamageStock || 0)
      );

      console.log(`   Correct Closing Balance: ${correctClosing}`);
      console.log(`   Formula: ${doc.carryForward} + ${doc.totalStockAdded} - ${doc.totalUsedStock} - ${doc.totalExpiredStock} - ${doc.totalDamageStock} = ${correctClosing}`);

      if (doc.closingBalance !== correctClosing) {
        console.log(`   ⚠️  MISMATCH! Fixing...`);
        doc.closingBalance = correctClosing;
        await doc.save();
        fixedCount++;
        console.log(`   ✅ Fixed!`);
      } else {
        console.log(`   ✅ Already correct!`);
      }
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log(`🎉 Fix completed! Fixed ${fixedCount} documents\n`);

    // Now fix the carry forward chain
    console.log('🔄 Updating carry forward chain...\n');
    
    const groups = {};
    allDocs.forEach(doc => {
      const key = `${doc.theaterId}-${doc.productId}`;
      if (!groups[key]) {
        groups[key] = { theaterId: doc.theaterId, productId: doc.productId, docs: [] };
      }
      groups[key].docs.push(doc);
    });

    for (const key in groups) {
      const group = groups[key];
      console.log(`\n📍 Updating carry forward for product: ${group.productId.toString().substring(0, 8)}...`);
      
      const sortedDocs = await MonthlyStock.find({
        theaterId: group.theaterId,
        productId: group.productId
      }).sort({ year: 1, monthNumber: 1 });

      let previousClosing = 0;

      for (const doc of sortedDocs) {
        if (doc.carryForward !== previousClosing) {
          console.log(`   ${doc.month} ${doc.year}: Updating carry forward ${doc.carryForward} → ${previousClosing}`);
          doc.carryForward = previousClosing;
          await doc.save();
        }
        previousClosing = doc.closingBalance;
      }
    }

    console.log('\n\n📊 FINAL STATUS:\n');
    
    const finalDocs = await MonthlyStock.find().sort({ year: 1, monthNumber: 1 });
    
    for (const doc of finalDocs) {
      const calculated = (doc.carryForward || 0) + (doc.totalStockAdded || 0) - (doc.totalUsedStock || 0) - (doc.totalExpiredStock || 0) - (doc.totalDamageStock || 0);
      const match = doc.closingBalance === calculated ? '✅' : '❌';
      console.log(`${doc.month} ${doc.year}: CF=${doc.carryForward}, Closing=${doc.closingBalance}, Calc=${calculated} ${match}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the fix
fixClosingBalances();
