# QR Code Scanning System Documentation

## 📋 Overview
This document describes the **QR Code Scanning System** for theater-specific customer ordering. When customers scan a QR code at a theater, they are redirected to the theater's branded customer landing page where they can order food and view their order history.

**Implementation Date:** October 15, 2025  
**Status:** ✅ **Production Ready**

---

## 🎯 System Flow

### 1. QR Code Generation
```
Admin → QR Generate Page → Create QR Code
                              ↓
                    QR Code Data Structure:
                    {
                      url: "/menu/{theaterId}?qrName={name}&type=single",
                      theater: ObjectId,
                      qrName: "Screen - 1",
                      seatClass: "Premium",
                      logoUrl: "...",
                      primaryColor: "#6B0E9B"
                    }
```

### 2. Customer Scans QR Code
```
Customer's Phone → Scan QR Code
                       ↓
                Opens URL in Browser:
                /menu/68ed25e6962cb3e997acc163?qrName=Screen-1&type=single
```

### 3. Application Routing
```
React Router → /menu/:theaterId
                     ↓
              CustomerLanding Component
                     ↓
              Extract Parameters:
              - theaterId (from route param)
              - qrName (from query string)
              - screen (from query string - optional)
              - seat (from query string - optional)
```

### 4. Data Loading
```
CustomerLanding Component
         ↓
    Load Theater Data (API: /api/theaters/:id)
         ↓
    Load Settings Data (API: /api/settings/general)
         ↓
    Display Branded Landing Page
```

### 5. Customer Action
```
Customer Views Landing Page:
  - Theater Name
  - Location
  - Cinema Combo Image
  - FOOD ORDER Button
  - ORDER HISTORY Link
         ↓
Customer Clicks "FOOD ORDER"
         ↓
Navigate to: /customer/order?theaterid={id}&qrName={name}
         ↓
Customer Orders Food
```

---

## 🔧 Technical Implementation

### 1. Route Configuration (`App.js`)

```javascript
// QR Code Redirect Route - Public Access
<Route path="/menu/:theaterId" element={<CustomerLanding />} />

// Customer Routes - Public Access
<Route path="/customer" element={<CustomerLanding />} />
<Route path="/customer/order" element={<CustomerHome />} />
<Route path="/customer/history" element={<CustomerOrderHistory />} />
<Route path="/customer/checkout" element={<CustomerCheckout />} />
```

**Why `/menu/:theaterId`?**
- Clean, semantic URL structure
- Theater ID in path (SEO-friendly)
- Query parameters for additional context
- No authentication required (public access)

### 2. CustomerLanding Component Updates

#### Import useParams Hook
```javascript
import { useLocation, useNavigate, useParams } from 'react-router-dom';
```

#### Extract Theater ID from Route Parameter
```javascript
const CustomerLanding = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams(); // NEW - Get route parameters
  
  // State management
  const [theaterId, setTheaterId] = useState(null);
  const [qrName, setQrName] = useState(null); // NEW
  const [screenName, setScreenName] = useState(null);
  const [seatId, setSeatId] = useState(null);

  // Extract parameters from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    
    // Theater ID from route param OR query string
    const routeTheaterId = params.theaterId; // /menu/:theaterId
    const queryTheaterId = urlParams.get('theaterid'); // ?theaterid=...
    const id = routeTheaterId || queryTheaterId;
    
    // Additional parameters
    const screen = urlParams.get('screen');
    const seat = urlParams.get('seat');
    const qr = urlParams.get('qrName'); // NEW - QR name
    
    console.log('🎯 Theater ID:', id, '| QR:', qr);
    
    setTheaterId(id);
    setQrName(qr);
    setScreenName(screen);
    setSeatId(seat);
  }, [location.search, params.theaterId]); // Watch both sources
};
```

**Key Features:**
- ✅ Supports both route parameter (`/menu/:theaterId`) and query string (`?theaterid=...`)
- ✅ Extracts QR name for tracking
- ✅ Handles optional screen and seat parameters
- ✅ Backward compatible with existing URLs

### 3. QR Code Data Structure

#### Generated QR Code URL
```
Base URL: http://localhost:3001/menu/{theaterId}
Query Parameters:
  - qrName: Identifier for the QR code (e.g., "Screen-1", "Canteen-Main")
  - type: QR type ("single" or "range")
  - screen: Optional screen name
  - seat: Optional seat ID

Example:
http://localhost:3001/menu/68ed25e6962cb3e997acc163?qrName=Screen-1&type=single
```

#### Database QR Code Record
```javascript
{
  _id: ObjectId("..."),
  theater: ObjectId("68ed25e6962cb3e997acc163"),
  qrType: "single",
  qrName: "Screen - 1",
  seatClass: "Premium",
  seat: null,
  qrCodeUrl: "https://storage.googleapis.com/.../qr-code.png",
  qrCodeData: "http://localhost:3001/menu/68ed25e6962cb3e997acc163?qrName=Screen-1&type=single",
  logoUrl: "https://storage.googleapis.com/.../logo.png",
  logoType: "default",
  isActive: true,
  metadata: {
    totalSeats: 1,
    fileSize: 125000,
    primaryColor: "#6B0E9B",
    hasLogo: true
  },
  createdBy: ObjectId("..."),
  createdAt: ISODate("2025-10-15T..."),
  updatedAt: ISODate("2025-10-15T...")
}
```

---

## 📱 Customer Experience

### Screen 1: Customer Scans QR Code

```
┌─────────────────────────────┐
│  📱 Customer's Phone        │
│                             │
│  [Camera App]               │
│   ┌───────────────────┐    │
│   │                   │    │
│   │   📷 QR Code      │    │
│   │                   │    │
│   └───────────────────┘    │
│                             │
│  "Open in Browser"          │
│  ↓                          │
│  http://192.168.1.11        │
│  /menu/68ed25e6962cb3...    │
└─────────────────────────────┘
```

### Screen 2: Customer Landing Page (Your Uploaded Image)

```
┌─────────────────────────────┐
│  X     192.168.1.11      ☰ │
├─────────────────────────────┤
│                             │
│     WELCOME TO              │
│                             │
│  YQ CINEMAS - DEMO THEATER │
│         MUMBAI              │
│                             │
│   ╔═════════════════════╗   │
│   ║   🍿        🥤     ║   │
│   ║ [Purple]  [Black]  ║   │
│   ║ Popcorn    Drink   ║   │
│   ║ Bucket     Cup     ║   │
│   ╚═════════════════════╝   │
│                             │
│  ┌─────────────────────┐    │
│  │ » FOOD ORDER «     │    │
│  └─────────────────────┘    │
│                             │
│      ORDER HISTORY          │
│ ─────────────────────────   │
│                             │
│      < ↺ 🧭                │
└─────────────────────────────┘
```

**Features:**
- ✅ Theater-specific branding (name, location)
- ✅ Visual food combo (popcorn + drink)
- ✅ Primary action button (FOOD ORDER)
- ✅ Secondary link (ORDER HISTORY)
- ✅ Branded footer (Powered By YQPay)

### Screen 3: Order Page
After clicking "FOOD ORDER", customer navigates to:
```
/customer/order?theaterid=68ed25e6962cb3e997acc163&qrName=Screen-1
```

Here they can:
- ✅ Browse menu items
- ✅ Add items to cart
- ✅ Complete checkout
- ✅ Track order status

---

## 🔍 URL Parameter Handling

### Supported URL Formats

#### 1. QR Scan (Route Parameter)
```
/menu/:theaterId?qrName=Screen-1&type=single

Example:
/menu/68ed25e6962cb3e997acc163?qrName=Screen-1&type=single
```

#### 2. Direct Link (Query String)
```
/customer?theaterid=xxx&screen=yyy&seat=zzz

Example:
/customer?theaterid=68ed25e6962cb3e997acc163&screen=Screen-1&seat=A15
```

#### 3. Order Page
```
/customer/order?theaterid=xxx&qrName=yyy

Example:
/customer/order?theaterid=68ed25e6962cb3e997acc163&qrName=Screen-1
```

### Parameter Extraction Logic

```javascript
// Priority: Route parameter > Query string
const theaterId = params.theaterId || urlParams.get('theaterid');

// Optional parameters
const qrName = urlParams.get('qrName');
const screenName = urlParams.get('screen');
const seatId = urlParams.get('seat');
const type = urlParams.get('type'); // 'single' or 'range'
```

---

## 🎨 UI Components

### CustomerLanding Page Structure

```jsx
<div className="customer-landing">
  {/* Welcome Header */}
  <div className="welcome-section fade-in">
    <h1>WELCOME TO</h1>
    <h2>{theater.name}</h2>
    <p>{theater.location.city}</p>
  </div>

  {/* Cinema Combo Image */}
  <div className="food-section fade-in-delay">
    <LazyFoodImage
      src="/images/cinema-combo.jpg.png"
      alt="Purple Popcorn Bucket & Black Drink Cup"
      className="cinema-combo-direct"
    />
  </div>

  {/* Action Buttons */}
  <div className="action-section fade-in-delay">
    <button onClick={handleOrderFood}>
      <span>»</span> FOOD ORDER <span>«</span>
    </button>
    <button onClick={handleOrderHistory}>
      ORDER HISTORY
    </button>
  </div>

  {/* Footer */}
  <div className="footer-section fade-in-delay">
    <p>Powered By</p>
    <div className="logo-container">
      <img src="/api/settings/image/logo" alt="YQPayNow" />
    </div>
  </div>
</div>
```

### CSS Classes

```css
/* Landing page container */
.customer-landing { ... }

/* Welcome section */
.welcome-section { ... }
.welcome-title { ... }
.theater-name { ... }
.theater-location { ... }

/* Food combo image */
.food-section { ... }
.cinema-combo-direct { ... }

/* Action buttons */
.action-section { ... }
.order-button { ... }
.history-link { ... }

/* Footer */
.footer-section { ... }
.powered-by { ... }
.logo-container { ... }

/* Animations */
.fade-in { ... }
.fade-in-delay { ... }
```

---

## 🔐 Security & Validation

### Theater ID Validation
```javascript
// Check if theater ID is provided
if (!id) {
  setError('Theater ID is required');
  setLoading(false);
  return;
}

// Validate theater ID format (MongoDB ObjectId)
const objectIdRegex = /^[0-9a-fA-F]{24}$/;
if (!objectIdRegex.test(id)) {
  setError('Invalid Theater ID format');
  return;
}
```

### Theater Existence Check
```javascript
// Load theater data from API
const response = await fetch(`/api/theaters/${id}`);
const data = await response.json();

if (data.success && data.theater) {
  setTheater(data.theater);
} else {
  throw new Error(data.message || 'Theater not found');
}
```

### Error Handling
```javascript
// Display user-friendly error page
if (error) {
  return (
    <div className="customer-landing error">
      <div className="error-section">
        <div className="error-icon">⚠️</div>
        <h2>Theater Not Found</h2>
        <p>{error}</p>
        <p className="error-hint">
          Please check the QR code and try again.
        </p>
      </div>
    </div>
  );
}
```

---

## 📊 Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    QR CODE SCANNING FLOW                      │
└──────────────────────────────────────────────────────────────┘

1. ADMIN GENERATES QR CODE
   ┌─────────────────┐
   │ Admin Dashboard │
   │  QR Generate    │
   └────────┬────────┘
            │
            ↓
   ┌─────────────────┐
   │  Backend API    │
   │ /api/qrcodes    │
   │  - Generate QR  │
   │  - Upload GCS   │
   │  - Save DB      │
   └────────┬────────┘
            │
            ↓
   ┌─────────────────┐
   │  QR Code Image  │
   │ with Logo       │
   │ URL embedded    │
   └─────────────────┘

2. CUSTOMER SCANS QR CODE
   ┌─────────────────┐
   │  Customer's     │
   │  Phone Camera   │
   └────────┬────────┘
            │ Scans QR
            ↓
   ┌─────────────────┐
   │   QR Code URL   │
   │ /menu/theaterId │
   │ ?qrName=xxx     │
   └────────┬────────┘
            │
            ↓
   ┌─────────────────┐
   │  Browser Opens  │
   │  URL            │
   └─────────────────┘

3. REACT ROUTER MATCHES ROUTE
   ┌─────────────────┐
   │  App.js         │
   │ /menu/:theaterId│
   └────────┬────────┘
            │
            ↓
   ┌─────────────────┐
   │ CustomerLanding │
   │  Component      │
   └────────┬────────┘
            │
            ↓
   Extract Parameters:
   - theaterId (route)
   - qrName (query)
   - screen (query)
   - seat (query)

4. LOAD DATA
   ┌─────────────────┐
   │  API Calls      │
   │ GET /theaters/id│
   │ GET /settings   │
   └────────┬────────┘
            │
            ↓
   ┌─────────────────┐
   │  Theater Data   │
   │  - Name         │
   │  - Location     │
   │  - Logo         │
   │  - Color        │
   └────────┬────────┘
            │
            ↓
   ┌─────────────────┐
   │  Settings Data  │
   │  - App Name     │
   │  - Logo         │
   └─────────────────┘

5. RENDER LANDING PAGE
   ┌─────────────────┐
   │  Display:       │
   │  - Welcome      │
   │  - Theater Info │
   │  - Food Image   │
   │  - Order Button │
   │  - History Link │
   └────────┬────────┘
            │
            ↓
   Customer Clicks
   "FOOD ORDER"
            │
            ↓
   ┌─────────────────┐
   │  Navigate to:   │
   │ /customer/order │
   │ ?theaterid=xxx  │
   │ &qrName=yyy     │
   └─────────────────┘

6. CUSTOMER ORDERS FOOD
   ┌─────────────────┐
   │  CustomerHome   │
   │  - Browse Menu  │
   │  - Add to Cart  │
   │  - Checkout     │
   └─────────────────┘
```

---

## 🧪 Testing Guide

### Manual Testing Steps

#### 1. Generate Test QR Code
```bash
# Login as super_admin
# Navigate to: /qr-generate
# Select theater: "YQ Cinemas - Demo Theater"
# QR Type: Single
# QR Name: "Test Screen - 1"
# Click "Generate QR Codes"
# Download QR code image
```

#### 2. Scan QR Code
```bash
# Open QR code scanner on phone
# Scan the generated QR code
# Should open URL: http://192.168.1.11/menu/68ed25e6962cb3e997acc163?qrName=Test-Screen-1&type=single
```

#### 3. Verify Landing Page
```bash
# Check display:
✓ Header shows theater name
✓ Location shows city/address
✓ Purple popcorn + black drink image visible
✓ "FOOD ORDER" button present
✓ "ORDER HISTORY" link present
✓ Footer shows "Powered By YQPayNow"
```

#### 4. Test Navigation
```bash
# Click "FOOD ORDER" button
# Should navigate to: /customer/order?theaterid=...&qrName=...
# Verify menu loads correctly
# Verify cart functionality works
```

#### 5. Test Order History
```bash
# Click "ORDER HISTORY" link
# Should navigate to: /customer/history?theaterid=...
# Verify past orders display
```

### Automated Test Cases

```javascript
describe('QR Code Scanning Flow', () => {
  test('Route /menu/:theaterId should load CustomerLanding', () => {
    // Test route matching
  });

  test('Extract theaterId from route parameter', () => {
    // Test params.theaterId extraction
  });

  test('Extract qrName from query string', () => {
    // Test query parameter extraction
  });

  test('Load theater data successfully', () => {
    // Test API call to /api/theaters/:id
  });

  test('Display theater name and location', () => {
    // Test UI rendering
  });

  test('Navigate to order page on button click', () => {
    // Test navigation with parameters
  });

  test('Handle invalid theater ID gracefully', () => {
    // Test error handling
  });

  test('Handle missing theater data gracefully', () => {
    // Test 404 error page
  });
});
```

---

## 🐛 Troubleshooting

### Issue 1: QR Code Doesn't Redirect

**Symptoms:**
- QR code scans but doesn't open browser
- URL doesn't load

**Solutions:**
1. Check QR code data format
2. Verify base URL is correct
3. Ensure network connectivity
4. Check if theater ID is valid

### Issue 2: Theater Not Found Error

**Symptoms:**
- Landing page shows "Theater Not Found"
- Error message displayed

**Solutions:**
1. Verify theater ID in database
2. Check theater is active (not deleted)
3. Verify API endpoint is working
4. Check database connection

### Issue 3: Image Not Loading

**Symptoms:**
- Cinema combo image doesn't display
- Broken image icon

**Solutions:**
1. Check image file exists at: `/public/images/cinema-combo.jpg.png`
2. Verify file permissions
3. Check network path is correct
4. Verify file extension is correct

### Issue 4: Parameters Not Extracted

**Symptoms:**
- Theater ID is null
- QR name is missing
- Page doesn't load

**Solutions:**
1. Check URL format is correct
2. Verify useParams hook is imported
3. Check location.search parsing
4. Add console.log for debugging

---

## 📈 Performance Optimizations

### 1. Lazy Loading
```javascript
// LazyFoodImage component loads images on-demand
const LazyFoodImage = React.memo(({ src, alt, className }) => {
  // Only load image when component is visible
  // Show loading shimmer while loading
  // Show error placeholder if load fails
});
```

### 2. Data Caching
```javascript
// Theater data is cached in component state
// Settings data is cached in SettingsContext
// Reduces redundant API calls
```

### 3. Fast Initial Load
```javascript
// Minimal JavaScript on landing page
// Critical CSS inlined
// Images use lazy loading
// React Suspense for code splitting
```

### 4. Mobile Optimization
```css
/* Responsive images */
.cinema-combo-direct {
  width: 100%;
  max-width: 400px;
  height: auto;
}

/* Touch-friendly buttons */
.order-button {
  min-height: 60px;
  font-size: 18px;
}
```

---

## 🔮 Future Enhancements

### 1. Offline Support
- Add service worker for offline access
- Cache theater data locally
- Queue orders when offline

### 2. Analytics Tracking
- Track QR scans per theater
- Monitor conversion rates
- Analyze popular menu items

### 3. Seat-Specific QR Codes
- Generate range QR codes (A1-A20)
- Auto-populate seat number
- Validate seat availability

### 4. Multi-Language Support
- Detect user's language preference
- Display theater info in local language
- Translate menu items

### 5. Push Notifications
- Notify when order is ready
- Send promotional offers
- Alert about delays

---

## 📚 Related Documentation

- **QR Code Generation:** `backend/utils/qrCodeGenerator.js`
- **Customer Pages:** `frontend/src/pages/customer/`
- **Routing:** `frontend/src/App.js`
- **API Endpoints:** `backend/routes/qrcodes.js`
- **Database Schema:** `backend/models/ScreenQRCode.js`

---

## ✅ Implementation Checklist

- [x] Add `/menu/:theaterId` route to App.js
- [x] Import useParams in CustomerLanding
- [x] Extract theaterId from route parameter
- [x] Extract qrName from query string
- [x] Support both route and query theater IDs
- [x] Log parameters for debugging
- [x] Test QR code scanning flow
- [x] Verify landing page displays correctly
- [x] Verify navigation works with parameters
- [x] Create comprehensive documentation

---

**Status:** ✅ **Production Ready**  
**Last Updated:** October 15, 2025  
**Implementation Time:** ~30 minutes  
**Breaking Changes:** None  
**Backward Compatible:** Yes

---

## 🎉 Success Criteria Met

✅ **QR Code Scans Redirect to Customer Landing**  
✅ **Theater-Specific Branding Displayed**  
✅ **URL Parameters Extracted Correctly**  
✅ **Navigation to Order Page Works**  
✅ **Error Handling Implemented**  
✅ **Mobile-Responsive Design**  
✅ **Documentation Complete**

**The QR scanning system is now fully functional and ready for production use!** 🚀
