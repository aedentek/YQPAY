# QR Code Scanning - Quick Test Guide

## 🎯 Quick Test Steps

### ✅ Step 1: Access Test URL Directly

Open your browser and paste this URL (replace with your actual theater ID):

```
http://localhost:3001/menu/68ed25e6962cb3e997acc163?qrName=Screen-1&type=single
```

OR if using the local IP shown in your screenshot:

```
http://192.168.1.11:3001/menu/68ed25e6962cb3e997acc163?qrName=Screen-1&type=single
```

### ✅ Step 2: Verify Landing Page

You should see:
```
┌────────────────────────────┐
│                            │
│      WELCOME TO            │
│                            │
│  YQ CINEMAS - DEMO THEATER│
│         MUMBAI             │
│                            │
│    [Purple Popcorn🍿]      │
│    [Black Drink🥤]         │
│                            │
│  ┌────────────────────┐    │
│  │ » FOOD ORDER «    │    │
│  └────────────────────┘    │
│                            │
│     ORDER HISTORY          │
│                            │
│    Powered By YQPayNow     │
└────────────────────────────┘
```

### ✅ Step 3: Test Navigation

1. Click **"FOOD ORDER"** button
   - Should redirect to: `/customer/order?theaterid=...&qrName=Screen-1`
   - Menu page should load

2. Click **"ORDER HISTORY"** link
   - Should redirect to: `/customer/history?theaterid=...`
   - Order history page should load

---

## 📱 Mobile Testing

### Using Phone Camera QR Scanner:

1. **Generate Test QR Code:**
   - Go to: http://localhost:3001/qr-generate (as admin)
   - Or use this test URL generator: https://www.qr-code-generator.com/
   - Input URL: `http://192.168.1.11:3001/menu/68ed25e6962cb3e997acc163?qrName=Test&type=single`

2. **Scan QR Code:**
   - Open phone camera
   - Point at QR code
   - Tap notification to open

3. **Should See:**
   - Theater landing page
   - Theater name and location
   - Food combo image
   - Order buttons

---

## 🔧 URL Format Examples

### Single QR Code (One Location)
```
/menu/68ed25e6962cb3e997acc163?qrName=Screen-1&type=single
```

### Screen-Specific QR Code
```
/menu/68ed25e6962cb3e997acc163?qrName=Screen-1&screen=Premium-Hall&type=single
```

### Seat-Specific QR Code
```
/menu/68ed25e6962cb3e997acc163?qrName=Screen-1&screen=Premium-Hall&seat=A15&type=single
```

### Legacy Format (Still Supported)
```
/customer?theaterid=68ed25e6962cb3e997acc163&screen=Screen-1
```

---

## 🎨 What You Should See (Matching Your Screenshot)

```
┌─────────────────────────────┐
│  X     192.168.1.11      ☰  │  ← Browser header
├─────────────────────────────┤
│                             │
│     WELCOME TO              │  ← Welcome text
│                             │
│  YQ CINEMAS - DEMO THEATER │  ← Theater name (from DB)
│         MUMBAI              │  ← Location (from DB)
│                             │
│   ┌─────────────────────┐   │
│   │     🍿       🥤     │   │  ← Cinema combo image
│   │   Purple    Black   │   │     (Purple popcorn bucket
│   │   Popcorn   Drink   │   │      + Black drink cup)
│   └─────────────────────┘   │
│                             │
│  ╔═══════════════════════╗  │
│  ║   » FOOD ORDER «     ║  │  ← Primary button
│  ╚═══════════════════════╝  │
│                             │
│       ORDER HISTORY         │  ← Secondary link
│  ──────────────────────────  │
│                             │
│     Powered By YQPayNow     │  ← Footer
│      [Logo/Name]            │
│                             │
│      < ↺ 🧭                 │  ← Browser controls
└─────────────────────────────┘
```

---

## 🐛 Troubleshooting

### Problem: Page Shows "Theater Not Found"

**Solution:**
1. Check theater ID is correct:
   ```bash
   # In backend console
   node backend/check-theater-documents.js
   ```
2. Copy a valid theater ID from output
3. Replace in URL

### Problem: Image Not Showing

**Solution:**
1. Check image exists: `frontend/public/images/cinema-combo.jpg.png`
2. Or update image path in `CustomerLanding.js`:
   ```javascript
   const CINEMA_COMBO_IMAGE = "/images/your-image-name.png";
   ```

### Problem: URL Not Working

**Solution:**
1. Check servers are running:
   ```bash
   # Backend: http://localhost:5000
   # Frontend: http://localhost:3001
   ```
2. Check network IP is accessible from phone
3. Ensure phone is on same WiFi network

---

## ✅ Success Checklist

- [ ] URL loads in browser
- [ ] Theater name displays correctly
- [ ] Location shows city/address
- [ ] Purple popcorn image visible
- [ ] Black drink cup visible
- [ ] "FOOD ORDER" button present
- [ ] "ORDER HISTORY" link present
- [ ] Clicking button navigates correctly
- [ ] Parameters passed to order page
- [ ] Mobile responsive (if testing on phone)

---

## 📋 Test Data

### Sample Theater IDs (Update with your actual IDs):
```
Theater 1: 68ed25e6962cb3e997acc163
Theater 2: [Check your database]
Theater 3: [Check your database]
```

### Sample URLs to Test:
```
1. Basic:
   /menu/68ed25e6962cb3e997acc163

2. With QR Name:
   /menu/68ed25e6962cb3e997acc163?qrName=Screen-1

3. Full:
   /menu/68ed25e6962cb3e997acc163?qrName=Screen-1&screen=Premium&seat=A15&type=single
```

---

## 🚀 Next Steps After Successful Test

1. **Generate Real QR Codes**
   - Login as super_admin
   - Go to QR Generate page
   - Create QR codes for each theater location

2. **Print QR Codes**
   - Download generated QR codes
   - Print on cards/posters
   - Place at theater locations

3. **Train Staff**
   - Show staff how to direct customers
   - Explain QR scanning process
   - Demonstrate order flow

4. **Monitor Usage**
   - Check analytics dashboard
   - Track QR scans per location
   - Monitor order conversion rates

---

**Quick Test Command:**
```bash
# Open in browser
start http://localhost:3001/menu/68ed25e6962cb3e997acc163?qrName=Test
```

**Status:** ✅ Ready to Test!
