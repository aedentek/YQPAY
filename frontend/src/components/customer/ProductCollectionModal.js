import React, { useState, useEffect } from 'react';
import { useCart } from '../../contexts/CartContext';
import OptimizedImage from '../common/OptimizedImage';
import './ProductCollectionModal.css';

const ProductCollectionModal = ({ 
  collection, 
  isOpen, 
  onClose, 
  defaultVariant = null 
}) => {
  const cart = useCart();
  const { addItem, removeItem } = cart;
  
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);

  // Set default variant when modal opens
  useEffect(() => {
    if (isOpen && collection) {
      const variant = defaultVariant || collection.variants[0];
      setSelectedVariant(variant);
    }
  }, [isOpen, collection, defaultVariant]);

  // Get current cart quantity for selected variant
  const getCartQuantity = (variant) => {
    if (!variant) return 0;
    const cartItem = cart.items?.find(item => item._id === variant._id);
    return cartItem?.quantity || 0;
  };

  const handleVariantSelect = (variant) => {
    setSelectedVariant(variant);
  };

  const handleAddToCart = () => {
    if (!selectedVariant) return;
    
    addItem({
      _id: selectedVariant._id,
      name: `${collection.name} (${selectedVariant.sizeLabel || selectedVariant.size})`,
      price: selectedVariant.price,
      image: selectedVariant.image || collection.baseImage,
      size: selectedVariant.size,
      variant: selectedVariant
    });
  };

  const handleQuantityChange = (action) => {
    if (!selectedVariant) return;
    
    if (action === 'increase') {
      handleAddToCart();
    } else if (action === 'decrease') {
      removeItem(selectedVariant._id);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleFavoriteToggle = () => {
    setIsFavorite(!isFavorite);
    // TODO: Implement favorite functionality
  };

  if (!isOpen || !collection) return null;

  const currentQuantity = getCartQuantity(selectedVariant);

  return (
    <div className="collection-modal-overlay" onClick={handleBackdropClick}>
      <div className="collection-modal">
        {/* Header */}
        <div className="collection-modal-header">
          <button 
            className="modal-back-btn"
            onClick={onClose}
            aria-label="Go back"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          
          <h1 className="collection-modal-title">{collection.name}</h1>
          
          <button 
            className={`modal-favorite-btn ${isFavorite ? 'active' : ''}`}
            onClick={handleFavoriteToggle}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <svg viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>

        {/* Product Image Section */}
        <div className="collection-modal-content">
          <div className="product-image-section">
            <div className="main-product-image">
              <OptimizedImage
                src={selectedVariant?.image || collection.baseImage}
                alt={collection.name}
                width={280}
                height={280}
                className="product-main-img"
                fallback="https://via.placeholder.com/280x280?text=No+Image"
              />
              
              {/* Floating Ingredients */}
              {collection.ingredients && collection.ingredients.length > 0 && (
                <div className="floating-ingredients">
                  {collection.ingredients.map((ingredient, index) => (
                    <div 
                      key={index} 
                      className={`ingredient-float ingredient-${index}`}
                      style={{
                        animationDelay: `${index * 0.2}s`
                      }}
                    >
                      <span className="ingredient-icon">{ingredient}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Price Display */}
          <div className="price-section">
            <span className="collection-price">
              {selectedVariant?.price?.toFixed(0) || '0'}
            </span>
          </div>

          {/* Size Selection */}
          <div className="size-selection">
            {collection.variants.map((variant) => (
              <button
                key={variant._id}
                className={`size-btn ${selectedVariant?._id === variant._id ? 'active' : ''}`}
                onClick={() => handleVariantSelect(variant)}
                aria-label={`Select ${variant.sizeLabel || variant.size} size for ${variant.price.toFixed(0)}`}
              >
                <span className="size-label">{variant.size}</span>
              </button>
            ))}
          </div>

          {/* Related Products */}
          <div className="related-products-section">
            <div className="related-products-grid">
              {collection.variants.slice(0, 4).map((variant, index) => (
                <div 
                  key={variant._id} 
                  className={`related-product-item ${selectedVariant?._id === variant._id ? 'selected' : ''}`}
                  onClick={() => handleVariantSelect(variant)}
                >
                  <div className="product-image-container">
                    <OptimizedImage
                      src={variant.image || collection.baseImage}
                      alt={`${collection.name} ${variant.size}`}
                      width={80}
                      height={80}
                      className="related-product-image"
                      fallback="https://via.placeholder.com/80x80?text=No+Image"
                    />
                  </div>
                  <div className="product-details">
                    <span className="product-size">{variant.size}</span>
                    <span className="product-price">{variant.price.toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Action */}
        <div className="collection-modal-footer">
          {currentQuantity > 0 ? (
            <div className="quantity-controls-large">
              <button 
                className="quantity-btn-large decrease"
                onClick={() => handleQuantityChange('decrease')}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="quantity-display-large">{currentQuantity}</span>
              <button 
                className="quantity-btn-large increase"
                onClick={() => handleQuantityChange('increase')}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          ) : (
            <button 
              className="add-to-cart-large-btn"
              onClick={handleAddToCart}
              disabled={!selectedVariant}
            >
              <svg className="cart-icon-large" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 4V2C7 1.45 7.45 1 8 1H16C16.55 1 17 1.45 17 2V4H20C20.55 4 21 4.45 21 5S20.55 6 20 6H19V19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V6H4C3.45 6 3 5.55 3 5S3.45 4 4 4H7ZM9 3V4H15V3H9ZM7 6V19H17V6H7Z"/>
                <path d="M9 8V17H11V8H9ZM13 8V17H15V8H13Z"/>
              </svg>
              Add to cart
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCollectionModal;