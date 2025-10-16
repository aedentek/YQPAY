/**
 * Fix Carry Forward Chain
 * 
 * This script updates all monthly documents to ensure carry forward values
 * are correctly set from previous month's closing balance.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const MonthlyStock = require('./models/MonthlyStock');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/YQPAY';

async function fixCarryForwardChain() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('🔍 Finding all products with stock data...\n');

    // Get all unique theater-product combinations
    const allDocs = await MonthlyStock.find().sort({ theaterId: 1, productId: 1, year: 1, monthNumber: 1 });
    
    // Group by theater and product
    const groups = {};
    allDocs.forEach(doc => {
      const key = `${doc.theaterId}-${doc.productId}`;
      if (!groups[key]) {
        groups[key] = {
          theaterId: doc.theaterId,
          productId: doc.productId,
          docs: []
        };
      }
      groups[key].docs.push(doc);
    });

    console.log(`📦 Found ${Object.keys(groups).length} unique products with stock data\n`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Process each product
    for (const key in groups) {
      const group = groups[key];
      console.log(`\n📍 Processing Product: ${group.productId}`);
      console.log(`   Theater: ${group.theaterId}`);
      console.log(`   Months: ${group.docs.length}\n`);

      let previousClosingBalance = 0;

      for (let i = 0; i < group.docs.length; i++) {
        const doc = group.docs[i];
        const expectedCarryForward = previousClosingBalance;

        console.log(`   📅 ${doc.month} ${doc.year}:`);
        console.log(`      Current carryForward: ${doc.carryForward}`);
        console.log(`      Expected carryForward: ${expectedCarryForward}`);
        console.log(`      Current closingBalance: ${doc.closingBalance}`);

        if (doc.carryForward !== expectedCarryForward) {
          console.log(`      ⚠️  MISMATCH! Updating...`);
          
          // Update carry forward
          doc.carryForward = expectedCarryForward;

          // Recalculate all balances
          let runningBalance = expectedCarryForward;
          for (let j = 0; j < doc.stockDetails.length; j++) {
            const entry = doc.stockDetails[j];
            runningBalance = runningBalance + entry.stockAdded - entry.usedStock - entry.expiredStock - entry.damageStock;
            entry.balance = Math.max(0, runningBalance);
            runningBalance = entry.balance;
          }

          // Save the document (pre-save hook will update closingBalance)
          await doc.save();

          console.log(`      ✅ Updated! New closingBalance: ${doc.closingBalance}`);
          previousClosingBalance = doc.closingBalance;
        } else {
          console.log(`      ✅ Correct!`);
          previousClosingBalance = doc.closingBalance;
        }
      }

      console.log(`\n   📊 Final chain for this product:`);
      const updatedDocs = await MonthlyStock.find({
        theaterId: group.theaterId,
        productId: group.productId
      }).sort({ year: 1, monthNumber: 1 });

      updatedDocs.forEach((doc, index) => {
        console.log(`      ${doc.month} ${doc.year}: Carry=${doc.carryForward} → Closing=${doc.closingBalance}`);
      });

      console.log('\n   ─────────────────────────────────────────────────────────');
    }

    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('🎉 Carry Forward Chain Fix Completed!\n');

    // Display final summary
    console.log('📊 FINAL SUMMARY:\n');
    for (const key in groups) {
      const group = groups[key];
      console.log(`Product: ${group.productId.substring(0, 8)}...`);
      
      const finalDocs = await MonthlyStock.find({
        theaterId: group.theaterId,
        productId: group.productId
      }).sort({ year: 1, monthNumber: 1 });

      finalDocs.forEach(doc => {
        console.log(`  ${doc.month} ${doc.year}: ${doc.carryForward} + ${doc.totalStockAdded} - ${doc.totalUsedStock} - ${doc.totalExpiredStock} - ${doc.totalDamageStock} = ${doc.closingBalance}`);
      });
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the fix
fixCarryForwardChain();
