# Add Quantity Field to ProductList Database

## Implementation Date
October 17, 2025

## Change Overview
Added a new `quantity` field to the productList database that stores the raw quantity value from the Add Product form, separate from `inventory.currentStock`.

## Purpose
- Store the original quantity value as entered in the form
- Preserve data type (string with units like "22ML" or number like 750)
- Keep separate from `inventory.currentStock` which is used for stock management

## Database Structure

### Before:
```json
{
  "_id": "68f1246d95b17dc32bf21640",
  "name": "Cool Drinks",
  "sku": "CL-001",
  "inventory": {
    "currentStock": 600
  }
}
```

### After:
```json
{
  "_id": "68f1246d95b17dc32bf21640",
  "name": "Cool Drinks",
  "sku": "CL-001",
  "quantity": "750",  // ← NEW FIELD (raw value from form)
  "inventory": {
    "currentStock": 600  // ← Existing field (parsed for stock management)
  }
}
```

## Code Changes

### File: `frontend/src/pages/theater/AddProduct.js`

**Location:** Line ~910 in `handleSubmit` function

**Added:**
```javascript
const productData = {
  name: formData.name,
  description: formData.description || '',
  categoryId: selectedCategory.id,
  productTypeId: selectedProduct ? selectedProduct.id : null,
  sku: formData.productCode || '',
  quantity: formData.quantity || '',  // ← NEW: Direct quantity field
  pricing: { ... },
  inventory: {
    currentStock: formData.quantity ? parseInt(formData.quantity) : 0  // ← Existing
  },
  ...
};
```

## Data Flow

### 1. ProductType Database (Source):
```json
{
  "productName": "Cool Drinks",
  "productCode": "CL-001",
  "quantity": "750"  // or "22ML"
}
```

### 2. Add Product Form (Transfer):
```javascript
// When product name selected:
formData.quantity = selectedProduct.quantity  // "750" or "22ML"
```

### 3. ProductList Database (Destination):
```json
{
  "name": "Cool Drinks",
  "quantity": "750",  // ← Stored as-is (NEW)
  "inventory": {
    "currentStock": 750  // ← Parsed to number (EXISTING)
  }
}
```

## Field Comparison

| Field | Location | Data Type | Purpose |
|-------|----------|-----------|---------|
| `quantity` | Root level | String/Number | Original value from form, preserves units |
| `inventory.currentStock` | inventory object | Number | Parsed value for stock management |

## Benefits

1. **Data Preservation**: Original quantity value (with units if any) is preserved
2. **Backward Compatible**: Existing `inventory.currentStock` still works
3. **Flexibility**: Can handle both "750" and "22ML" type values
4. **Traceability**: Can see what was originally entered in the form

## Example Scenarios

### Scenario 1: Numeric Quantity
```javascript
// Form Input
formData.quantity = "750"

// Saved to Database
{
  "quantity": "750",           // ← Original value
  "inventory": {
    "currentStock": 750        // ← Parsed number
  }
}
```

### Scenario 2: Quantity with Unit
```javascript
// Form Input
formData.quantity = "22ML"

// Saved to Database
{
  "quantity": "22ML",          // ← Original value with unit
  "inventory": {
    "currentStock": 22         // ← Parsed number (unit stripped)
  }
}
```

### Scenario 3: Empty Quantity
```javascript
// Form Input
formData.quantity = ""

// Saved to Database
{
  "quantity": "",              // ← Empty string
  "inventory": {
    "currentStock": 0          // ← Default to 0
  }
}
```

## Backend Requirement

The backend schema needs to be updated to include the `quantity` field. Add this to the product schema:

```javascript
// In backend/models/TheaterProducts.js or similar
{
  name: { type: String, required: true },
  quantity: { type: Schema.Types.Mixed },  // ← ADD THIS (accepts string or number)
  sku: { type: String },
  inventory: {
    currentStock: { type: Number, default: 0 }
  }
}
```

## API Payload

### POST /api/theater-products/:theaterId

**Request Body:**
```json
{
  "name": "Cool Drinks",
  "quantity": "750",
  "sku": "CL-001",
  "categoryId": "68ee71355bb5ec142c7da9b0",
  "productTypeId": "68f11f66a86046e7108e2b5f",
  "pricing": {
    "basePrice": 150
  },
  "inventory": {
    "currentStock": 750,
    "minStock": 5,
    "maxStock": 1000
  },
  "images": ["https://..."]
}
```

## Testing

### Test Case 1: Add Product with Numeric Quantity
1. Open Add Product page
2. Select product name "Cool Drinks" (quantity: 750)
3. Submit form
4. Check database: `quantity` field should be "750"
5. Check database: `inventory.currentStock` should be 750

### Test Case 2: Add Product with Unit Quantity
1. Open Add Product page
2. Select product name with unit (quantity: "22ML")
3. Submit form
4. Check database: `quantity` field should be "22ML"
5. Check database: `inventory.currentStock` should be 22

### Test Case 3: Add Product without Quantity
1. Open Add Product page
2. Leave quantity empty
3. Submit form
4. Check database: `quantity` field should be ""
5. Check database: `inventory.currentStock` should be 0

## Display in Product Management Page

To show the quantity field in the Product Management table:

```javascript
// In TheaterProductList.js
<td>
  <div className="quantity-display">
    <span className="quantity-value">
      {product.quantity || product.inventory?.currentStock || 0}
    </span>
  </div>
</td>
```

**Priority:**
1. First check `product.quantity` (new field)
2. Fallback to `product.inventory.currentStock`
3. Default to 0

## Console Logging

Updated console log to show both values:

```javascript
console.log('🔗 Sending Product Data:', {
  name: productData.name,
  quantity: productData.quantity,  // ← Raw value
  currentStock: productData.inventory.currentStock  // ← Parsed value
});
```

## Migration Note

**For existing products in database:**
- They won't have the `quantity` field
- The code will fallback to `inventory.currentStock`
- No data loss or breaking changes
- Can run a migration script to populate `quantity` from `currentStock` if needed

## Related Files
- `frontend/src/pages/theater/AddProduct.js` - Updated to include quantity field
- `backend/models/TheaterProducts.js` - Needs schema update
- `frontend/src/pages/theater/TheaterProductList.js` - Should display quantity field

## Status
✅ Frontend code updated  
⏳ Backend schema update needed  
⏳ Testing required  
⏳ Product List display update recommended  

## Next Steps
1. Update backend schema to accept `quantity` field
2. Test with new product creation
3. Update Product Management page to display quantity
4. Optional: Create migration script for existing products
