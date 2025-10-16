# QR Code System - Visual Flow Diagram

## 🎯 Complete System Overview

```
╔═══════════════════════════════════════════════════════════════════╗
║                    QR CODE SCANNING SYSTEM                         ║
║                    Theater Food Ordering                           ║
╚═══════════════════════════════════════════════════════════════════╝

┌───────────────────────────────────────────────────────────────────┐
│ PHASE 1: QR CODE GENERATION (Admin)                               │
└───────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │  Super Admin    │
    │  Login          │
    └────────┬────────┘
             │
             ↓
    ┌─────────────────┐
    │  QR Generate    │
    │  Page           │
    │                 │
    │  Select:        │
    │  - Theater      │
    │  - QR Type      │
    │  - QR Name      │
    │  - Logo         │
    └────────┬────────┘
             │
             ↓
    ┌─────────────────┐
    │  Backend API    │
    │  POST /api/     │
    │    qrcodes      │
    │                 │
    │  Generate:      │
    │  - QR Image     │
    │  - With Logo    │
    │  - Upload GCS   │
    │  - Save DB      │
    └────────┬────────┘
             │
             ↓
    ┌─────────────────┐
    │  QR Code Image  │
    │  ┌───────────┐  │
    │  │ ▓▓░░▓▓░░ │  │ ← QR Code
    │  │ ░░▓▓░░▓▓ │  │   with embedded URL
    │  │ ▓▓░🎬░▓▓ │  │   and centered logo
    │  │ ░░▓▓░░▓▓ │  │
    │  └───────────┘  │
    │                 │
    │  URL:           │
    │  /menu/theater  │
    │  ?qrName=...    │
    └────────┬────────┘
             │
             ↓
    ┌─────────────────┐
    │  Print & Place  │
    │  at Theater     │
    └─────────────────┘


┌───────────────────────────────────────────────────────────────────┐
│ PHASE 2: CUSTOMER SCANNING (Customer)                             │
└───────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │  Customer at    │
    │  Theater        │
    │  🎭🍿          │
    └────────┬────────┘
             │
             ↓
    ┌─────────────────┐
    │  Opens Phone    │
    │  Camera         │
    │  📱📷         │
    └────────┬────────┘
             │
             ↓
    ┌─────────────────┐
    │  Points at QR   │
    │  Code           │
    │                 │
    │     📱          │
    │    ┌───┐        │
    │    │▓▓░│        │
    │    └───┘        │
    │   QR Code       │
    └────────┬────────┘
             │
             ↓
    ┌─────────────────┐
    │  Camera Detects │
    │  QR Code        │
    │  ✓ Recognized   │
    │                 │
    │  Shows:         │
    │  "Open Link?"   │
    └────────┬────────┘
             │
             ↓
    ┌─────────────────┐
    │  Customer Taps  │
    │  Notification   │
    │  👆            │
    └────────┬────────┘
             │
             ↓
    ┌─────────────────┐
    │  Phone Opens    │
    │  Browser        │
    │  🌐             │
    │                 │
    │  URL:           │
    │  192.168.1.11   │
    │  /menu/theater  │
    │  ?qrName=...    │
    └────────┬────────┘
             │
             ↓

┌───────────────────────────────────────────────────────────────────┐
│ PHASE 3: ROUTING & RENDERING (React App)                          │
└───────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │  React Router   │
    │  App.js         │
    │                 │
    │  Matches Route: │
    │  /menu/:theater │
    └────────┬────────┘
             │
             ↓
    ┌─────────────────┐
    │  CustomerLanding│
    │  Component      │
    │                 │
    │  useParams()    │
    │  useLocation()  │
    └────────┬────────┘
             │
             ↓
    ┌─────────────────┐
    │  Extract Params │
    │                 │
    │  ✓ theaterId    │
    │  ✓ qrName       │
    │  ✓ screen       │
    │  ✓ seat         │
    └────────┬────────┘
             │
             ↓
    ┌─────────────────┐
    │  API Calls      │
    │                 │
    │  1. GET         │
    │  /theaters/:id  │
    │                 │
    │  2. GET         │
    │  /settings      │
    └────────┬────────┘
             │
             ├─────────────────────┐
             │                     │
             ↓                     ↓
    ┌────────────────┐    ┌────────────────┐
    │  Theater Data  │    │  Settings Data │
    │                │    │                │
    │  - Name        │    │  - App Name    │
    │  - Location    │    │  - Logo URL    │
    │  - Logo        │    │  - Theme       │
    │  - Color       │    │                │
    └────────┬───────┘    └────────┬───────┘
             │                     │
             └──────────┬──────────┘
                        │
                        ↓
    ┌─────────────────────────────┐
    │  Render Landing Page        │
    │                             │
    │  ┌───────────────────────┐  │
    │  │   WELCOME TO          │  │
    │  │                       │  │
    │  │ YQ CINEMAS - DEMO     │  │
    │  │      MUMBAI           │  │
    │  │                       │  │
    │  │   ┌───────────┐       │  │
    │  │   │ 🍿   🥤  │       │  │
    │  │   └───────────┘       │  │
    │  │                       │  │
    │  │  ┌───────────────┐    │  │
    │  │  │» FOOD ORDER «│    │  │
    │  │  └───────────────┘    │  │
    │  │                       │  │
    │  │   ORDER HISTORY       │  │
    │  │                       │  │
    │  │  Powered By YQPay     │  │
    │  └───────────────────────┘  │
    └─────────────┬───────────────┘
                  │
                  ↓


┌───────────────────────────────────────────────────────────────────┐
│ PHASE 4: CUSTOMER ORDERING (Order Flow)                           │
└───────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │  Customer Views │
    │  Landing Page   │
    │  👀             │
    └────────┬────────┘
             │
             ↓
    ┌─────────────────┐
    │  Clicks:        │
    │  » FOOD ORDER « │
    │  👆            │
    └────────┬────────┘
             │
             ↓
    ┌─────────────────┐
    │  Navigate to:   │
    │  /customer/     │
    │    order        │
    │                 │
    │  With params:   │
    │  ?theaterid=... │
    │  &qrName=...    │
    └────────┬────────┘
             │
             ↓
    ┌─────────────────┐
    │  CustomerHome   │
    │  Component      │
    │                 │
    │  Displays:      │
    │  - Menu Items   │
    │  - Categories   │
    │  - Cart         │
    └────────┬────────┘
             │
             ↓
    ┌─────────────────┐
    │  Customer       │
    │  Browses Menu   │
    │  📋             │
    └────────┬────────┘
             │
             ↓
    ┌─────────────────┐
    │  Adds Items to  │
    │  Cart           │
    │  🛒             │
    │                 │
    │  🍿 Popcorn x2  │
    │  🥤 Coke x1     │
    │  🍔 Burger x1   │
    └────────┬────────┘
             │
             ↓
    ┌─────────────────┐
    │  Proceeds to    │
    │  Checkout       │
    │  💳             │
    └────────┬────────┘
             │
             ↓
    ┌─────────────────┐
    │  Enter Details: │
    │  - Name         │
    │  - Phone        │
    │  - Payment      │
    └────────┬────────┘
             │
             ↓
    ┌─────────────────┐
    │  Place Order    │
    │  ✓ Confirmed    │
    │                 │
    │  Order #12345   │
    └────────┬────────┘
             │
             ↓
    ┌─────────────────┐
    │  Order Sent to  │
    │  Theater Staff  │
    │  👨‍🍳          │
    └────────┬────────┘
             │
             ↓
    ┌─────────────────┐
    │  Staff Prepares │
    │  Order          │
    │  🍴             │
    └────────┬────────┘
             │
             ↓
    ┌─────────────────┐
    │  Customer Gets  │
    │  Notification   │
    │  🔔 Ready!      │
    └────────┬────────┘
             │
             ↓
    ┌─────────────────┐
    │  Customer       │
    │  Collects Food  │
    │  🍿🥤🍔       │
    │                 │
    │  ✓ Complete!    │
    └─────────────────┘
```

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA FLOW                                 │
└─────────────────────────────────────────────────────────────────┘

[Customer Phone]
      ↓ Scans QR
      ↓
[QR Code URL]
/menu/68ed25e6962cb3e997acc163?qrName=Screen-1&type=single
      ↓
      ↓
[React Router - App.js]
Matches: /menu/:theaterId
      ↓
      ↓
[CustomerLanding Component]
      │
      ├─→ Extract Parameters ─────────────────────────┐
      │   • theaterId = "68ed25e6962cb3e997acc163"   │
      │   • qrName = "Screen-1"                       │
      │   • type = "single"                           │
      │                                               │
      ├─→ API Call 1: Load Theater ──────────────────┤
      │   GET /api/theaters/68ed25e6962cb3e997acc163 │
      │                                               │
      │   Response:                                   │
      │   {                                           │
      │     success: true,                            │
      │     theater: {                                │
      │       _id: "68ed25e6962cb3e997acc163",       │
      │       name: "YQ Cinemas - Demo Theater",     │
      │       location: {                             │
      │         city: "Mumbai",                       │
      │         address: "..."                        │
      │       },                                      │
      │       logoUrl: "...",                         │
      │       primaryColor: "#6B0E9B"                 │
      │     }                                         │
      │   }                                           │
      │                                               │
      ├─→ API Call 2: Load Settings ─────────────────┤
      │   GET /api/settings/general                   │
      │                                               │
      │   Response:                                   │
      │   {                                           │
      │     success: true,                            │
      │     data: {                                   │
      │       config: {                               │
      │         applicationName: "YQPayNow",         │
      │         logoUrl: "...",                       │
      │         primaryColor: "#6B0E9B"               │
      │       }                                       │
      │     }                                         │
      │   }                                           │
      │                                               │
      └─→ Render Landing Page ───────────────────────┘
            │
            ↓
      [Customer Sees]
      • Theater name: "YQ Cinemas - Demo Theater"
      • Location: "Mumbai"
      • Food combo image
      • "FOOD ORDER" button
      • "ORDER HISTORY" link
            │
            ↓ Customer clicks "FOOD ORDER"
            │
      [Navigate with Parameters]
      /customer/order?theaterid=68ed25e6962cb3e997acc163&qrName=Screen-1
            │
            ↓
      [CustomerHome Component]
      Displays menu and cart
```

---

## 🔄 Component Interaction Diagram

```
┌────────────────────────────────────────────────────────────┐
│                   COMPONENT STRUCTURE                       │
└────────────────────────────────────────────────────────────┘

                    [App.js]
                        │
      ┌─────────────────┼─────────────────┐
      │                 │                 │
      ↓                 ↓                 ↓
 [HomePage]    [CustomerLanding]   [CustomerHome]
                      │
                      │ Receives:
                      │ • params.theaterId (from route)
                      │ • location.search (query string)
                      │
      ┌───────────────┼───────────────┐
      │               │               │
      ↓               ↓               ↓
[LazyFoodImage]  [Theater API]  [Settings API]
                      │               │
                      └───────┬───────┘
                              │
                              ↓
                    [Landing Page Render]
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ↓               ↓               ↓
        [Welcome]      [Food Image]    [Action Buttons]
        Section          Section           Section
              │               │               │
              │               │               ├─→ FOOD ORDER
              │               │               │   onClick: navigate()
              │               │               │
              │               │               └─→ ORDER HISTORY
              │               │                   onClick: navigate()
              │               │
              └───────────────┴───────────────┘
                              │
                              ↓
                        [Footer Section]
                        Powered By YQPayNow
```

---

## 📱 Mobile User Experience Timeline

```
┌────────────────────────────────────────────────────────────┐
│                   USER EXPERIENCE TIMELINE                  │
└────────────────────────────────────────────────────────────┘

T = 0s
│  Customer arrives at theater
│  👤🎭
│
T = 5s
│  Customer sees QR code poster
│  👀 "Scan to order food"
│
T = 10s
│  Customer opens phone camera
│  📱📷
│
T = 12s
│  Customer points camera at QR code
│  📱 → ▓▓░░▓▓
│
T = 13s
│  Phone detects QR code
│  ✓ Recognized!
│  Notification: "Open link?"
│
T = 14s
│  Customer taps notification
│  👆
│
T = 15s
│  Browser opens
│  Loading...
│
T = 16s
│  Landing page displays
│  ┌─────────────────┐
│  │   WELCOME TO    │
│  │ YQ CINEMAS      │
│  │    MUMBAI       │
│  │                 │
│  │    🍿 🥤       │
│  │                 │
│  │ » FOOD ORDER «  │
│  │                 │
│  │ ORDER HISTORY   │
│  └─────────────────┘
│
T = 20s
│  Customer reads theater name
│  Customer sees food combo
│  Customer decides to order
│
T = 22s
│  Customer taps "FOOD ORDER" button
│  👆
│
T = 23s
│  Menu page loads
│  Customer sees all menu items
│
T = 30s - 2min
│  Customer browses menu
│  Customer adds items to cart
│  🛒 Popcorn, Coke, Burger
│
T = 2min
│  Customer proceeds to checkout
│  Enters name and phone
│  Selects payment method
│
T = 3min
│  Customer places order
│  ✓ Order #12345 confirmed
│
T = 10min
│  Staff prepares order
│  👨‍🍳 Cooking...
│
T = 15min
│  Order ready notification
│  🔔 "Your order is ready!"
│
T = 16min
│  Customer collects food
│  🍿🥤🍔
│  ✓ Happy customer!
│
Total Time: ~16 minutes from scan to food delivery
```

---

## 🎯 System Architecture

```
┌────────────────────────────────────────────────────────────┐
│                   SYSTEM ARCHITECTURE                       │
└────────────────────────────────────────────────────────────┘

                    [Cloud/Server]
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ↓                ↓                ↓
   [Backend]        [Database]    [Google Cloud]
   Node.js          MongoDB        Storage (GCS)
   Express                         │
   API Routes                      └─→ QR Code Images
        │                              └─→ Logo Images
        │
        └─────────→ [REST API Endpoints]
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ↓                ↓                ↓
   GET /theaters/:id  GET /settings  POST /qrcodes
        │                │                │
        │                │                │
        └────────────────┴────────────────┘
                         │
                    [HTTP/HTTPS]
                         │
                    [Frontend]
                    React App
                    Port: 3001
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ↓                ↓                ↓
   [React Router]   [Components]    [State]
        │                │                │
        ├─ /              ├─ HomePage         ├─ useState
        ├─ /menu/:id      ├─ CustomerLanding  ├─ useEffect
        ├─ /customer/*    ├─ CustomerHome     ├─ useCallback
        ├─ /dashboard     ├─ CustomerCheckout └─ useContext
        └─ /qr-generate   └─ AdminLayout
                         │
                         ↓
                  [Customer Device]
                  Mobile Browser
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ↓                ↓                ↓
   [Camera App]    [Browser App]   [Notification]
   (QR Scanner)    (Chrome/Safari)  (Link detected)
```

---

**Date Created:** October 15, 2025  
**Status:** ✅ Complete Visual Documentation  
**Purpose:** Easy understanding of QR scanning system flow
