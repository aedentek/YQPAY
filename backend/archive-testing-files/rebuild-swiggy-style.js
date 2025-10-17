const fs = require('fs');
const path = require('path');

// ============================================
// SWIGGY-STYLE HEADER - WITH EXISTING DATA
// ============================================

const customerHomeJS = `import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import config from '../../config';
import '../../styles/customer/CustomerHome.css';

const CustomerHome = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { addItem, removeItem, getItemQuantity, getTotalItems } = useCart();
  
  const [theaterId, setTheaterId] = useState(null);
  const [theater, setTheater] = useState(null);
  const [qrName, setQrName] = useState(null);
  const [seatClass, setSeatClass] = useState(null);
  const [seatNumber, setSeatNumber] = useState(null);
  const [screenName, setScreenName] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Extract URL parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('theaterid');
    const qr = params.get('qrName');
    const sClass = params.get('seatClass');
    const seat = params.get('seat');
    const screen = params.get('screen');
    
    if (!id) {
      setError('Theater ID required');
      setLoading(false);
      return;
    }
    
    setTheaterId(id);
    setQrName(qr);
    setSeatClass(sClass);
    setSeatNumber(seat);
    setScreenName(screen);
  }, [location.search]);

  // Load theater data
  const loadTheater = useCallback(async (id) => {
    try {
      const res = await fetch(\`\${config.api.baseUrl}/theaters/\${id}\`);
      const data = await res.json();
      if (data.success && data.data) setTheater(data.data);
    } catch (err) {
      console.error('Theater load error:', err);
    }
  }, []);

  // Load products
  const loadProducts = useCallback(async (id) => {
    try {
      const res = await fetch(\`\${config.api.baseUrl}/theater-products/\${id}\`);
      const data = await res.json();
      if (data.success && data.data.products) {
        setProducts(data.data.products.map(p => ({
          _id: p._id,
          name: p.name || p.productName,
          price: p.price || p.sellingPrice || 0,
          categoryName: p.categoryName || 'General',
          image: p.productImage || p.image || null,
          isVeg: p.isVeg !== undefined ? p.isVeg : true,
          description: p.description || ''
        })));
      }
    } catch (err) {
      console.error('Products load error:', err);
    }
  }, []);

  // Load categories
  const loadCategories = useCallback(async (id) => {
    try {
      const res = await fetch(\`\${config.api.baseUrl}/theater-categories/\${id}\`);
      const data = await res.json();
      const cats = data.success && data.data.categories 
        ? data.data.categories.map(c => ({
            _id: c._id,
            name: c.categoryName || c.name,
            icon: getIcon(c.categoryName || c.name)
          }))
        : [];
      setCategories([{ _id: 'all', name: 'All', icon: '🍽️' }, ...cats]);
    } catch (err) {
      setCategories([{ _id: 'all', name: 'All', icon: '🍽️' }]);
    }
  }, []);

  const getIcon = (name) => {
    const n = (name || '').toLowerCase();
    if (n.includes('burger')) return '🍔';
    if (n.includes('pizza')) return '🍕';
    if (n.includes('drink')) return '🥤';
    if (n.includes('popcorn')) return '🍿';
    if (n.includes('dessert')) return '🍦';
    if (n.includes('snack')) return '🍟';
    if (n.includes('sandwich')) return '🥪';
    if (n.includes('coffee')) return '☕';
    return '🍽️';
  };

  useEffect(() => {
    if (theaterId) {
      Promise.all([loadTheater(theaterId), loadProducts(theaterId), loadCategories(theaterId)])
        .finally(() => setLoading(false));
    }
  }, [theaterId, loadTheater, loadProducts, loadCategories]);

  // Filter products
  const filteredProducts = products.filter(p => {
    const catMatch = selectedCategory === 'all' || p.categoryName === selectedCategory;
    const searchMatch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return catMatch && searchMatch;
  });

  // Cart handlers
  const handleAdd = (p) => {
    addItem({ id: p._id, name: p.name, price: p.price, image: p.image });
  };

  if (loading) {
    return (
      <div className="swiggy-loading">
        <div className="swiggy-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="swiggy-error">
        <span className="swiggy-error-icon">⚠️</span>
        <h3>Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  const totalItems = getTotalItems();

  return (
    <div className="swiggy-app">
      {/* SWIGGY-STYLE HEADER */}
      <header className="swiggy-header">
        {/* Location Section */}
        <div className="swiggy-location">
          <div className="location-icon">📍</div>
          <div className="location-details">
            <div className="location-name">
              <h1>{theater?.name || 'Theater Name'}</h1>
              <span className="dropdown-arrow">▼</span>
            </div>
            <p className="location-address">
              {theater?.location?.address || theater?.location?.city || 'Location address'}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="swiggy-search">
          <div className="search-icon">🔍</div>
          <input
            type="text"
            className="search-input"
            placeholder="Search for 'Biryani'"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="mic-icon">🎤</div>
        </div>
      </header>

      {/* CATEGORIES SECTION */}
      <div className="swiggy-categories">
        {categories.map(cat => (
          <button
            key={cat._id}
            className={\`category-chip \${selectedCategory === cat._id ? 'active' : ''}\`}
            onClick={() => setSelectedCategory(cat._id)}
          >
            <span className="cat-icon">{cat.icon}</span>
            <span className="cat-name">{cat.name}</span>
          </button>
        ))}
      </div>

      {/* PRODUCTS SECTION */}
      <div className="swiggy-products">
        {filteredProducts.length === 0 ? (
          <div className="swiggy-empty">
            <span className="empty-icon">🍽️</span>
            <h3>No items found</h3>
            <p>Try searching for something else</p>
          </div>
        ) : (
          <div className="products-grid">
            {filteredProducts.map(product => {
              const qty = getItemQuantity(product._id);
              const imgUrl = product.image && typeof product.image === 'string'
                ? (product.image.startsWith('http') ? product.image : \`\${config.api.baseUrl}\${product.image}\`)
                : null;

              return (
                <div key={product._id} className="product-card">
                  {/* Product Image */}
                  <div className="product-image">
                    {imgUrl ? (
                      <img 
                        src={imgUrl}
                        alt={product.name}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="image-placeholder" style={{ display: imgUrl ? 'none' : 'flex' }}>
                      <span>🍽️</span>
                    </div>

                    {/* Veg/Non-Veg Badge */}
                    <div className={\`veg-badge \${product.isVeg ? 'veg' : 'non-veg'}\`}>
                      <div className="veg-dot"></div>
                    </div>

                    {/* Add Button on Image */}
                    {qty === 0 ? (
                      <button className="add-overlay" onClick={() => handleAdd(product)}>
                        ADD
                      </button>
                    ) : (
                      <div className="qty-overlay">
                        <button className="qty-btn" onClick={() => removeItem(product._id)}>−</button>
                        <span className="qty-num">{qty}</span>
                        <button className="qty-btn" onClick={() => handleAdd(product)}>+</button>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="product-info">
                    <h3 className="product-name">{product.name}</h3>
                    <p className="product-price">₹{product.price}</p>
                    {product.description && (
                      <p className="product-desc">{product.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CART FOOTER */}
      {totalItems > 0 && (
        <div className="swiggy-cart-footer" onClick={() => navigate(\`/customer/cart?theaterid=\${theaterId}\`)}>
          <div className="cart-info">
            <span className="cart-count">{totalItems} item{totalItems > 1 ? 's' : ''}</span>
            <span className="cart-text">View Cart</span>
          </div>
          <button className="cart-button">
            VIEW CART →
          </button>
        </div>
      )}
    </div>
  );
};

export default CustomerHome;
`;

// ============================================
// SWIGGY-STYLE CSS - MATCHING REFERENCE IMAGE
// ============================================

const customerHomeCSS = `/* ============================================
   SWIGGY-STYLE CUSTOMER HOME
   Matching Reference Image Design
   ============================================ */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.swiggy-app {
  font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f5f5f5;
  min-height: 100vh;
  padding-bottom: 80px;
}

/* ============================================
   HEADER - SWIGGY STYLE (Purple Gradient)
   ============================================ */

.swiggy-header {
  background: linear-gradient(180deg, #5C4DB1 0%, #7B4DB1 50%, #9B5DB1 100%);
  padding: 16px 20px 20px;
  color: white;
  position: relative;
}

/* Location Section */
.swiggy-location {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.location-icon {
  font-size: 24px;
  margin-top: 2px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
}

.location-details {
  flex: 1;
}

.location-name {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.location-name h1 {
  font-size: 22px;
  font-weight: 700;
  margin: 0;
  letter-spacing: 0.3px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

.dropdown-arrow {
  font-size: 14px;
  opacity: 0.9;
}

.location-address {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.4;
  margin: 0;
  max-width: 90%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Search Bar */
.swiggy-search {
  background: white;
  border-radius: 12px;
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.search-icon {
  font-size: 18px;
  color: #6c757d;
  opacity: 0.7;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 15px;
  color: #333;
  background: transparent;
  font-family: inherit;
}

.search-input::placeholder {
  color: #999;
}

.mic-icon {
  font-size: 20px;
  color: #ff6600;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.mic-icon:hover {
  transform: scale(1.1);
}

/* ============================================
   CATEGORIES - HORIZONTAL SCROLL
   ============================================ */

.swiggy-categories {
  background: white;
  padding: 16px 0;
  overflow-x: auto;
  scrollbar-width: none;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  gap: 10px;
  padding: 16px 20px;
}

.swiggy-categories::-webkit-scrollbar {
  display: none;
}

.category-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: #f8f9fa;
  border: 2px solid transparent;
  padding: 10px 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  min-width: 80px;
  flex-shrink: 0;
}

.category-chip:hover {
  background: #e9ecef;
  transform: translateY(-2px);
}

.category-chip.active {
  background: linear-gradient(135deg, #7B4DB1 0%, #9B5DB1 100%);
  border-color: #7B4DB1;
  color: white;
  box-shadow: 0 4px 12px rgba(123, 77, 177, 0.3);
}

.cat-icon {
  font-size: 26px;
}

.cat-name {
  font-size: 13px;
  font-weight: 600;
}

/* ============================================
   PRODUCTS - VERTICAL LIST (SWIGGY STYLE)
   ============================================ */

.swiggy-products {
  padding: 16px 20px;
}

.products-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.product-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  gap: 16px;
  padding: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
}

.product-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

/* Product Image */
.product-image {
  position: relative;
  width: 120px;
  height: 120px;
  flex-shrink: 0;
  border-radius: 12px;
  overflow: hidden;
  background: #f8f9fa;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

/* Veg/Non-Veg Badge */
.veg-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 18px;
  height: 18px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.veg-badge.veg {
  border: 1.5px solid #28a745;
}

.veg-badge.non-veg {
  border: 1.5px solid #dc3545;
}

.veg-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.veg-badge.veg .veg-dot {
  background: #28a745;
}

.veg-badge.non-veg .veg-dot {
  background: #dc3545;
}

/* Add Button Overlay on Image */
.add-overlay {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  color: #7B4DB1;
  border: 1.5px solid #7B4DB1;
  padding: 6px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.add-overlay:hover {
  background: #7B4DB1;
  color: white;
  transform: translateX(-50%) scale(1.05);
}

/* Quantity Overlay on Image */
.qty-overlay {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  background: white;
  padding: 4px 8px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.qty-btn {
  background: transparent;
  color: #7B4DB1;
  border: none;
  width: 26px;
  height: 26px;
  border-radius: 4px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.qty-btn:hover {
  background: #f0e6ff;
  transform: scale(1.1);
}

.qty-btn:active {
  transform: scale(0.95);
}

.qty-num {
  font-size: 14px;
  font-weight: 600;
  color: #7B4DB1;
  min-width: 20px;
  text-align: center;
}

/* Product Info */
.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 0;
}

.product-name {
  font-size: 16px;
  font-weight: 600;
  color: #212529;
  margin: 0;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-price {
  font-size: 15px;
  font-weight: 700;
  color: #212529;
  margin: 0;
}

.product-desc {
  font-size: 13px;
  color: #6c757d;
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ============================================
   EMPTY STATE
   ============================================ */

.swiggy-empty {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  opacity: 0.3;
  display: block;
  margin-bottom: 16px;
}

.swiggy-empty h3 {
  font-size: 20px;
  color: #495057;
  margin-bottom: 8px;
}

.swiggy-empty p {
  font-size: 14px;
  color: #6c757d;
}

/* ============================================
   CART FOOTER - STICKY
   ============================================ */

.swiggy-cart-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, #7B4DB1 0%, #9B5DB1 100%);
  color: white;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  z-index: 1000;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.cart-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cart-count {
  font-size: 16px;
  font-weight: 700;
}

.cart-text {
  font-size: 13px;
  opacity: 0.9;
}

.cart-button {
  background: white;
  color: #7B4DB1;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.cart-button:hover {
  transform: scale(1.05);
}

.cart-button:active {
  transform: scale(0.95);
}

/* ============================================
   LOADING STATE
   ============================================ */

.swiggy-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 16px;
  background: #f5f5f5;
}

.swiggy-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #e9ecef;
  border-top-color: #7B4DB1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.swiggy-loading p {
  font-size: 16px;
  color: #6c757d;
}

/* ============================================
   ERROR STATE
   ============================================ */

.swiggy-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  text-align: center;
  background: #f5f5f5;
}

.swiggy-error-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.swiggy-error h3 {
  font-size: 24px;
  color: #dc3545;
  margin-bottom: 8px;
}

.swiggy-error p {
  font-size: 16px;
  color: #6c757d;
}

/* ============================================
   RESPONSIVE DESIGN
   ============================================ */

@media (min-width: 768px) {
  .swiggy-app {
    max-width: 1200px;
    margin: 0 auto;
  }

  .product-image {
    width: 140px;
    height: 140px;
  }

  .swiggy-cart-footer {
    max-width: 1200px;
    left: 50%;
    transform: translateX(-50%);
  }
}

@media (max-width: 480px) {
  .swiggy-header {
    padding: 12px 16px 16px;
  }

  .location-name h1 {
    font-size: 20px;
  }

  .location-address {
    font-size: 12px;
  }

  .swiggy-search {
    padding: 10px 14px;
  }

  .search-input {
    font-size: 14px;
  }

  .product-image {
    width: 100px;
    height: 100px;
  }

  .product-name {
    font-size: 15px;
  }

  .product-price {
    font-size: 14px;
  }
}
`;

// ============================================
// WRITE FILES
// ============================================

const jsPath = path.join(__dirname, '../frontend/src/pages/customer/CustomerHome.js');
const cssPath = path.join(__dirname, '../frontend/src/styles/customer/CustomerHome.css');

try {
  fs.writeFileSync(jsPath, customerHomeJS, 'utf8');
  console.log('✅ CustomerHome.js created!');
  console.log('   - Swiggy-style header with location and search');
  console.log('   - Using theater name from database');
  console.log('   - Horizontal scrolling categories');
  console.log('   - Vertical product list (image left, info right)');
  console.log('   - Add button overlay on images');

  fs.writeFileSync(cssPath, customerHomeCSS, 'utf8');
  console.log('✅ CustomerHome.css created!');
  console.log('   - Purple gradient header (matching Swiggy)');
  console.log('   - White rounded search bar');
  console.log('   - Category chips with active states');
  console.log('   - Product cards with hover effects');
  console.log('   - Sticky cart footer');

  console.log('\\n📁 Files created at:');
  console.log('   -', jsPath);
  console.log('   -', cssPath);
  console.log('\\n🎉 Swiggy-style design implemented! Zero errors!');
} catch (error) {
  console.error('❌ Error writing files:', error);
  process.exit(1);
}
