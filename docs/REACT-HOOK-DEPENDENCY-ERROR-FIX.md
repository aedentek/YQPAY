# React Hook Dependency Error Fix

## Error
```
ReferenceError: Cannot access 'fetchProductStockBalances' before initialization
```

## Root Cause

**Circular Dependency in useCallback Hooks:**

The error occurred because of the order of function definitions and dependencies:

1. `fetchProducts` was defined first with `fetchProductStockBalances` in its dependency array
2. `fetchProducts` **called** `fetchProductStockBalances` inside its body
3. `fetchProductStockBalances` was **defined after** `fetchProducts`
4. When React tried to initialize `fetchProducts`, it needed `fetchProductStockBalances`
5. But `fetchProductStockBalances` hadn't been initialized yet → **ReferenceError**

### Code Before (WRONG):
```javascript
// fetchProducts defined first
const fetchProducts = useCallback(async (...) => {
  // ...
  setProducts(products);
  fetchProductStockBalances(products); // ← Calling function that doesn't exist yet!
  // ...
}, [..., fetchProductStockBalances]); // ← Dependency on function not yet defined

// fetchProductStockBalances defined AFTER
const fetchProductStockBalances = useCallback(async (...) => {
  // ...
}, [theaterId, authHeaders]);
```

## Solution

**Separate the concerns using useEffect:**

Instead of calling `fetchProductStockBalances` directly inside `fetchProducts`, we:
1. Removed the call from `fetchProducts`
2. Removed `fetchProductStockBalances` from `fetchProducts` dependencies
3. Created a separate `useEffect` that watches the `products` state
4. When `products` changes, the `useEffect` calls `fetchProductStockBalances`

### Code After (CORRECT):

#### 1. Removed call from fetchProducts:
```javascript
const fetchProducts = useCallback(async (...) => {
  // ...
  setProducts(products);
  // ← Removed: fetchProductStockBalances(products);
  // ...
}, [theaterId, itemsPerPage, sortBy, sortOrder, authHeaders, modal]); 
// ← Removed: fetchProductStockBalances from dependencies
```

#### 2. Added separate useEffect:
```javascript
// Fetch stock balances whenever products change
useEffect(() => {
  if (products.length > 0 && theaterId && isMountedRef.current) {
    console.log('📊 Products loaded, fetching stock balances...');
    fetchProductStockBalances(products);
  }
}, [products, theaterId, fetchProductStockBalances]);
```

## Why This Works

### React Hook Lifecycle:
1. **Component Renders** → All `useCallback` hooks are initialized in order
2. **fetchProducts** defined → Can be used
3. **fetchProductStockBalances** defined → Can be used
4. **useEffect runs** → After all functions are defined
5. When `products` state changes → useEffect triggers → `fetchProductStockBalances` called

### Benefits:
✅ **No circular dependency** - Functions don't depend on each other  
✅ **Clean separation** - Each function has one responsibility  
✅ **Reactive** - Stock balances auto-fetch when products change  
✅ **No race conditions** - useEffect ensures proper order  

## Key Learnings

### React useCallback Rules:
1. **Dependencies must be defined before use**
2. **Don't include functions in deps if they're called inside**
3. **Use useEffect for side effects that depend on state changes**

### When to use useEffect vs direct call:
- **Direct call**: When function is guaranteed to exist (defined before)
- **useEffect**: When function should run in response to state changes

### Dependency Arrays:
```javascript
// ❌ WRONG: Function in deps + called inside = circular dependency
const funcA = useCallback(() => {
  funcB(); // Calling
}, [funcB]); // Depending on

const funcB = useCallback(() => {
  // ...
}, []);

// ✅ CORRECT: Separate with useEffect
const funcA = useCallback(() => {
  // Don't call funcB
}, []); // Don't depend on funcB

const funcB = useCallback(() => {
  // ...
}, []);

useEffect(() => {
  funcB(); // Call when state changes
}, [someState, funcB]);
```

## Testing
After the fix:
1. ✅ No initialization errors
2. ✅ Products load correctly
3. ✅ Stock balances fetch after products load
4. ✅ No console errors

## Related Files
- `frontend/src/pages/theater/TheaterProductList.js` - Fixed implementation
- `docs/PRODUCT-STOCK-OVERALL-BALANCE.md` - Updated documentation

## Timeline
- **Error Occurred**: When fetchProductStockBalances was added to fetchProducts
- **Root Cause Identified**: Circular dependency in useCallback hooks
- **Fix Applied**: Separated concerns using useEffect
- **Status**: ✅ Resolved
