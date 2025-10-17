/**
 * Fix October 2025 Carry Forward
 * 
 * This script updates October's carryForward from 0 to September's closingBalance (120)
 * and recalculates all balances accordingly.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const MonthlyStock = require('./models/MonthlyStock');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/YQPAY';

async function fixOctoberCarryForward() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all October 2025 documents
    const octoberDocs = await MonthlyStock.find({
      year: 2025,
      monthNumber: 10
    });

    console.log(`📋 Found ${octoberDocs.length} October 2025 documents\n`);

    for (const doc of octoberDocs) {
      console.log(`\n🔍 Processing: ${doc.month} ${doc.year}`);
      console.log(`   Theater ID: ${doc.theaterId}`);
      console.log(`   Product ID: ${doc.productId}`);
      console.log(`   Current carryForward: ${doc.carryForward}`);

      // Get September's closing balance
      const septemberDoc = await MonthlyStock.findOne({
        theaterId: doc.theaterId,
        productId: doc.productId,
        year: 2025,
        monthNumber: 9
      });

      if (septemberDoc) {
        const correctCarryForward = septemberDoc.closingBalance;
        console.log(`   September closingBalance: ${correctCarryForward}`);

        if (doc.carryForward !== correctCarryForward) {
          console.log(`   ⚠️  MISMATCH DETECTED!`);
          console.log(`   📝 Updating carryForward: ${doc.carryForward} → ${correctCarryForward}`);

          // Update carry forward
          doc.carryForward = correctCarryForward;

          // Recalculate all balances
          let runningBalance = correctCarryForward;
          console.log(`   🔄 Recalculating ${doc.stockDetails.length} entries...`);

          for (let i = 0; i < doc.stockDetails.length; i++) {
            const entry = doc.stockDetails[i];
            const oldBalance = entry.balance;

            runningBalance = runningBalance + entry.stockAdded - entry.usedStock - entry.expiredStock - entry.damageStock;
            entry.balance = Math.max(0, runningBalance);
            runningBalance = entry.balance;

            console.log(`      Entry ${i + 1}: Balance ${oldBalance} → ${entry.balance}`);
          }

          // Save the document (pre-save hook will update totals)
          await doc.save();

          console.log(`   ✅ Updated successfully!`);
          console.log(`   📊 New closingBalance: ${doc.closingBalance}`);
        } else {
          console.log(`   ✅ carryForward is already correct!`);
        }
      } else {
        console.log(`   ⚠️  No September document found for this product`);
      }
    }

    console.log('\n\n🎉 Fix completed successfully!\n');

    // Display summary
    console.log('📊 SUMMARY:');
    const updatedDocs = await MonthlyStock.find({
      year: 2025,
      monthNumber: 10
    });

    for (const doc of updatedDocs) {
      console.log(`\n${doc.month} ${doc.year} - Product: ${doc.productId}`);
      console.log(`  Carry Forward: ${doc.carryForward}`);
      console.log(`  Closing Balance: ${doc.closingBalance}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the fix
fixOctoberCarryForward();
