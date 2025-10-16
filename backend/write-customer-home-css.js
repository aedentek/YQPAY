const fs = require('fs');
const path = require('path');

const cssContent = `/* CUSTOMER HOME - EXACT SWIGGY DESIGN WITH DARK PURPLE THEME */

@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  overflow-x: hidden;
}

.customer-home {
  min-height: 100vh;
  font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f5f5f5;
  padding-bottom: 80px;
}

/* HEADER - Dark Purple Background */
.customer-header {
  background: linear-gradient(180deg, #6B0E9B 0%, #8B1BB3 100%);
  padding: 16px 20px 24px 20px;
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-info {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.info-badge {
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(10px);
  padding: 5px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
}

.theater-name {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

/* SEARCH BAR */
.search-container {
  background: white;
  padding: 16px 20px;
  border-bottom: 1px solid #e8e8e8;
}

.search-bar {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 10px;
  padding: 12px 16px;
  position: relative;
}

.search-bar:focus-within {
  background: white;
  box-shadow: 0 0 0 1px #6B0E9B;
}

.search-icon {
  font-size: 18px;
  margin-right: 10px;
  opacity: 0.6;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 15px;
  outline: none;
  color: #333;
}

.search-input::placeholder {
  color: #999;
}

.clear-search {
  background: none;
  border: none;
  color: #999;
  font-size: 18px;
  cursor: pointer;
}

/* CATEGORIES - Horizontal Scroll */
.categories-section {
  background: white;
  padding: 16px 0;
  border-bottom: 1px solid #e8e8e8;
  overflow-x: auto;
  scrollbar-width: none;
}

.categories-section::-webkit-scrollbar {
  display: none;
}

.categories-scroll {
  display: flex;
  gap: 8px;
  padding: 0 20px;
}

.category-item {
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
  transition: all 0.2s;
  min-width: 75px;
}

.category-item.active {
  background: #6B0E9B;
  border-color: #6B0E9B;
  box-shadow: 0 2px 8px rgba(107, 14, 155, 0.25);
}

.category-icon {
  font-size: 26px;
  filter: grayscale(100%);
}

.category-item.active .category-icon {
  filter: grayscale(0%) brightness(1.2);
}

.category-name {
  font-size: 12px;
  font-weight: 500;
  color: #333;
  text-align: center;
  white-space: nowrap;
}

.category-item.active .category-name {
  color: white;
  font-weight: 600;
}

/* PRODUCTS LIST - Exact Swiggy Layout */
.products-section {
  background: white;
  padding: 0;
}

.products-list {
  display: flex;
  flex-direction: column;
}

.product-item {
  display: flex;
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
  gap: 16px;
  background: white;
}

/* Product Image - Left Side */
.product-image-wrapper {
  position: relative;
  flex-shrink: 0;
  width: 120px;
  height: 120px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.product-image-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  opacity: 0.5;
}

/* Add Button on Image */
.add-overlay-button {
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.add-overlay-button:hover {
  background: #6B0E9B;
  color: white;
}

.add-overlay-button:disabled {
  background: #ccc;
  color: #666;
  border-color: #ccc;
}

/* Quantity Controls on Image */
.quantity-overlay-controls {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border: 1px solid #6B0E9B;
  border-radius: 8px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.qty-overlay-btn {
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

.qty-overlay-display {
  color: #6B0E9B;
  font-weight: 700;
  font-size: 14px;
  min-width: 30px;
  text-align: center;
}

/* Product Info - Right Side */
.product-info-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

/* Veg/Non-Veg Badge */
.veg-badge {
  width: 18px;
  height: 18px;
  border: 1.5px solid;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: flex-start;
}

.veg-badge.veg {
  border-color: #0f8a65;
}

.veg-badge.non-veg {
  border-color: #e43b4f;
}

.veg-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.veg-dot.veg {
  background: #0f8a65;
}

.veg-dot.non-veg {
  background: #e43b4f;
}

.product-title {
  font-size: 16px;
  font-weight: 600;
  color: #282c3f;
  line-height: 1.3;
  margin: 4px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-price-tag {
  font-size: 16px;
  font-weight: 400;
  color: #282c3f;
  margin: 2px 0;
}

.product-desc {
  font-size: 13px;
  color: #7e808c;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-top: 4px;
}

/* NO PRODUCTS STATE */
.no-products {
  text-align: center;
  padding: 80px 20px;
  color: #7e808c;
}

.no-products-icon {
  font-size: 60px;
  opacity: 0.5;
  display: block;
  margin-bottom: 16px;
}

.no-products h3 {
  font-size: 18px;
  font-weight: 600;
  color: #282c3f;
  margin-bottom: 8px;
}

.no-products p {
  font-size: 14px;
}

/* LOADING STATE */
.customer-home.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: white;
}

.loading-container {
  text-align: center;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f0f0f0;
  border-top-color: #6B0E9B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-container p {
  color: #7e808c;
  font-size: 14px;
}

/* ERROR STATE */
.customer-home.error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.error-message {
  text-align: center;
}

.error-icon {
  font-size: 60px;
  display: block;
  margin-bottom: 16px;
}

.error-message h2 {
  font-size: 20px;
  font-weight: 600;
  color: #282c3f;
  margin-bottom: 8px;
}

.error-message p {
  font-size: 14px;
  color: #7e808c;
  margin-bottom: 24px;
}

.error-message button {
  background: #6B0E9B;
  color: white;
  border: none;
  padding: 12px 32px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

/* CART FOOTER - Sticky Bottom */
.cart-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #6B0E9B;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  cursor: pointer;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.cart-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cart-count {
  color: white;
  font-size: 15px;
  font-weight: 600;
}

.cart-label {
  color: rgba(255, 255, 255, 0.85);
  font-size: 12px;
}

.view-cart-btn {
  background: white;
  color: #6B0E9B;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* RESPONSIVE */
@media (max-width: 600px) {
  .product-image-wrapper {
    width: 100px;
    height: 100px;
  }
}

@media (min-width: 768px) {
  .customer-home {
    max-width: 800px;
    margin: 0 auto;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
  }
}
`;

const cssPath = path.join(__dirname, '..', 'frontend', 'src', 'styles', 'customer', 'CustomerHome.css');
fs.writeFileSync(cssPath, cssContent, 'utf8');
console.log('✅ CustomerHome.css created successfully!');
console.log('📁 Path:', cssPath);
