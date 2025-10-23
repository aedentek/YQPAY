import React, { useState, useEffect } from 'react';
import { useCart } from '../../contexts/CartContext';
import { useNavigate, useLocation } from 'react-router-dom';
import './ProductCollectionModal.css';

const ProductCollectionModal = ({ collection, isOpen, onClose }) => {
  const { addItem, getItemQuantity } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    if (isOpen && collection?.variants?.length > 0) {
      setSelectedVariant(collection.variants[0]);
      setSelectedImage(collection.variants[0].image || collection.baseImage);
      
      // Preload all variant images for instant switching
      collection.variants.forEach(variant => {
        if (variant.image) {
          const img = new Image();
          img.src = variant.image;
        }
      });
    }
  }, [isOpen, collection]);

  const handleAddToCart = () => {
    if (!selectedVariant) return;
    addItem({
      _id: selectedVariant._id,
      name: `${collection.name} - ${selectedVariant.sizeLabel || selectedVariant.size}`,
      price: selectedVariant.price,
      image: selectedVariant.image || collection.baseImage,
      size: selectedVariant.size
    });
  };

  const handleNavigation = (path) => {
    const params = new URLSearchParams(location.search);
    navigate(`${path}?${params.toString()}`);
  };

  if (!isOpen || !collection) return null;

  const handleVariantClick = (variant) => {
    setSelectedVariant(variant);
    setSelectedImage(variant.image || collection.baseImage);
  };

  const getCircularPosition = (index, total) => {
    const radius = 160;
    const startAngle = 180; // Start from left side
    const angleStep = 180 / (total - 1); // Spread across top half (180 degrees)
    const angle = (startAngle + (angleStep * index)) * (Math.PI / 180);
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  };

  return (
    <div className="circular-modal-overlay" onClick={onClose}>
      <div className="circular-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top-bar">
          <button className="menu-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="modal-main-content">
          
          {/* Product Name - Top of Image */}
          <div className="product-name-display">
            <h2>{collection.name}</h2>
          </div>

          {/* Center Product Image */}
          <div className="center-product-image" key={selectedImage || collection.baseImage}>
            <img 
              src={selectedImage || collection.baseImage} 
              alt={collection.name}
              loading="eager"
              fetchpriority="high"
              onError={(e) => { 
                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300"%3E%3Crect fill="%23f0f0f0" width="300" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-size="80"%3E🍿%3C/text%3E%3C/svg%3E'; 
              }}
            />
          </div>

          {/* Product Quantity - Bottom of Image */}
          {selectedVariant && (
            <div className="selected-product-quantity">
              <span className="quantity-label">{selectedVariant.quantity || selectedVariant.sizeLabel || selectedVariant.size}</span>
            </div>
          )}

          <div className="circular-menu-right">
            {collection.variants?.map((variant, index) => {
              const pos = getCircularPosition(index, collection.variants.length);
              const isSelected = selectedVariant?._id === variant._id;
              const quantity = getItemQuantity(variant._id);
              return (
                <button 
                  key={variant._id} 
                  className={`circular-variant-item ${isSelected ? 'selected' : ''}`}
                  style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
                  onClick={() => handleVariantClick(variant)}
                >
                  <div className="variant-image-circle">
                    <img 
                      src={variant.image || collection.baseImage} 
                      alt={variant.sizeLabel || variant.size}
                      onError={(e) => { 
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="60" height="60"%3E%3Crect fill="%23ddd" width="60" height="60"/%3E%3C/svg%3E'; 
                      }}
                    />
                    {quantity > 0 && (
                      <div className="variant-quantity-badge">{quantity}</div>
                    )}
                  </div>
                  <span className="variant-label">{variant.sizeLabel || variant.size}</span>
                </button>
              );
            })}
          </div>

          {/* Add to Cart Button - Bottom Center */}
          <button className="bottom-add-to-cart-btn" onClick={handleAddToCart}>
            <span className="btn-icon">+</span>
            Add to Cart
          </button>

        </div>
        <div className="background-blur-image">
          <img 
            src={selectedImage || collection.baseImage} 
            alt="background" 
            onError={(e) => { 
              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="800"%3E%3Crect fill="%23333" width="600" height="800"/%3E%3C/svg%3E'; 
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProductCollectionModal;
