# HomePage Structure - Quick Reference

## 📂 Directory Structure

```
frontend/src/home/
├── pages/
│   └── HomePage.js                    # Main HomePage component
├── components/
│   ├── FAQAccordion.js               # FAQ section
│   ├── HowItWorksSliderNew.js        # How It Works slider
│   └── PopularMenuCarousel.js        # Popular menu carousel
├── css/
│   ├── HomePage.css                   # Main styles
│   ├── HeroNew.css                    # Hero section
│   ├── Responsive.css                 # Responsive breakpoints
│   ├── FAQAccordion.css              # FAQ styles
│   ├── HowItWorksSliderNew.css       # Slider styles
│   └── PopularMenuCarousel.css       # Carousel styles
└── images/
    ├── Home-1.mp4                     # Hero video
    ├── Browse Menu.jpg                # Browse menu image
    └── Scan QR Code.jpg               # QR scan image
```

## 🔗 Import Path Examples

### From HomePage.js (`home/pages/`)

```javascript
// HomePage-specific components (same level)
import FAQAccordion from '../components/FAQAccordion';
import PopularMenuCarousel from '../components/PopularMenuCarousel';

// HomePage-specific CSS
import '../css/HomePage.css';
import '../css/Responsive.css';

// HomePage-specific images
import heroVideo from '../images/Home-1.mp4';

// Shared components (up two levels)
import LazyImage from '../../components/LazyImage';

// Config/Hooks (up two levels)
import config from '../../config';
import { useCursor } from '../../hooks/useCursor';
```

### From HomePage Components (`home/components/`)

```javascript
// HomePage CSS (sibling directory)
import '../css/FAQAccordion.css';

// HomePage images (sibling directory)
import scanQRImage from '../images/Scan QR Code.jpg';

// Shared components (up two levels)
import LazyImage from '../../components/LazyImage';
```

## ⚡ Quick Commands

```powershell
# View structure
tree /F d:\8\frontend\src\home

# Build project
cd d:\8\frontend
npm run build

# Start dev server
npm start

# Run tests
npm test
```

## 🎯 Key Points

✅ **All HomePage files in one place** - Easy to find and maintain  
✅ **Shared components stay in `src/components/`** - Header.js, LazyImage.js, etc.  
✅ **Relative imports** - Use `../` for same module, `../../` for parent  
✅ **Images organized** - All static assets in `home/images/`  
✅ **CSS co-located** - Styles next to components they style  

## 🚨 Common Mistakes

❌ Importing Header from `../components/Header` (should be from `../../components/Header`)  
❌ Using old path `../styles/` (should be `../css/`)  
❌ Using old path `../Images/` (should be `../images/` - lowercase)  
❌ Moving shared components into `home/components/`  

## 📝 File Count

- **Pages:** 1 file
- **Components:** 3 files  
- **CSS:** 6 files  
- **Images:** 3 files  
- **Total:** 13 files

---

**Last Updated:** October 15, 2025
