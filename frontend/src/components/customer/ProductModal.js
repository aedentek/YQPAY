import React from 'react';
import './ProductModal.css';

const ProductModal = ({ product, isOpen, onClose, onAddToCart, cartQuantity = 0 }) => {
  if (!isOpen || !product) return null;

  const handleAddToCart = () => {
    onAddToCart(product);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="product-modal-overlay" onClick={handleBackdropClick}>
      <div className="product-modal">
        <div className="product-modal-header">
          <button 
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close product details"
          >
            ×
          </button>
        </div>

        <div className="product-modal-content">
          <div className="product-modal-image">
            {product.image ? (
              <img 
                src={product.image.startsWith('http') 
                  ? product.image 
                  : `${process.env.REACT_APP_API_URL || 'http://192.168.1.7:5000/api'}${product.image}`
                } 
                alt={product.name}
                onError={(e) => { 
                  e.target.src = 'https://via.placeholder.com/300x300?text=No+Image';
                }}
              />
            ) : (
              <div className="product-modal-placeholder">
                <span>🍽️</span>
              </div>
            )}
          </div>

          <div className="product-modal-details">
            <h2 className="product-modal-title">{product.name}</h2>
            
            <div className="product-modal-price">
              ₹{product.price}
            </div>

            <div className="product-modal-description">
              <p>{product.description || 'Delicious item from our menu. Perfect for your movie experience!'}</p>
            </div>

            <div className="product-modal-features">
              <div className="product-features-grid">
                <div className="feature-item">
                  <span className="feature-icon">⭐</span>
                  <span className="feature-text">4.2 Rating</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🕒</span>
                  <span className="feature-text">5-10 mins</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🥬</span>
                  <span className="feature-text">Fresh</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🌶️</span>
                  <span className="feature-text">{product.spiceLevel || 'Mild'}</span>
                </div>
              </div>
            </div>

            <div className="product-modal-actions">
              {cartQuantity > 0 ? (
                <div className="quantity-controls-modal">
                  <button 
                    className="quantity-btn-modal minus"
                    onClick={() => {/* Handle decrease */}}
                  >
                    −
                  </button>
                  <span className="quantity-display-modal">{cartQuantity}</span>
                  <button 
                    className="quantity-btn-modal plus"
                    onClick={handleAddToCart}
                  >
                    +
                  </button>
                </div>
              ) : (
                <button 
                  className="add-to-cart-modal-btn"
                  onClick={handleAddToCart}
                >
                  Add to Cart - ₹{product.price}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;