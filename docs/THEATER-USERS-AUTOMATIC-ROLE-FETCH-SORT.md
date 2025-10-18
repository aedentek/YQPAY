# Theater User Details - Automatic Role Fetching & Ascending ID Sort

## Issue
Sidebar roles need to be:
1. ✅ Automatically fetched from roles database based on theater ID
2. ✅ Arranged in **ascending order by ID**

## User Request
> "in the side bar values want to get automarticaly from the roles db based on the theater id and it want to arrange as ascending order wise based on the id only fix that"

## Current Implementation Analysis

### 1. ✅ Automatic Role Fetching (Already Working)

The system **already fetches roles automatically** from the roles database based on theater ID:

```javascript
// API endpoint with theater ID parameter
const apiUrl = `${config.api.baseUrl}/roles?theaterId=${theaterId}&isActive=true`;

const response = await fetch(apiUrl, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    'Cache-Control': 'no-cache'
  }
});
```

**Flow:**
1. Component mounts with `theaterId` from URL params
2. `useEffect` triggers `fetchAvailableRoles()`
3. API call: `GET /api/roles?theaterId={id}&isActive=true`
4. Backend returns only roles for that specific theater
5. Roles are filtered (only active roles)
6. Roles are stored in state

### 2. ✅ Ascending ID Order (Now Fixed)

Added sorting by `_id` in **ascending order** at **3 critical points**:

## Fixes Applied

### Fix 1: Sort `activeRoles` (for dropdown in Create/Edit forms)

**Location:** When mapping roles from API response

**Before (No Sorting):**
```javascript
const activeRoles = rolesArray
  .filter(role => { /* validation */ })
  .map(role => ({ /* mapping */ }));
```

**After (Sorted Ascending):**
```javascript
const activeRoles = rolesArray
  .filter(role => {
    // ✅ Enhanced filtering with detailed logging
    if (!role || !role._id || !role.name) return false;
    if (!role.isActive) return false;
    return true;
  })
  .sort((a, b) => {
    // ✅ Sort by _id in ascending order (MongoDB ObjectId comparison)
    return a._id.localeCompare(b._id);
  })
  .map(role => ({
    _id: role._id,
    roleName: role.name,
    name: role.name,
    isActive: role.isActive,
    isDefault: role.isDefault || false
  }));
```

### Fix 2: Sort `tabRoles` (for sidebar tabs)

**Location:** When creating sidebar tab data

**Before (Already Had Sorting - Verified):**
```javascript
const tabRolesData = activeRoles
  .filter(role => { /* validation */ })
  .sort((a, b) => {
    // ✅ Sort by _id in ascending order
    return a._id.localeCompare(b._id);
  })
  .map(role => ({ /* mapping */ }));
```

**Status:** ✅ Already implemented correctly

### Fix 3: Sort Cached Roles

**Location:** When loading from cache

**Before (No Sorting):**
```javascript
const validCachedRoles = cachedRoles.filter(role => role && role._id && role.name);
```

**After (Sorted Ascending):**
```javascript
const validCachedRoles = cachedRoles
  .filter(role => role && role._id && role.name)
  .sort((a, b) => a._id.localeCompare(b._id)); // ✅ Sort by _id in ascending order
```

## Complete Data Flow

### Step 1: Fetch from API (Theater-Specific)
```
Component Mount → useEffect triggers
↓
fetchAvailableRoles() called with theaterId
↓
API Request: GET /api/roles?theaterId=67234abc&isActive=true
↓
Backend filters roles by theater ID
↓
Returns JSON: { success: true, data: { roles: [...] } }
```

### Step 2: Process & Sort Roles
```
Receive roles array from API
↓
Filter: Remove inactive, null, invalid roles
↓
Sort: a._id.localeCompare(b._id) ← ASCENDING ORDER
↓
Map: Create consistent role structure
↓
Store in availableRoles state (for dropdowns)
```

### Step 3: Create Sidebar Tabs
```
Take activeRoles array
↓
Filter: Additional validation
↓
Sort: a._id.localeCompare(b._id) ← ASCENDING ORDER (again for safety)
↓
Map: Create tab objects { id, name, icon }
↓
Store in tabRoles state (for sidebar)
```

### Step 4: Cache for Fast Loading
```
Store sorted roles in sessionStorage
↓
Key: `theater-roles-cache-${theaterId}`
↓
Next load: Check cache first
↓
If cached: Filter + Sort + Use immediately
↓
If not cached: Fetch from API
```

## MongoDB ObjectId Ascending Sort

MongoDB ObjectIds are **sortable strings** that contain timestamp information:

```
ObjectId: "507f1f77bcf86cd799439011"
         └─ Timestamp (4 bytes)
         └─ Machine ID (3 bytes)  
         └─ Process ID (2 bytes)
         └─ Counter (3 bytes)
```

**Using `localeCompare()`:**
```javascript
a._id.localeCompare(b._id)
```

**Result:**
- Older roles appear first (earlier creation time)
- Newer roles appear last (later creation time)
- Consistent alphabetical order by ID string
- **Ascending order** guaranteed

## Example Sorting Result

### Before (Random Order):
```
Sidebar:
- Theater Manager (ID: 6723def...)
- Theater Admin (ID: 6723abc...)
- Theater Staff (ID: 6723cde...)
```

### After (Ascending ID Order):
```
Sidebar:
- Theater Admin (ID: 6723abc...) ← Earliest ID
- Theater Staff (ID: 6723cde...)
- Theater Manager (ID: 6723def...) ← Latest ID
```

## Testing Scenarios

### Test 1: Fresh Load
1. Navigate to `/theater-users/:theaterId`
2. Component fetches roles from API
3. API filters by theater ID
4. Roles displayed in ascending ID order
5. ✅ **Expected:** Sidebar shows roles sorted by ID

### Test 2: Cached Load
1. Visit page (roles cached)
2. Refresh page
3. Roles loaded from cache
4. Cache data is sorted
5. ✅ **Expected:** Same order as fresh load

### Test 3: Multiple Theaters
1. Visit Theater A (ID: 123)
2. Note role order
3. Visit Theater B (ID: 456)
4. Note role order (different roles)
5. Go back to Theater A
6. ✅ **Expected:** Each theater shows its own roles in ascending order

### Test 4: Role Dropdowns
1. Click "Create User"
2. Open Role dropdown
3. ✅ **Expected:** Roles listed in ascending ID order

### Test 5: Edit User
1. Click edit on user
2. Open Role dropdown
3. ✅ **Expected:** Roles listed in ascending ID order

## Benefits

### 1. Automatic Theater-Specific Roles ✅
- No manual configuration needed
- Each theater shows only its roles
- Backend handles filtering
- No cross-theater role pollution

### 2. Consistent Ordering ✅
- Same order every time
- Predictable UI
- Easy to find specific roles
- Professional appearance

### 3. Performance ✅
- Roles cached per theater
- Cache expires after 5 minutes
- Fast subsequent loads
- Sorted data in cache

### 4. Data Integrity ✅
- Only active roles shown
- Invalid roles filtered out
- Theater-specific isolation
- MongoDB ObjectId standard

## API Endpoint Used

```
GET /api/roles
Query Parameters:
  - theaterId: string (MongoDB ObjectId)
  - isActive: boolean (true)

Response:
{
  "success": true,
  "data": {
    "roles": [
      {
        "_id": "6723abc123...",
        "name": "Theater Admin",
        "isActive": true,
        "isDefault": false,
        "permissions": [...],
        "theaterId": "67234567..."
      },
      // ... more roles
    ]
  }
}
```

## State Management

### States Used:
```javascript
const [availableRoles, setAvailableRoles] = useState([]);  // For dropdowns
const [tabRoles, setTabRoles] = useState([]);              // For sidebar
const [rolesLoading, setRolesLoading] = useState(false);   // Loading state
const [selectedRole, setSelectedRole] = useState(null);    // Active tab
```

### Cache Key:
```javascript
const cacheKey = `theater-roles-cache-${theaterId}`;
```

Each theater has its own cache!

## Code Changes Summary

### File: `frontend/src/pages/TheaterUserDetails.js`

**Changes Made:**

1. **Line ~210-240:** Added `.sort()` to `activeRoles`
   - Sorts by `_id` ascending
   - Applied before mapping
   - Affects dropdown menus

2. **Line ~265-290:** Verified `.sort()` in `tabRoles`
   - Already had sorting
   - Confirmed working correctly
   - Affects sidebar tabs

3. **Line ~155-165:** Added `.sort()` to cached roles
   - Sorts cache data
   - Ensures consistent order from cache
   - Same order as fresh fetch

## Verification Steps

### Console Logs to Check:
```javascript
console.log('✅ Active theater-specific roles loaded:', activeRoles);
// Should show roles in ascending ID order

console.log('🎭 Setting tab roles:', tabRolesData);
// Should show tabs in ascending ID order

console.log('🔍 Individual tabs:', tabRolesData.map((r, i) => `${i+1}. ${r.name}`));
// Should list roles in order
```

### Browser DevTools Check:
1. Open console
2. Look for: `"✅ Active theater-specific roles loaded"`
3. Expand the array
4. Verify `_id` values are in ascending order

## Sorting Algorithm

### Method: `String.prototype.localeCompare()`

```javascript
a._id.localeCompare(b._id)
```

**Returns:**
- `-1` if `a._id < b._id` (a comes first)
- `0` if `a._id === b._id` (equal)
- `1` if `a._id > b._id` (b comes first)

**Perfect for:**
- MongoDB ObjectId strings
- Alphanumeric sorting
- Consistent results
- Cross-browser compatible

## Related Files

1. **Frontend Component:**
   - `frontend/src/pages/TheaterUserDetails.js` ← Modified

2. **Backend API:**
   - `backend/routes/roles.js` (filters by theaterId)
   - `backend/models/Role.js` (role schema)

3. **Styles:**
   - `frontend/src/styles/TheaterUserDetails.css` (sidebar tabs)

## Completion Date
October 19, 2025

## Status
✅ **COMPLETED** 
- Roles automatically fetched from database based on theater ID
- All roles sorted in **ascending order by ID**
- Applied to sidebar tabs, dropdowns, and cache

## Additional Notes

### Why Sort in Multiple Places?
- **activeRoles:** Ensures dropdowns are sorted
- **tabRoles:** Ensures sidebar is sorted
- **cachedRoles:** Ensures cache loads sorted

### Why Use localeCompare()?
- Standard JavaScript string comparison
- Works with MongoDB ObjectId format
- Consistent across browsers
- Better than manual substring comparison

### Cache Expiration
Cache expires after **5 minutes** to ensure fresh data while maintaining performance.

### Theater Isolation
Each theater has its own:
- Role set (filtered by backend)
- Cache key (includes theater ID)
- Sidebar display
- No cross-contamination

## Testing Checklist

- ✅ Roles load automatically on page load
- ✅ Roles are theater-specific (filtered by ID)
- ✅ Sidebar shows roles in ascending ID order
- ✅ Create user dropdown shows sorted roles
- ✅ Edit user dropdown shows sorted roles
- ✅ Cache maintains sorted order
- ✅ Switching theaters loads different roles
- ✅ Refreshing page maintains order
- ✅ Only active roles are shown
- ✅ Invalid roles are filtered out
