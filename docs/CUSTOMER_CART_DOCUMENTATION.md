# Customer Cart Page - Premium Classic Luxury Design

## Overview
A fully-featured shopping cart page with premium classic luxury aesthetics matching the customer home page design system.

## Features

### 1. **Premium Visual Design**
- Deep purple gradient background (#1a0a2e → #2d1b4e → #4a2c6d)
- Classic gold accents (#d4af37) throughout
- Elegant texture overlay and shimmer animations
- Glass-morphism effects with gold tints
- Serif typography (Cinzel, Playfair Display, Georgia)

### 2. **Cart Header**
- Back button to return to menu
- Elegant "Your Cart" title with gold gradient text
- Clear cart button with icon
- Premium glass effect background with gold borders

### 3. **Theater & QR Information**
- Displays theater name with 🎭 icon
- Shows QR code name with 📱 icon
- Displays seat number with 💺 icon
- Gold-tinted glass cards with elegant borders

### 4. **Cart Items Display**
- Product image (90x90px with gold border)
- Product name and price
- Quantity controls with +/- buttons
- Item total price calculation
- Hover effects with elevation
- Smooth animations

### 5. **Empty Cart State**
- Large cart icon (🛒)
- Friendly message
- "Browse Menu" button to continue shopping
- Centered elegant layout

### 6. **Cart Summary**
- Subtotal calculation
- Tax calculation (5%)
- Total amount with gold styling
- Premium dividers with gradient
- Elegant typography

### 7. **Checkout Button**
- Full-width gold gradient button
- "Proceed to Checkout" with arrow icon
- Hover animations and shadows
- Classic serif font styling

### 8. **Quantity Controls**
- Minus button (gray gradient)
- Quantity display
- Plus button (gold gradient)
- Smooth scale animations on hover

## Technical Implementation

### File Structure
```
frontend/
├── src/
│   ├── pages/
│   │   └── customer/
│   │       └── CustomerCart.js          # Main cart component
│   └── styles/
│       └── customer/
│           └── CustomerCart.css         # Premium styling
```

### Routes
- **Path**: `/customer/cart`
- **Query Parameters**:
  - `theaterid` - Theater ID
  - `theatername` - Theater name
  - `qrname` - QR code name
  - `seat` - Seat number

### State Management
Uses `CartContext` for:
- `items` - Array of cart items
- `addItem()` - Add/increment item quantity
- `removeItem()` - Remove/decrement item quantity
- `updateQuantity()` - Set specific quantity
- `getTotalItems()` - Get total item count
- `clearCart()` - Remove all items

### Navigation Flow
1. **From Home**: Click "View Cart" button → navigates with all query params
2. **Back to Menu**: Click back button → returns to `/customer/home`
3. **To Checkout**: Click "Proceed to Checkout" → navigates to `/customer/checkout`

## Responsive Design
- Mobile-optimized layouts (max-width: 480px)
- Adjusted font sizes and spacing
- Touch-friendly button sizes (44x44px minimum)
- Flexible card layouts

## Key Components

### Cart Item Card
```jsx
<div className="cart-item">
  <div className="cart-item-image-container">
    <img src={item.image} alt={item.name} />
  </div>
  <div className="cart-item-details">
    <h3>{item.name}</h3>
    <p>₹{item.price}</p>
  </div>
  <div className="cart-item-actions">
    <div className="quantity-controls">
      <button onClick={removeItem}>−</button>
      <span>{item.quantity}</span>
      <button onClick={addItem}>+</button>
    </div>
    <p>₹{item.price * item.quantity}</p>
  </div>
</div>
```

### Summary Section
```jsx
<div className="cart-summary">
  <div className="summary-row">
    <span>Subtotal</span>
    <span>₹{subtotal}</span>
  </div>
  <div className="summary-row">
    <span>Tax (5%)</span>
    <span>₹{tax}</span>
  </div>
  <div className="summary-total">
    <span>Total</span>
    <span>₹{total}</span>
  </div>
  <button onClick={handleCheckout}>
    Proceed to Checkout
  </button>
</div>
```

## Design Tokens Used

### Colors
```css
--customer-bg-deep: #1a0a2e      /* Deep midnight purple */
--customer-bg-royal: #2d1b4e     /* Royal purple */
--customer-bg-rich: #4a2c6d      /* Rich violet */
--customer-gold: #d4af37         /* Classic gold */
--customer-gold-dark: #b8860b    /* Dark goldenrod */
--customer-ivory: #f5f0e8        /* Warm ivory */
```

### Effects
- Gold shimmer animation (8s infinite)
- Texture overlay with fine lines
- Glass-morphism with backdrop blur
- Multiple shadow layers for depth
- Smooth transitions (0.3s ease)

## Integration Points

### From CustomerHome.js
```javascript
// View Cart button click handler
const params = new URLSearchParams({
  theaterid: theaterId,
  theatername: theater.name,
  qrname: qrName,
  seat: seat
});
navigate(`/customer/cart?${params.toString()}`);
```

### To CustomerCheckout.js
```javascript
// Checkout button click handler
const params = new URLSearchParams({
  theaterid: theaterId,
  theatername: theaterName,
  qrname: qrName,
  seat: seat
});
navigate(`/customer/checkout?${params.toString()}`);
```

## Cart Context Usage

### Adding Items
```javascript
const { addItem } = useCart();
addItem(product); // Adds 1 or increments quantity
```

### Removing Items
```javascript
const { removeItem } = useCart();
removeItem(product); // Removes 1 or decrements quantity
```

### Getting Total Count
```javascript
const { getTotalItems } = useCart();
const count = getTotalItems(); // Returns total quantity of all items
```

### Clearing Cart
```javascript
const { clearCart } = useCart();
clearCart(); // Removes all items from cart
```

## Future Enhancements
- [ ] Apply promo codes/discounts
- [ ] Save cart for later
- [ ] Product recommendations
- [ ] Delivery time estimation
- [ ] Special instructions per item
- [ ] Favorite items quick add
- [ ] Cart item notes
- [ ] Combo/bundle suggestions

## Testing Checklist
- [x] Empty cart state displays correctly
- [x] Items display with correct info
- [x] Quantity controls work properly
- [x] Price calculations are accurate
- [x] Navigation works with all params
- [x] Responsive design on mobile
- [x] Premium styling matches design system
- [x] Animations are smooth
- [x] No console errors
- [x] Hover states work correctly

## Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Requires ES6+ support
- Uses CSS Grid and Flexbox

---

**Created**: October 16, 2025
**Design System**: Premium Classic Luxury
**Theme**: Customer Screens Only
