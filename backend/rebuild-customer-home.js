const fs = require('fs');
const path = require('path');

// CustomerHome.js content
const jsContent = `import React, { useState, useEffect, useCallback } from 'react';
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
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('theaterid');
    const qr = params.get('qrName');
    const sClass = params.get('seatClass');
    
    if (!id) {
      setError('Theater ID required');
      setLoading(false);
      return;
    }
    
    setTheaterId(id);
    setQrName(qr);
    setSeatClass(sClass);
  }, [location.search]);

  const loadTheater = useCallback(async (id) => {
    try {
      const res = await fetch(\`\${config.api.baseUrl}/theaters/\${id}\`);
      const data = await res.json();
      if (data.success && data.data) setTheater(data.data);
    } catch (err) {
      console.error('Theater load error:', err);
    }
  }, []);

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
    return '🍽️';
  };

  useEffect(() => {
    if (theaterId) {
      Promise.all([loadTheater(theaterId), loadProducts(theaterId), loadCategories(theaterId)])
        .finally(() => setLoading(false));
    }
  }, [theaterId, loadTheater, loadProducts, loadCategories]);

  const filteredProducts = products.filter(p => {
    const catMatch = selectedCategory === 'all' || p.categoryName === selectedCategory;
    const searchMatch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return catMatch && searchMatch;
  });

  const handleAdd = (p) => {
    addItem({ id: p._id, name: p.name, price: p.price, image: p.image });
  };

  if (loading) {
    return (
      <div className="swiggy-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="swiggy-error">
        <span>⚠️</span>
        <p>{error}</p>
      </div>
    );
  }

  const totalItems = getTotalItems();

  return (
    <div className="swiggy-home">
      {/* Purple Header */}
      <div className="swiggy-header">
        <div className="header-loc">
          <span className="loc-icon">📍</span>
          <div>
            <h1>{theater?.name || 'Theater'}</h1>
            <p>{theater?.location?.city || 'Location'}</p>
          </div>
        </div>
        {qrName && <div className="qr-badge">🎫 {qrName}</div>}
      </div>

      {/* Search */}
      <div className="swiggy-search">
        <div className="search-box">
          <span>🔍</span>
          <input
            placeholder="Search for dishes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Categories */}
      <div className="swiggy-cats">
        <div className="cats-scroll">
          {categories.map(c => (
            <button
              key={c._id}
              className={\`cat-chip \${selectedCategory === c._id ? 'active' : ''}\`}
              onClick={() => setSelectedCategory(c._id)}
            >
              <span>{c.icon}</span>
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Products */}
      <div className="swiggy-products">
        {filteredProducts.length === 0 ? (
          <div className="empty">
            <span>🍽️</span>
            <h3>No items</h3>
          </div>
        ) : (
          filteredProducts.map(p => {
            const qty = getItemQuantity(p._id);
            const imgUrl = p.image && typeof p.image === 'string'
              ? (p.image.startsWith('http') ? p.image : \`\${config.api.baseUrl}\${p.image}\`)
              : null;

            return (
              <div key={p._id} className="product-card">
                <div className="img-box">
                  {imgUrl ? (
                    <img 
                      src={imgUrl}
                      alt={p.name}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className="img-placeholder" style={{ display: imgUrl ? 'none' : 'flex' }}>
                    🍽️
                  </div>

                  {qty === 0 ? (
                    <button className="add-btn" onClick={() => handleAdd(p)}>
                      ADD
                    </button>
                  ) : (
                    <div className="qty-box">
                      <button onClick={() => removeItem(p._id)}>−</button>
                      <span>{qty}</span>
                      <button onClick={() => handleAdd(p)}>+</button>
                    </div>
                  )}
                </div>

                <div className="info-box">
                  <div className={\`veg-badge \${p.isVeg ? 'veg' : 'non-veg'}\`}>
                    <div className="dot"></div>
                  </div>
                  <h3>{p.name}</h3>
                  <p className="price">₹{p.price}</p>
                  {p.description && <p className="desc">{p.description}</p>}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cart Footer */}
      {totalItems > 0 && (
        <div className="swiggy-footer" onClick={() => navigate(\`/customer/cart?theaterid=\${theaterId}\`)}>
          <div>
            <span>{totalItems} item{totalItems > 1 ? 's' : ''}</span>
            <span>View Cart</span>
          </div>
          <button>VIEW CART →</button>
        </div>
      )}
    </div>
  );
};

export default CustomerHome;
`;

// CustomerHome.css content
const cssContent = `/* SWIGGY-STYLE CUSTOMER HOME - EXACT MATCH */

* { margin: 0; padding: 0; box-sizing: border-box; }

.swiggy-home {
  font-family: 'Poppins', -apple-system, sans-serif;
  background: #f5f5f5;
  min-height: 100vh;
  padding-bottom: 80px;
}

/* HEADER - Purple Gradient */
.swiggy-header {
  background: linear-gradient(180deg, #6B0E9B 0%, #8B1BB3 100%);
  padding: 16px 20px 24px;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-loc {
  display: flex;
  gap: 12px;
  align-items: center;
}

.loc-icon {
  font-size: 24px;
}

.header-loc h1 {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 4px;
}

.header-loc p {
  font-size: 13px;
  opacity: 0.9;
}

.qr-badge {
  background: rgba(255, 255, 255, 0.25);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

/* SEARCH */
.swiggy-search {
  background: white;
  padding: 16px 20px;
  border-bottom: 1px solid #e8e8e8;
}

.search-box {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 10px;
  padding: 12px 16px;
  gap: 10px;
}

.search-box span {
  font-size: 18px;
  opacity: 0.6;
}

.search-box input {
  flex: 1;
  border: none;
  background: none;
  font-size: 15px;
  outline: none;
}

.search-box input::placeholder {
  color: #999;
}

/* CATEGORIES */
.swiggy-cats {
  background: white;
  padding: 16px 0;
  border-bottom: 1px solid #e8e8e8;
  overflow-x: auto;
  scrollbar-width: none;
}

.swiggy-cats::-webkit-scrollbar {
  display: none;
}

.cats-scroll {
  display: flex;
  gap: 8px;
  padding: 0 20px;
}

.cat-chip {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  min-width: 75px;
}

.cat-chip.active {
  background: #6B0E9B;
  border-color: #6B0E9B;
  color: white;
}

.cat-chip span:first-child {
  font-size: 26px;
  filter: grayscale(100%);
}

.cat-chip.active span:first-child {
  filter: none;
}

.cat-chip span:last-child {
  font-size: 12px;
  font-weight: 500;
}

/* PRODUCTS */
.swiggy-products {
  background: white;
}

.product-card {
  display: flex;
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
  gap: 16px;
}

/* Image - LEFT */
.img-box {
  position: relative;
  width: 120px;
  height: 120px;
  flex-shrink: 0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.img-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.img-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  opacity: 0.5;
}

/* ADD Button */
.add-btn {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  color: #6B0E9B;
  border: 1px solid #6B0E9B;
  padding: 8px 24px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.add-btn:hover {
  background: #6B0E9B;
  color: white;
}

/* Quantity Controls */
.qty-box {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border: 1px solid #6B0E9B;
  border-radius: 8px;
  display: flex;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.qty-box button {
  background: white;
  color: #6B0E9B;
  border: none;
  width: 32px;
  height: 32px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qty-box span {
  color: #6B0E9B;
  font-weight: 700;
  font-size: 14px;
  min-width: 30px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Info - RIGHT */
.info-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.veg-badge {
  width: 18px;
  height: 18px;
  border: 1.5px solid;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.veg-badge.veg {
  border-color: #0f8a65;
}

.veg-badge.non-veg {
  border-color: #e43b4f;
}

.veg-badge .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.veg-badge.veg .dot {
  background: #0f8a65;
}

.veg-badge.non-veg .dot {
  background: #e43b4f;
}

.info-box h3 {
  font-size: 16px;
  font-weight: 600;
  color: #282c3f;
  margin: 4px 0;
}

.info-box .price {
  font-size: 16px;
  color: #282c3f;
  margin: 2px 0;
}

.info-box .desc {
  font-size: 13px;
  color: #7e808c;
  line-height: 1.4;
  margin-top: 4px;
}

/* EMPTY STATE */
.empty {
  text-align: center;
  padding: 80px 20px;
}

.empty span {
  font-size: 60px;
  opacity: 0.5;
  display: block;
  margin-bottom: 16px;
}

.empty h3 {
  font-size: 18px;
  color: #282c3f;
}

/* LOADING */
.swiggy-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: white;
  gap: 16px;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f0f0f0;
  border-top-color: #6B0E9B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.swiggy-loading p {
  color: #7e808c;
  font-size: 14px;
}

/* ERROR */
.swiggy-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 16px;
}

.swiggy-error span {
  font-size: 60px;
}

.swiggy-error p {
  color: #7e808c;
  font-size: 14px;
}

/* CART FOOTER */
.swiggy-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #6B0E9B;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
  z-index: 1000;
  cursor: pointer;
}

.swiggy-footer > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.swiggy-footer > div span:first-child {
  color: white;
  font-size: 15px;
  font-weight: 600;
}

.swiggy-footer > div span:last-child {
  color: rgba(255,255,255,0.85);
  font-size: 12px;
}

.swiggy-footer button {
  background: white;
  color: #6B0E9B;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
}

/* RESPONSIVE */
@media (max-width: 600px) {
  .img-box {
    width: 100px;
    height: 100px;
  }
}

@media (min-width: 768px) {
  .swiggy-home {
    max-width: 800px;
    margin: 0 auto;
    box-shadow: 0 0 20px rgba(0,0,0,0.1);
  }
}
`;

// Write files
const jsPath = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'customer', 'CustomerHome.js');
const cssPath = path.join(__dirname, '..', 'frontend', 'src', 'styles', 'customer', 'CustomerHome.css');

fs.writeFileSync(jsPath, jsContent, 'utf8');
fs.writeFileSync(cssPath, cssContent, 'utf8');

console.log('✅ CustomerHome.js created!');
console.log('✅ CustomerHome.css created!');
console.log('📁 Files ready at:');
console.log('  -', jsPath);
console.log('  -', cssPath);
