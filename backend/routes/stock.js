const express = require('express');
const router = express.Router();
const MonthlyStock = require('../models/MonthlyStock');
const Product = require('../models/Product');
const { authenticateToken, requireTheaterAccess } = require('../middleware/auth');
const { getProductById, updateProductStock } = require('../utils/productHelper');

// Helper function to auto-expire stock across all months
async function autoExpireStock(theaterId, productId) {
  const now = new Date();
  
  // Get all monthly documents for this product
  const allMonthlyDocs = await MonthlyStock.find({
    theaterId,
    productId
  }).sort({ year: 1, monthNumber: 1 });
  
  let hasAnyExpiredItems = false;
  
  // Track expired stock by expiry month
  const expiredByMonth = {}; // key: "year-month", value: { fromCarryForward: number, fromCurrentMonth: number }
  
  for (const monthlyDoc of allMonthlyDocs) {
    for (let i = 0; i < monthlyDoc.stockDetails.length; i++) {
      const entry = monthlyDoc.stockDetails[i];
      
      if (entry.expireDate) {
        const expiry = new Date(entry.expireDate);
        
        // Items expire at 00:01 AM the day AFTER the expiry date
        const dayAfterExpiry = new Date(expiry);
        dayAfterExpiry.setDate(expiry.getDate() + 1);
        dayAfterExpiry.setHours(0, 1, 0, 0);
        
        const isExpired = now >= dayAfterExpiry;
        
        if (isExpired) {
          // Calculate remaining stock that should expire
          const remainingStock = Math.max(0, 
            entry.stockAdded - entry.usedStock - entry.expiredStock - entry.damageStock
          );
          
          if (remainingStock > 0) {
            const entryDate = new Date(entry.date);
            const entryMonth = `${entryDate.getFullYear()}-${entryDate.getMonth() + 1}`;
            const expiryMonth = `${expiry.getFullYear()}-${expiry.getMonth() + 1}`;
            
            console.log(`  ⚠️ Stock expiring:`, {
              entryMonth: `${entryDate.getMonth() + 1}/${entryDate.getFullYear()}`,
              expiryMonth: `${expiry.getMonth() + 1}/${expiry.getFullYear()}`,
              quantity: remainingStock
            });
            
            // Initialize expiry month tracking
            if (!expiredByMonth[expiryMonth]) {
              expiredByMonth[expiryMonth] = { fromCarryForward: 0, fromCurrentMonth: 0 };
            }
            
            // If entry month != expiry month, it's carry forward expiry
            if (entryMonth !== expiryMonth) {
              expiredByMonth[expiryMonth].fromCarryForward += remainingStock;
              console.log(`     → Will expire as CARRY FORWARD in ${expiryMonth}`);
            } else {
              expiredByMonth[expiryMonth].fromCurrentMonth += remainingStock;
              // Mark as expired in the current entry
              entry.expiredStock += remainingStock;
              console.log(`     → Will expire as CURRENT MONTH in ${expiryMonth}`);
            }
            
            hasAnyExpiredItems = true;
          }
        }
      }
    }
    
    // Save if any current month entries were expired
    const monthKey = `${monthlyDoc.year}-${monthlyDoc.monthNumber}`;
    if (expiredByMonth[monthKey] && expiredByMonth[monthKey].fromCurrentMonth > 0) {
      let runningBalance = monthlyDoc.carryForward;
      
      for (let i = 0; i < monthlyDoc.stockDetails.length; i++) {
        const entry = monthlyDoc.stockDetails[i];
        entry.balance = Math.max(0, runningBalance + entry.stockAdded - entry.usedStock - entry.expiredStock - entry.damageStock);
        runningBalance = entry.balance;
      }
      
      await monthlyDoc.save();
      console.log(`  💾 Saved current month expired stock for ${monthlyDoc.month} ${monthlyDoc.year}`);
    }
  }
  
  // Now update each month with carry forward expired stock
  for (const monthKey in expiredByMonth) {
    const [year, monthNumber] = monthKey.split('-').map(Number);
    const doc = await MonthlyStock.findOne({ theaterId, productId, year, monthNumber });
    
    if (doc && expiredByMonth[monthKey].fromCarryForward > 0) {
      doc.expiredCarryForwardStock = expiredByMonth[monthKey].fromCarryForward;
      await doc.save();
      console.log(`  💾 Updated carry forward expired stock for ${doc.month} ${doc.year}: ${expiredByMonth[monthKey].fromCarryForward}`);
    }
  }
  
  return hasAnyExpiredItems;
}

// Helper function to update carry forward chain for all months
async function updateCarryForwardChain(theaterId, productId) {
  // Get all monthly documents sorted by date
  const allDocs = await MonthlyStock.find({
    theaterId,
    productId
  }).sort({ year: 1, monthNumber: 1 });

  let hasUpdates = false;

  for (let i = 0; i < allDocs.length; i++) {
    const doc = allDocs[i];
    
    // Get correct carry forward from previous month
    const correctCarryForward = await MonthlyStock.getPreviousMonthBalance(
      theaterId, 
      productId, 
      doc.year, 
      doc.monthNumber
    );

    // If carry forward doesn't match, update it
    if (doc.carryForward !== correctCarryForward) {
      console.log(`🔄 Updating ${doc.month} ${doc.year} carryForward: ${doc.carryForward} → ${correctCarryForward}`);
      doc.carryForward = correctCarryForward;

      // Recalculate all balances
      let runningBalance = correctCarryForward;
      for (let j = 0; j < doc.stockDetails.length; j++) {
        const entry = doc.stockDetails[j];
        runningBalance = runningBalance + entry.stockAdded - entry.usedStock - entry.expiredStock - entry.damageStock;
        entry.balance = Math.max(0, runningBalance);
        runningBalance = entry.balance;
      }

      await doc.save();
      hasUpdates = true;
    }
  }

  return hasUpdates;
}

// GET /:theaterId/:productId - Get monthly stock data
router.get('/:theaterId/:productId', authenticateToken, requireTheaterAccess, async (req, res) => {
  try {
    const { theaterId, productId } = req.params;
    const { year, month } = req.query;

    console.log('GET Monthly Stock - Params:', { theaterId, productId, year, month });

    const currentDate = new Date();
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();
    const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;

    // ✅ AUTO-EXPIRE STOCK ACROSS ALL MONTHS
    console.log('🔍 Checking for expired items across all months...');
    const hasExpiredItems = await autoExpireStock(theaterId, productId);

    // ✅ UPDATE CARRY FORWARD CHAIN FOR ALL MONTHS
    console.log('🔄 Updating carry forward chain...');
    await updateCarryForwardChain(theaterId, productId);

    const previousBalance = await MonthlyStock.getPreviousMonthBalance(theaterId, productId, targetYear, targetMonth);
    const monthlyDoc = await MonthlyStock.getOrCreateMonthlyDoc(theaterId, productId, targetYear, targetMonth, previousBalance);

    // Update product's current stock if items were expired
    if (hasExpiredItems) {
      try {
        await updateProductStock(productId, theaterId, {
          currentStock: monthlyDoc.closingBalance
        });
        console.log('  ✅ Updated product current stock after auto-expiry');
      } catch (prodError) {
        console.error('  ❌ Failed to update product stock:', prodError.message);
      }
    }

    // Log closing balance for debugging
    console.log('  📊 Closing Balance:', {
      raw: monthlyDoc.closingBalance,
      enforced: Math.max(0, monthlyDoc.closingBalance)
    });

    const product = await getProductById(productId, theaterId);

    const response = {
      success: true,
      data: {
        entries: monthlyDoc.stockDetails.map(detail => ({
          _id: detail._id,
          type: detail.type,
          quantity: detail.quantity,
          usedStock: detail.usedStock || 0,
          damageStock: detail.damageStock || 0,
          balance: detail.balance || 0,
          displayData: {
            stockAdded: detail.stockAdded,
            usedStock: detail.usedStock,
            expiredStock: detail.expiredStock,
            damageStock: detail.damageStock,
            balance: detail.balance
          },
          date: detail.date,
          entryDate: detail.date,
          expireDate: detail.expireDate,
          batchNumber: detail.batchNumber,
          notes: detail.notes
        })),
        currentStock: Math.max(0, monthlyDoc.closingBalance),
        statistics: {
          totalAdded: monthlyDoc.totalStockAdded,
          totalSold: monthlyDoc.totalUsedStock,
          totalExpired: monthlyDoc.totalExpiredStock,
          expiredOldStock: monthlyDoc.expiredCarryForwardStock || 0,
          totalDamaged: monthlyDoc.totalDamageStock,
          openingBalance: Math.max(0, monthlyDoc.carryForward),
          closingBalance: Math.max(0, monthlyDoc.closingBalance)
        },
        period: {
          year: monthlyDoc.year,
          month: monthlyDoc.monthNumber,
          monthName: monthlyDoc.month
        },
        product: product ? {
          _id: product._id,
          name: product.name,
          currentStock: Math.max(0, monthlyDoc.closingBalance)
        } : null
      }
    };

    res.json(response);

  } catch (error) {
    console.error('GET Monthly Stock Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monthly stock data',
      error: error.message
    });
  }
});

// POST /:theaterId/:productId - Add stock entry to monthly document
router.post('/:theaterId/:productId', authenticateToken, requireTheaterAccess, async (req, res) => {
  try {
    const { theaterId, productId } = req.params;
    const { date, type, quantity, usedStock, damageStock, balance, expireDate, notes, batchNumber } = req.body;

    console.log('POST Stock Entry:', { theaterId, productId, date, type, quantity, usedStock, damageStock, balance });

    // Validation
    if (!type || !quantity || !date) {
      return res.status(400).json({
        success: false,
        message: 'Date, type, and quantity are required'
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be greater than 0'
      });
    }

    // Parse the entry date
    const entryDate = new Date(date);
    const year = entryDate.getFullYear();
    const monthNumber = entryDate.getMonth() + 1;

    // Get previous month's closing balance
    const previousBalance = await MonthlyStock.getPreviousMonthBalance(theaterId, productId, year, monthNumber);
    
    // Get or create monthly document
    let monthlyDoc = await MonthlyStock.getOrCreateMonthlyDoc(theaterId, productId, year, monthNumber, previousBalance);

    // Calculate current balance
    let currentBalance = monthlyDoc.carryForward;
    if (monthlyDoc.stockDetails.length > 0) {
      const lastEntry = monthlyDoc.stockDetails[monthlyDoc.stockDetails.length - 1];
      currentBalance = lastEntry.balance;
    }

    // Create new stock detail entry
    const newEntry = {
      date: entryDate,
      type,
      quantity,
      stockAdded: 0,
      usedStock: usedStock || 0,
      expiredStock: 0,
      damageStock: damageStock || 0,
      balance: balance || currentBalance,
      expireDate: expireDate || undefined,
      batchNumber: batchNumber || undefined,
      notes: notes || undefined
    };

    // Populate display fields based on type
    const qty = Math.abs(quantity);
    switch (type) {
      case 'ADDED':
      case 'RETURNED':
        newEntry.stockAdded = qty;
        // Balance already calculated in frontend and passed (minimum 0)
        newEntry.balance = Math.max(0, balance || (currentBalance + qty - (usedStock || 0) - (damageStock || 0)));
        break;
      case 'SOLD':
        newEntry.usedStock = qty;
        newEntry.balance = Math.max(0, currentBalance - qty);
        break;
      case 'EXPIRED':
        newEntry.expiredStock = qty;
        newEntry.balance = Math.max(0, currentBalance - qty);
        break;
      case 'DAMAGED':
        newEntry.damageStock = qty;
        newEntry.balance = Math.max(0, currentBalance - qty);
        break;
      case 'ADJUSTMENT':
        if (quantity > 0) {
          newEntry.stockAdded = qty;
          newEntry.balance = Math.max(0, currentBalance + qty);
        } else {
          newEntry.usedStock = qty;
          newEntry.balance = Math.max(0, currentBalance - qty);
        }
        break;
    }

    // Add entry to stockDetails array
    monthlyDoc.stockDetails.push(newEntry);

    // Save (pre-save hook will recalculate totals)
    await monthlyDoc.save();

    // Update product's current stock
    try {
      await updateProductStock(productId, theaterId, {
        currentStock: monthlyDoc.closingBalance
      });
    } catch (prodError) {
      console.error('Failed to update product stock:', prodError.message);
    }

    // Return response
    res.status(201).json({
      success: true,
      message: 'Stock entry added successfully',
      data: {
        entry: {
          _id: newEntry._id,
          date: newEntry.date,
          type: newEntry.type,
          quantity: newEntry.quantity,
          displayData: {
            stockAdded: newEntry.stockAdded,
            usedStock: newEntry.usedStock,
            expiredStock: newEntry.expiredStock,
            damageStock: newEntry.damageStock,
            balance: newEntry.balance
          }
        },
        currentStock: monthlyDoc.closingBalance,
        monthlyTotals: {
          totalStockAdded: monthlyDoc.totalStockAdded,
          totalUsedStock: monthlyDoc.totalUsedStock,
          totalExpiredStock: monthlyDoc.totalExpiredStock,
          totalDamageStock: monthlyDoc.totalDamageStock
        }
      }
    });

  } catch (error) {
    console.error('POST Stock Entry Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add stock entry',
      error: error.message
    });
  }
});

// PUT /:theaterId/:productId/:entryId - Update stock entry
router.put('/:theaterId/:productId/:entryId', authenticateToken, requireTheaterAccess, async (req, res) => {
  try {
    const { theaterId, productId, entryId } = req.params;
    const { date, type, quantity, usedStock, damageStock, balance, expireDate, notes, batchNumber } = req.body;

    console.log('PUT Stock Entry:', { theaterId, productId, entryId, type, quantity, usedStock, damageStock, balance });

    // Parse the entry date
    const entryDate = new Date(date);
    const year = entryDate.getFullYear();
    const monthNumber = entryDate.getMonth() + 1;

    // Find the monthly document
    const monthlyDoc = await MonthlyStock.findOne({
      theaterId,
      productId,
      year,
      monthNumber
    });

    if (!monthlyDoc) {
      return res.status(404).json({
        success: false,
        message: 'Monthly document not found'
      });
    }

    // Find the entry to update
    const entryIndex = monthlyDoc.stockDetails.findIndex(e => e._id.toString() === entryId);
    
    if (entryIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Stock entry not found'
      });
    }

    // Update the entry
    monthlyDoc.stockDetails[entryIndex].date = entryDate;
    monthlyDoc.stockDetails[entryIndex].type = type;
    monthlyDoc.stockDetails[entryIndex].quantity = quantity;
    monthlyDoc.stockDetails[entryIndex].expireDate = expireDate;
    monthlyDoc.stockDetails[entryIndex].notes = notes;
    monthlyDoc.stockDetails[entryIndex].batchNumber = batchNumber;

    // Store user-entered usedStock and damageStock from request
    const userEnteredUsedStock = usedStock || 0;
    const userEnteredDamageStock = damageStock || 0;

    // Recalculate all balances from the beginning
    let runningBalance = monthlyDoc.carryForward;
    
    for (let i = 0; i < monthlyDoc.stockDetails.length; i++) {
      const entry = monthlyDoc.stockDetails[i];
      const qty = Math.abs(entry.quantity);
      
      // Check if this is the entry being updated
      const isUpdatedEntry = (i === entryIndex);
      
      // Reset display fields
      entry.stockAdded = 0;
      entry.expiredStock = 0;
      
      // For the updated entry, preserve user-entered values
      if (isUpdatedEntry) {
        entry.usedStock = userEnteredUsedStock;
        entry.damageStock = userEnteredDamageStock;
      } else {
        entry.usedStock = 0;
        entry.damageStock = 0;
      }
      
      // Calculate based on type
      switch (entry.type) {
        case 'ADDED':
        case 'RETURNED':
          entry.stockAdded = qty;
          // For ADDED type with user-entered used/damage, calculate balance accordingly
          if (isUpdatedEntry) {
            runningBalance = runningBalance + qty - entry.usedStock - entry.damageStock;
          } else {
            runningBalance += qty;
          }
          break;
        case 'SOLD':
          entry.usedStock = qty;
          runningBalance -= qty;
          break;
        case 'EXPIRED':
          entry.expiredStock = qty;
          runningBalance -= qty;
          break;
        case 'DAMAGED':
          entry.damageStock = qty;
          runningBalance -= qty;
          break;
        case 'ADJUSTMENT':
          if (entry.quantity > 0) {
            entry.stockAdded = qty;
            runningBalance += qty;
          } else {
            entry.usedStock = qty;
            runningBalance -= qty;
          }
          break;
      }
      
      // Ensure balance never goes negative
      entry.balance = Math.max(0, runningBalance);
      runningBalance = entry.balance; // Use the non-negative balance for next iteration
    }

    // Save (pre-save hook will recalculate totals)
    await monthlyDoc.save();

    console.log('Entry updated and balances recalculated');

    // Update product stock
    try {
      await updateProductStock(productId, theaterId, {
        currentStock: monthlyDoc.closingBalance
      });
    } catch (prodError) {
      console.error('Failed to update product stock:', prodError.message);
    }

    res.json({
      success: true,
      message: 'Stock entry updated successfully',
      data: {
        entry: monthlyDoc.stockDetails[entryIndex],
        currentStock: monthlyDoc.closingBalance
      }
    });

  } catch (error) {
    console.error('PUT Stock Entry Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stock entry',
      error: error.message
    });
  }
});

// DELETE /:theaterId/:productId/:entryId - Delete stock entry
router.delete('/:theaterId/:productId/:entryId', authenticateToken, requireTheaterAccess, async (req, res) => {
  try {
    const { theaterId, productId, entryId } = req.params;
    const { year, month } = req.query;

    console.log('DELETE Stock Entry:', { theaterId, productId, entryId, year, month });

    const targetYear = parseInt(year);
    const targetMonth = parseInt(month);

    // Find the monthly document
    const monthlyDoc = await MonthlyStock.findOne({
      theaterId,
      productId,
      year: targetYear,
      monthNumber: targetMonth
    });

    if (!monthlyDoc) {
      return res.status(404).json({
        success: false,
        message: 'Monthly document not found'
      });
    }

    // Find and remove the entry
    const entryIndex = monthlyDoc.stockDetails.findIndex(e => e._id.toString() === entryId);
    
    if (entryIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Stock entry not found'
      });
    }

    // Remove the entry
    monthlyDoc.stockDetails.splice(entryIndex, 1);

    // Recalculate all balances
    let runningBalance = monthlyDoc.carryForward;
    
    for (let i = 0; i < monthlyDoc.stockDetails.length; i++) {
      const entry = monthlyDoc.stockDetails[i];
      const qty = Math.abs(entry.quantity);
      
      switch (entry.type) {
        case 'ADDED':
        case 'RETURNED':
          runningBalance += qty;
          break;
        case 'SOLD':
        case 'EXPIRED':
        case 'DAMAGED':
          runningBalance -= qty;
          break;
        case 'ADJUSTMENT':
          runningBalance += entry.quantity; // Can be positive or negative
          break;
      }
      
      entry.balance = runningBalance;
    }

    // Save
    await monthlyDoc.save();

    console.log('Entry deleted and balances recalculated');

    // Update product stock
    try {
      await updateProductStock(productId, theaterId, {
        currentStock: monthlyDoc.closingBalance
      });
    } catch (prodError) {
      console.error('Failed to update product stock:', prodError.message);
    }

    res.json({
      success: true,
      message: 'Stock entry deleted successfully',
      data: {
        currentStock: monthlyDoc.closingBalance
      }
    });

  } catch (error) {
    console.error('DELETE Stock Entry Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete stock entry',
      error: error.message
    });
  }
});

module.exports = router;
