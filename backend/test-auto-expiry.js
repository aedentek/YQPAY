/**
 * Test Auto-Expiry Functionality
 * 
 * This script demonstrates and tests the automatic stock expiry feature.
 * Items expire at 00:01 AM the day AFTER the expiry date.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const MonthlyStock = require('./models/MonthlyStock');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/YQPAY';

async function testAutoExpiry() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Example: Find a stock entry with expiry date
    const theaterId = '68ed25e6962cb3e997acc163';
    const productId = '68f1246d95b17dc32bf21640';

    console.log('📋 Testing Auto-Expiry Logic\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Get September data (which has the entry with expiry on 16/10/2025)
    const septemberDoc = await MonthlyStock.findOne({
      theaterId,
      productId,
      year: 2025,
      monthNumber: 9
    });

    if (!septemberDoc) {
      console.log('❌ September document not found');
      return;
    }

    console.log(`📅 September 2025 - Stock Details:`);
    console.log(`   Total Entries: ${septemberDoc.stockDetails.length}\n`);

    const now = new Date();
    console.log(`🕐 Current Date: ${now.toLocaleString('en-IN')}\n`);

    septemberDoc.stockDetails.forEach((entry, index) => {
      console.log(`\n📦 Entry ${index + 1}:`);
      console.log(`   Entry Date: ${new Date(entry.date).toLocaleDateString('en-IN')}`);
      console.log(`   Type: ${entry.type}`);
      console.log(`   Stock Added: ${entry.stockAdded}`);
      console.log(`   Used Stock: ${entry.usedStock}`);
      console.log(`   Expired Stock: ${entry.expiredStock}`);
      console.log(`   Damage Stock: ${entry.damageStock}`);
      console.log(`   Balance: ${entry.balance}`);
      
      if (entry.expireDate) {
        const expiry = new Date(entry.expireDate);
        console.log(`   Expiry Date: ${expiry.toLocaleDateString('en-IN')}`);
        
        // Calculate when it will expire
        const dayAfterExpiry = new Date(expiry);
        dayAfterExpiry.setDate(expiry.getDate() + 1);
        dayAfterExpiry.setHours(0, 1, 0, 0);
        
        console.log(`   Expires At: ${dayAfterExpiry.toLocaleString('en-IN')} (00:01 AM day after expiry)`);
        
        const isExpired = now >= dayAfterExpiry;
        console.log(`   Status: ${isExpired ? '❌ EXPIRED' : '✅ VALID'}`);
        
        if (!isExpired) {
          const timeUntilExpiry = dayAfterExpiry - now;
          const hoursUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60 * 60));
          const daysUntilExpiry = Math.floor(hoursUntilExpiry / 24);
          console.log(`   Time Until Expiry: ${daysUntilExpiry} days, ${hoursUntilExpiry % 24} hours`);
        }
        
        // Calculate what should be expired
        const remainingStock = Math.max(0, 
          entry.stockAdded - entry.usedStock - entry.expiredStock - entry.damageStock
        );
        
        if (isExpired && remainingStock > 0) {
          console.log(`   ⚠️  Action Required: ${remainingStock} units should be auto-expired`);
        }
      } else {
        console.log(`   Expiry Date: Not set`);
      }
    });

    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('📊 Summary:');
    console.log(`   Opening Balance (Carry Forward): ${septemberDoc.carryForward}`);
    console.log(`   Total Stock Added: ${septemberDoc.totalStockAdded}`);
    console.log(`   Total Used: ${septemberDoc.totalUsedStock}`);
    console.log(`   Total Expired: ${septemberDoc.totalExpiredStock}`);
    console.log(`   Total Damaged: ${septemberDoc.totalDamageStock}`);
    console.log(`   Closing Balance: ${septemberDoc.closingBalance}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Test expiry logic
    console.log('\n🧪 Testing Expiry Logic:\n');
    
    const testDate = new Date('2025-10-16');
    console.log(`   If expiry date is: ${testDate.toLocaleDateString('en-IN')} (16 Oct 2025)`);
    
    const dayAfterExpiry = new Date(testDate);
    dayAfterExpiry.setDate(testDate.getDate() + 1);
    dayAfterExpiry.setHours(0, 1, 0, 0);
    console.log(`   Item expires at: ${dayAfterExpiry.toLocaleString('en-IN')}`);
    
    const testNow1 = new Date('2025-10-16T23:59:59');
    console.log(`   On ${testNow1.toLocaleString('en-IN')}: ${testNow1 >= dayAfterExpiry ? 'EXPIRED ❌' : 'VALID ✅'}`);
    
    const testNow2 = new Date('2025-10-17T00:00:59');
    console.log(`   On ${testNow2.toLocaleString('en-IN')}: ${testNow2 >= dayAfterExpiry ? 'EXPIRED ❌' : 'VALID ✅'}`);
    
    const testNow3 = new Date('2025-10-17T00:01:00');
    console.log(`   On ${testNow3.toLocaleString('en-IN')}: ${testNow3 >= dayAfterExpiry ? 'EXPIRED ❌' : 'VALID ✅'}`);
    
    const testNow4 = new Date('2025-10-18T00:00:00');
    console.log(`   On ${testNow4.toLocaleString('en-IN')}: ${testNow4 >= dayAfterExpiry ? 'EXPIRED ❌' : 'VALID ✅'}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the test
testAutoExpiry();
