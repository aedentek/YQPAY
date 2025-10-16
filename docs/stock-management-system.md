# Stock Management System - Complete Documentation

## 📊 Statistics Display Order

The statistics container now displays in the following order:

### 1. **Carry Forward**
- **Display:** Opening balance from previous month
- **Source:** `summary.openingBalance`
- **Label:** "From Previous Month"
- **Purpose:** Shows what stock was carried over

### 2. **Total Added (Current Month)**
- **Display:** All stock added in current month
- **Source:** `summary.totalStock` (mapped from backend's `totalAdded`)
- **Label:** "Current Month"
- **Purpose:** Shows new stock received this month

### 3. **Total Sales (Current Month)**
- **Display:** All stock sold in current month
- **Source:** `summary.totalSales` (mapped from backend's `totalSold`)
- **Label:** "Current Month"
- **Purpose:** Shows stock sold/used this month

### 4. **Total Expired (Current Month)**
- **Display:** All stock expired in current month
- **Source:** `summary.totalExpired`
- **Label:** "Current Month"
- **Purpose:** Shows stock that expired (includes carry forward stock that expired this month)

### 5. **Total Damaged (Current Month)**
- **Display:** All damaged stock in current month
- **Source:** `summary.totalDamage` (mapped from backend's `totalDamaged`)
- **Label:** "Current Month"
- **Purpose:** Shows stock damaged this month

### 6. **Total Balance (Current Month)**
- **Display:** Closing balance at month end
- **Source:** `summary.closingBalance`
- **Label:** "Current Month End"
- **Purpose:** Shows final stock at end of month

### 7. **Overall Balance** ⭐ (New - Special Card)
- **Display:** Calculated value with purple gradient background
- **Formula:** `Carry Forward + Total Added - Total Sales - Total Expired - Total Damaged`
- **Calculation Example:** `120 + 450 - 0 - 0 - 0 = 570`
- **Label:** Shows the complete formula
- **Purpose:** Visual verification that closing balance matches the calculation

---

## 🔄 Carry Forward Logic

### How Carry Forward Works:

1. **Month Creation:**
   - When viewing a month, system checks previous month's closing balance
   - This becomes the current month's opening balance (Carry Forward)

2. **Dynamic Updates:**
   - If previous month's data changes, carry forward automatically updates
   - System recalculates all balances when carry forward changes

3. **Carry Forward Loop:**
   ```
   September Closing Balance (120) 
   → October Opening Balance (120) 
   → October Closing Balance (570)
   → November Opening Balance (570)
   → ... continues
   ```

### Example Flow:
```
September 2025:
  Opening: 0
  Added: 120
  Sales: 0
  Expired: 0
  Damaged: 0
  Closing: 120  ← This carries forward

October 2025:
  Opening: 120  ← Carried from September
  Added: 450
  Sales: 0
  Expired: 0
  Damaged: 0
  Closing: 570  ← This carries forward

November 2025:
  Opening: 570  ← Carried from October
  ...
```

---

## ⏰ Auto-Expiry System

### Expiry Rules:

**When Items Expire:**
- Items expire at **00:01 AM the day AFTER the expiry date**
- Example: Expiry Date = 16 Oct 2025 → Expires at 17 Oct 2025 00:01 AM

### Cross-Month Expiry Handling:

**Scenario:** Stock added in September with expiry in October

```javascript
September Entry:
  Entry Date: 10/09/2025
  Stock Added: 120
  Expiry Date: 17/10/2025
  
// On 10 Sept - 16 Oct: Entry shows in September as valid stock
September:
  Carry Forward: 0
  Total Added: 120
  Total Expired: 0  ← Not expired yet
  Closing Balance: 120

// On 17 Oct 00:01 AM: Auto-expiry triggers
September:
  Carry Forward: 0
  Total Added: 120
  Total Expired: 120  ← Auto-updated!
  Closing Balance: 0  ← Recalculated!

October:
  Carry Forward: 0  ← Updated from September's new closing
  Total Added: 450
  Total Expired: 0
  Closing Balance: 450
```

### Auto-Expiry Triggers:

1. **When viewing stock data** - System checks ALL months for expired items
2. **When adding entries** - Pre-check before saving
3. **Cross-month detection** - Scans entire product history, not just current month

### Key Features:

✅ **Automatic Detection:** No manual marking needed
✅ **Cross-Month Support:** Detects expiry regardless of which month you're viewing
✅ **Balance Recalculation:** All month balances update automatically
✅ **Carry Forward Update:** Next month's opening balance adjusts automatically
✅ **Product Stock Sync:** Product's currentStock updates to latest closing balance

---

## 📐 Calculation Formula

### Overall Balance Formula:
```
Overall Balance = Carry Forward + Total Added - Total Sales - Total Expired - Total Damaged
```

### Components:

- **Carry Forward:** Previous month's closing balance
- **Total Added:** New stock received this month
- **Total Sales:** Stock sold/used this month
- **Total Expired:** Stock expired this month (includes carry forward items)
- **Total Damaged:** Stock damaged this month

### Verification:
The Overall Balance card should **always match** the Total Balance (Closing Balance).

If they don't match, there's a calculation error.

---

## 🎯 Important Notes

### 1. Carry Forward Only:
- Only the **closing balance** carries forward to next month
- Individual transactions (Added, Sales, Expired, Damaged) start fresh each month
- This prevents double-counting and maintains accuracy

### 2. Expiry Month Recording:
- The system **records which month the expiry occurred**
- Expired stock appears in the month it actually expires, not the entry month
- This ensures accurate monthly reports

### 3. Total Integrity:
- Without proper expiry month tracking, totals collapse
- Example of wrong calculation:
  ```
  ❌ WRONG: September shows 120 expired, October also shows 120 expired
  ✅ CORRECT: September shows 120 expired, October shows 0 expired
  ```

### 4. Database Structure:
Each monthly document tracks:
- `carryForward` - Opening balance
- `totalStockAdded` - Sum of all added entries
- `totalUsedStock` - Sum of all sales
- `totalExpiredStock` - Sum of all expired (updated by auto-expiry)
- `totalDamageStock` - Sum of all damaged
- `closingBalance` - Final calculated balance

---

## 🔍 Example Walkthrough

### Scenario: Product Stock Over 3 Months

**September 2025:**
```
Carry Forward: 0
Total Added: 120 (Entry on 10 Sept, expires 17 Oct)
Total Sales: 0
Total Expired: 0 (not expired yet)
Total Damaged: 0
Total Balance: 120
Overall Balance: 0 + 120 - 0 - 0 - 0 = 120 ✅
```

**October 2025 (Before 17 Oct 00:01):**
```
Carry Forward: 120 (from September)
Total Added: 450
Total Sales: 0
Total Expired: 0
Total Damaged: 0
Total Balance: 570
Overall Balance: 120 + 450 - 0 - 0 - 0 = 570 ✅
```

**October 2025 (After 17 Oct 00:01 - Auto-expiry runs):**

*September gets updated:*
```
Carry Forward: 0
Total Added: 120
Total Sales: 0
Total Expired: 120 ← Auto-updated!
Total Damaged: 0
Total Balance: 0 ← Recalculated!
Overall Balance: 0 + 120 - 0 - 120 - 0 = 0 ✅
```

*October gets updated:*
```
Carry Forward: 0 ← Updated from September's new closing
Total Added: 450
Total Sales: 0
Total Expired: 0
Total Damaged: 0
Total Balance: 450 ← Recalculated!
Overall Balance: 0 + 450 - 0 - 0 - 0 = 450 ✅
```

**November 2025:**
```
Carry Forward: 450 (from October)
Total Added: 200
Total Sales: 100
Total Expired: 0
Total Damaged: 10
Total Balance: 540
Overall Balance: 450 + 200 - 100 - 0 - 10 = 540 ✅
```

---

## 🎨 Visual Design

### Overall Balance Card:
- **Background:** Purple gradient (distinguishes it from other cards)
- **Text Color:** White (high contrast on purple background)
- **Formula Display:** Shows complete calculation below the number
- **Purpose:** Quick verification that calculations are correct

### Standard Cards:
- **Background:** White
- **Text Color:** Dark gray
- **Sublabel:** Light gray with contextual information

---

## ✅ System Benefits

1. **Transparency:** Users see exactly how stock is calculated
2. **Accuracy:** Auto-expiry ensures no manual tracking errors
3. **Audit Trail:** Every month's transactions are preserved
4. **Loop Protection:** Only closing balance carries forward, preventing double-counting
5. **Cross-Month Intelligence:** System handles complex expiry scenarios automatically
6. **Real-time Updates:** Changes propagate through all affected months instantly

---

## 🚀 Future Enhancements (Optional)

1. **Expiry Alerts:** Warning notifications before items expire
2. **Batch Management:** Track stock by batch numbers with individual expiry dates
3. **Low Stock Alerts:** Notify when balance falls below threshold
4. **Predictive Analytics:** Forecast stock needs based on historical patterns
5. **Multi-location Transfer:** Track stock movement between theaters

---

*Last Updated: October 16, 2025*
*Version: 2.0*
