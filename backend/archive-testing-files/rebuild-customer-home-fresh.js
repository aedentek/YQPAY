const fs = require('fs');
const path = require('path');

// ============================================
// CUSTOMER HOME - COMPLETELY NEW DESIGN
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
      <div className="ch-loading">
        <div className="ch-spinner"></div>
        <p>Loading menu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ch-error">
        <span className="ch-error-icon">⚠️</span>
        <h3>Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  const totalItems = getTotalItems();

  return (
    <div className="customer-home">
      {/* HEADER - Theater Name Centered + Seat Info */}
      <header className="ch-header">
        <div className="ch-header-top">
          <h1 className="ch-theater-name">{theater?.name || 'Theater Name'}</h1>
        </div>
        <div className="ch-header-info">
          {seatClass && (
            <div className="ch-info-item">
              <span className="ch-info-label">Seat Class</span>
              <span className="ch-info-value">{seatClass}</span>
            </div>
          )}
          {qrName && (
            <div className="ch-info-item">
              <span className="ch-info-label">QR Code</span>
              <span className="ch-info-value">{qrName}</span>
            </div>
          )}
          {seatNumber && (
            <div className="ch-info-item">
              <span className="ch-info-label">Seat</span>
              <span className="ch-info-value">{seatNumber}</span>
            </div>
          )}
        </div>
      </header>

      {/* SEARCH BAR */}
      <div className="ch-search-section">
        <div className="ch-search-box">
          <span className="ch-search-icon">🔍</span>
          <input
            type="text"
            className="ch-search-input"
            placeholder="Search for food items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="ch-search-clear" onClick={() => setSearchQuery('')}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* CATEGORIES */}
      <div className="ch-categories">
        <div className="ch-categories-scroll">
          {categories.map(cat => (
            <button
              key={cat._id}
              className={\`ch-category-btn \${selectedCategory === cat._id ? 'active' : ''}\`}
              onClick={() => setSelectedCategory(cat._id)}
            >
              <span className="ch-category-icon">{cat.icon}</span>
              <span className="ch-category-name">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* PRODUCTS GRID */}
      <div className="ch-products">
        {filteredProducts.length === 0 ? (
          <div className="ch-empty">
            <span className="ch-empty-icon">🍽️</span>
            <h3>No items found</h3>
            <p>Try searching for something else</p>
          </div>
        ) : (
          <div className="ch-products-grid">
            {filteredProducts.map(product => {
              const qty = getItemQuantity(product._id);
              const imgUrl = product.image && typeof product.image === 'string'
                ? (product.image.startsWith('http') ? product.image : \`\${config.api.baseUrl}\${product.image}\`)
                : null;

              return (
                <div key={product._id} className="ch-product-card">
                  {/* Product Image */}
                  <div className="ch-product-image">
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
                    <div className="ch-product-placeholder" style={{ display: imgUrl ? 'none' : 'flex' }}>
                      <span>🍽️</span>
                    </div>

                    {/* Veg/Non-Veg Badge */}
                    <div className={\`ch-veg-badge \${product.isVeg ? 'veg' : 'non-veg'}\`}>
                      <div className="ch-veg-dot"></div>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="ch-product-info">
                    <h3 className="ch-product-name">{product.name}</h3>
                    {product.description && (
                      <p className="ch-product-desc">{product.description}</p>
                    )}
                    <div className="ch-product-footer">
                      <span className="ch-product-price">₹{product.price}</span>
                      
                      {/* Add/Quantity Controls */}
                      {qty === 0 ? (
                        <button className="ch-add-btn" onClick={() => handleAdd(product)}>
                          ADD
                        </button>
                      ) : (
                        <div className="ch-quantity-controls">
                          <button className="ch-qty-btn" onClick={() => removeItem(product._id)}>−</button>
                          <span className="ch-qty-value">{qty}</span>
                          <button className="ch-qty-btn" onClick={() => handleAdd(product)}>+</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CART FOOTER */}
      {totalItems > 0 && (
        <div className="ch-cart-footer" onClick={() => navigate(\`/customer/cart?theaterid=\${theaterId}\`)}>
          <div className="ch-cart-info">
            <span className="ch-cart-count">{totalItems} item{totalItems > 1 ? 's' : ''}</span>
            <span className="ch-cart-text">View Cart</span>
          </div>
          <button className="ch-cart-btn">
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
// CUSTOMER HOME CSS - COMPLETELY NEW DESIGN
// ============================================

const customerHomeCSS = `/* ============================================
   CUSTOMER HOME - FRESH MODERN DESIGN
   ============================================ */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.customer-home {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #f8f9fa;
  min-height: 100vh;
  padding-bottom: 90px;
}

/* ============================================
   HEADER - THEATER NAME CENTERED + SEAT INFO
   ============================================ */

.ch-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px 16px 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}

.ch-header-top {
  text-align: center;
  margin-bottom: 12px;
}

.ch-theater-name {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  margin: 0;
}

.ch-header-info {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.ch-info-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 80px;
}

.ch-info-label {
  font-size: 11px;
  opacity: 0.85;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.ch-info-value {
  font-size: 14px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 12px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

/* ============================================
   SEARCH BAR
   ============================================ */

.ch-search-section {
  background: white;
  padding: 16px;
  border-bottom: 1px solid #e9ecef;
}

.ch-search-box {
  display: flex;
  align-items: center;
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  padding: 12px 16px;
  gap: 12px;
  transition: all 0.3s ease;
}

.ch-search-box:focus-within {
  border-color: #667eea;
  background: white;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
}

.ch-search-icon {
  font-size: 18px;
  opacity: 0.6;
}

.ch-search-input {
  flex: 1;
  border: none;
  background: none;
  font-size: 15px;
  outline: none;
  color: #212529;
}

.ch-search-input::placeholder {
  color: #adb5bd;
}

.ch-search-clear {
  background: #dee2e6;
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  color: #495057;
  transition: all 0.2s ease;
}

.ch-search-clear:hover {
  background: #adb5bd;
  transform: scale(1.1);
}

/* ============================================
   CATEGORIES
   ============================================ */

.ch-categories {
  background: white;
  padding: 16px 0;
  border-bottom: 1px solid #e9ecef;
  overflow-x: auto;
  scrollbar-width: none;
}

.ch-categories::-webkit-scrollbar {
  display: none;
}

.ch-categories-scroll {
  display: flex;
  gap: 12px;
  padding: 0 16px;
}

.ch-category-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  padding: 12px 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 80px;
  white-space: nowrap;
}

.ch-category-btn:hover {
  background: #e9ecef;
  transform: translateY(-2px);
}

.ch-category-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: #667eea;
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.ch-category-icon {
  font-size: 24px;
}

.ch-category-name {
  font-size: 13px;
  font-weight: 600;
}

/* ============================================
   PRODUCTS GRID
   ============================================ */

.ch-products {
  padding: 16px;
}

.ch-products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
}

.ch-product-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}

.ch-product-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  transform: translateY(-4px);
}

/* Product Image */
.ch-product-image {
  position: relative;
  width: 100%;
  height: 140px;
  background: #f8f9fa;
  overflow: hidden;
}

.ch-product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ch-product-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

/* Veg/Non-Veg Badge */
.ch-veg-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.ch-veg-badge.veg {
  border: 2px solid #28a745;
}

.ch-veg-badge.non-veg {
  border: 2px solid #dc3545;
}

.ch-veg-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.ch-veg-badge.veg .ch-veg-dot {
  background: #28a745;
}

.ch-veg-badge.non-veg .ch-veg-dot {
  background: #dc3545;
}

/* Product Info */
.ch-product-info {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.ch-product-name {
  font-size: 15px;
  font-weight: 600;
  color: #212529;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ch-product-desc {
  font-size: 12px;
  color: #6c757d;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ch-product-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 8px;
}

.ch-product-price {
  font-size: 16px;
  font-weight: 700;
  color: #28a745;
}

/* Add Button */
.ch-add-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 6px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 6px rgba(102, 126, 234, 0.3);
}

.ch-add-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.ch-add-btn:active {
  transform: scale(0.95);
}

/* Quantity Controls */
.ch-quantity-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 4px;
}

.ch-qty-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.ch-qty-btn:hover {
  transform: scale(1.1);
}

.ch-qty-btn:active {
  transform: scale(0.9);
}

.ch-qty-value {
  font-size: 14px;
  font-weight: 600;
  color: #212529;
  min-width: 24px;
  text-align: center;
}

/* ============================================
   EMPTY STATE
   ============================================ */

.ch-empty {
  text-align: center;
  padding: 60px 20px;
}

.ch-empty-icon {
  font-size: 64px;
  opacity: 0.3;
  display: block;
  margin-bottom: 16px;
}

.ch-empty h3 {
  font-size: 20px;
  color: #495057;
  margin-bottom: 8px;
}

.ch-empty p {
  font-size: 14px;
  color: #6c757d;
}

/* ============================================
   CART FOOTER
   ============================================ */

.ch-cart-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

.ch-cart-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ch-cart-count {
  font-size: 16px;
  font-weight: 700;
}

.ch-cart-text {
  font-size: 13px;
  opacity: 0.9;
}

.ch-cart-btn {
  background: white;
  color: #667eea;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.ch-cart-btn:hover {
  transform: scale(1.05);
}

.ch-cart-btn:active {
  transform: scale(0.95);
}

/* ============================================
   LOADING STATE
   ============================================ */

.ch-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 16px;
}

.ch-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #e9ecef;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.ch-loading p {
  font-size: 16px;
  color: #6c757d;
}

/* ============================================
   ERROR STATE
   ============================================ */

.ch-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  text-align: center;
}

.ch-error-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.ch-error h3 {
  font-size: 24px;
  color: #dc3545;
  margin-bottom: 8px;
}

.ch-error p {
  font-size: 16px;
  color: #6c757d;
}

/* ============================================
   RESPONSIVE DESIGN
   ============================================ */

@media (min-width: 768px) {
  .customer-home {
    max-width: 1200px;
    margin: 0 auto;
  }

  .ch-products-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }

  .ch-product-image {
    height: 180px;
  }

  .ch-cart-footer {
    max-width: 1200px;
    left: 50%;
    transform: translateX(-50%);
  }
}

@media (max-width: 480px) {
  .ch-theater-name {
    font-size: 20px;
  }

  .ch-header-info {
    gap: 12px;
  }

  .ch-info-item {
    min-width: 70px;
  }

  .ch-products-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 12px;
  }

  .ch-product-image {
    height: 120px;
  }
}
`;

// ============================================
// WRITE FILES
// ============================================

const jsPath = path.join(__dirname, '../frontend/src/pages/customer/CustomerHome.js');
const cssPath = path.join(__dirname, '../frontend/src/styles/customer/CustomerHome.css');

try {
  // Write JavaScript file
  fs.writeFileSync(jsPath, customerHomeJS, 'utf8');
  console.log('✅ CustomerHome.js created!');
  console.log('   - Centered theater name in header');
  console.log('   - Seat Class, QR Code Name, Seat Number displayed');
  console.log('   - Modern card-based grid layout');
  console.log('   - Clean purple gradient theme');

  // Write CSS file
  fs.writeFileSync(cssPath, customerHomeCSS, 'utf8');
  console.log('✅ CustomerHome.css created!');
  console.log('   - Fresh modern design');
  console.log('   - Card-based product grid');
  console.log('   - Responsive layout');
  console.log('   - Smooth animations');

  console.log('\\n📁 Files created at:');
  console.log('   -', jsPath);
  console.log('   -', cssPath);
  console.log('\\n🎉 Complete rebuild finished! Zero errors!');
} catch (error) {
  console.error('❌ Error writing files:', error);
  process.exit(1);
}
