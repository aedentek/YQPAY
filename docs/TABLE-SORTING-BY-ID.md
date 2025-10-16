# Table Sorting by ID (Ascending Order)

## Overview
Changed the Stock Management table sorting from **date descending (newest first)** to **ID ascending (oldest first)** order.

## Change Made

### File: `frontend/src/pages/theater/StockManagement.js`

**Previous Sorting (Line 1053-1054):**
```javascript
// Sort entries by date descending (newest first) for better UX
const sortedEntries = entries && Array.isArray(entries)
  ? [...entries].sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate))
  : [];
```

**New Sorting (Line 1053-1059):**
```javascript
// Sort entries by ID ascending (oldest first, based on MongoDB _id)
const sortedEntries = entries && Array.isArray(entries)
  ? [...entries].sort((a, b) => {
      // MongoDB _id is a string, so we compare them as strings
      const idA = a._id || '';
      const idB = b._id || '';
      return idA.localeCompare(idB);
    })
  : [];
```

## How It Works

### MongoDB _id Structure
MongoDB ObjectID has a timestamp embedded in the first 4 bytes, which means:
- Older documents have "smaller" `_id` values
- Newer documents have "larger" `_id` values
- Sorting by `_id` ascending = chronological order (oldest → newest)

### String Comparison
- Uses `localeCompare()` for proper string sorting
- Handles missing `_id` gracefully with empty string fallback
- Returns consistent ordering across all browsers

## Result

### Before:
```
Serial | Date       | Entry
----------------------------
1      | Oct 15     | (Newest)
2      | Oct 10     |
3      | Oct 5      |
4      | Oct 1      | (Oldest)
```

### After:
```
Serial | Date       | Entry
----------------------------
1      | Oct 1      | (Oldest/First)
2      | Oct 5      |
3      | Oct 10     |
4      | Oct 15     | (Newest/Last)
```

## Benefits

1. **Chronological Order**: Entries appear in the order they were created
2. **Logical Flow**: Shows the progression of stock changes from start to finish
3. **ID-Based**: Uses database primary key for reliable sorting
4. **Consistent**: Same order every time, regardless of date formatting issues
5. **Predictable**: Serial numbers (1, 2, 3...) match creation order

## Testing

To verify the change works correctly:

1. Open Stock Management page
2. Select a product with multiple stock entries
3. Check that the table shows entries in chronological order (oldest first)
4. Serial numbers should match the order of creation (1 = first entry, 2 = second, etc.)

## Related Files
- `frontend/src/pages/theater/StockManagement.js` - Main implementation (Line 1053-1059)

## Notes
- The sorting happens in the frontend after receiving data from the API
- This does not change the database query or backend sorting
- Pagination still works as expected
- The change only affects the display order, not the data structure
