import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import TheaterLayout from '../../components/theater/TheaterLayout';
import ErrorBoundary from '../../components/ErrorBoundary';
import { usePerformanceMonitoring } from '../../hooks/usePerformanceMonitoring';
import { getAuthToken, autoLogin } from '../../utils/authHelper';
import ImageUpload from '../../components/ImageUpload';
import config from '../../config';
import '../../styles/TheaterList.css';
import '../../styles/Dashboard.css';
import '../../styles/ImageUpload.css';
import '../../styles/TheaterOrderInterface.css';

// Modern POS Product Card Component - Click to Add
const StaffProductCard = React.memo(({ product, onAddToCart, currentOrder }) => {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(price);
  };

  // Get current quantity in cart
  const getQuantityInCart = () => {
    const orderItem = currentOrder.find(item => item._id === product._id);
    return orderItem ? orderItem.quantity : 0;
  };

  const quantityInCart = getQuantityInCart();

  // Handle card click - add one item to cart
  const handleCardClick = () => {
    if (!isOutOfStock) {
      onAddToCart(product, quantityInCart + 1);
    }
  };

  // Check stock using array structure fields
  const currentStock = product.inventory?.currentStock ?? product.stockQuantity ?? 0;
  const isOutOfStock = currentStock <= 0 || !product.isActive || !product.isAvailable;

  // Get price from array structure and calculate discount
  const originalPrice = product.pricing?.basePrice ?? product.sellingPrice ?? 0;
  const discountPercentage = parseFloat(product.discountPercentage || product.pricing?.discountPercentage) || 0;
  const productPrice = discountPercentage > 0 
    ? originalPrice * (1 - discountPercentage / 100)
    : originalPrice;
  const hasDiscount = discountPercentage > 0;

  // Get product image
  const getProductImage = () => {
    let imageUrl = null;
    
    // New format: images array (array structure)
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      const firstImage = product.images[0];
      imageUrl = typeof firstImage === 'string' ? firstImage : firstImage?.url;
    }
    // Old format: productImage string
    else if (product.productImage) {
      imageUrl = product.productImage;
    }
    
    return imageUrl;
  };

  const imageUrl = getProductImage();

  return (
    <div className="modern-product-card-wrapper">
      <div 
        className={`modern-product-card ${isOutOfStock ? 'out-of-stock' : ''}`}
        onClick={handleCardClick}
      >
        {/* Product Image */}
        <div className="modern-product-image">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={product.name || 'Product'}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : (
            <div className="modern-product-placeholder">
              <span className="placeholder-icon">🍽️</span>
            </div>
          )}
          <div className="modern-product-placeholder" style={{ display: imageUrl ? 'none' : 'flex' }}>
            <span className="placeholder-icon">🍽️</span>
          </div>
        </div>

        {/* Product Info Overlay */}
        <div className="modern-product-overlay">
          <div className="modern-product-details">
            <div className="modern-product-detail-item">
              {/* <span className="detail-label">Price</span> */}
              {hasDiscount ? (
                <div className="price-with-discount">
                  <span className="detail-value original-price">{formatPrice(originalPrice)}</span>
                  <span className="detail-value discounted-price">{formatPrice(productPrice)}</span>
                  <span className="discount-badge">{discountPercentage}% OFF</span>
                </div>
              ) : (
                <span className="detail-value">{formatPrice(productPrice)}</span>
              )}
            </div>
            <div className="modern-product-detail-item">
              {/* <span className="detail-label">Quantity</span> */}
              <span className="detail-value">{quantityInCart > 0 ? String(quantityInCart).padStart(2, '0') : '01'}</span>
            </div>
          </div>
        </div>

        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="modern-out-of-stock-overlay">
            <span className="out-of-stock-text">OUT OF STOCK</span>
          </div>
        )}

        {/* Quantity Badge */}
        {quantityInCart > 0 && !isOutOfStock && (
          <div className="modern-quantity-badge">
            {quantityInCart}
          </div>
        )}
      </div>
      
      {/* Product Name - Outside Card */}
      <div className="modern-product-name-section">
        <h3 className="modern-product-name">{product.name || 'Unknown Product'}</h3>
      </div>
    </div>
  );
});

StaffProductCard.displayName = 'StaffProductCard';

// Staff Order Item Component - Professional order management
const StaffOrderItem = React.memo(({ item, onUpdateQuantity, onRemove }) => {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(price);
  };

  const sellingPrice = parseFloat(item.sellingPrice) || 0;
  const quantity = parseInt(item.quantity) || 0;
  const itemTotal = sellingPrice * quantity;

  return (
    <div className="pos-order-item">
      <div className="pos-item-content">
        <div className="pos-item-name">{item.name || 'Unknown Item'}</div>
        <div className="pos-item-price">₹{sellingPrice.toFixed(2)}</div>
        
        <div className="pos-quantity-controls">
          <button 
            className="pos-qty-btn pos-qty-minus"
            onClick={() => onUpdateQuantity(item._id, Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
          >
            −
          </button>
          <span className="pos-qty-display">{quantity}</span>
          <button 
            className="pos-qty-btn pos-qty-plus"
            onClick={() => onUpdateQuantity(item._id, quantity + 1)}
          >
            +
          </button>
        </div>
        
        <div className="pos-item-total">₹{itemTotal.toFixed(2)}</div>
        <button 
          className="pos-remove-btn"
          onClick={() => onRemove(item._id)}
          title="Remove"
        >
          ×
        </button>
      </div>
    </div>
  );
});

StaffOrderItem.displayName = 'StaffOrderItem';

// Main Theater Staff Ordering Interface - Canteen Staff Use Only
const TheaterOrderInterface = () => {
  const { theaterId: routeTheaterId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Reliable theaterId extraction
  const urlMatch = window.location.pathname.match(/\/theater-order\/([^/]+)/);
  const theaterId = routeTheaterId || (urlMatch ? urlMatch[1] : null);
  
  // IMMEDIATE CLEANUP - Remove any lingering UI elements from other pages
  useEffect(() => {
    const cleanup = () => {
      // Remove any stat containers that might be lingering
      const statsContainers = document.querySelectorAll('.qr-stats, .theater-stats, .product-stats, .stat-card');
      statsContainers.forEach(container => {
        if (container && container.parentNode) {
          container.style.display = 'none';
          container.remove();
        }
      });
      
      // Remove any floating/positioned elements
      const floatingElements = document.querySelectorAll('[style*="position: fixed"], [style*="position: absolute"][style*="z-index"]');
      floatingElements.forEach(element => {
        if (element.className.includes('stat') || element.className.includes('count')) {
          element.style.display = 'none';
        }
      });
    };
    
    cleanup();
    // Run cleanup again after a short delay to catch any delayed renders
    setTimeout(cleanup, 100);
    
    return cleanup;
  }, []);
  

  
  // State for staff ordering interface
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryMapping, setCategoryMapping] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Persistent cart state - Load from localStorage
  const [currentOrder, setCurrentOrder] = useState(() => {
    try {
      const savedCart = localStorage.getItem(`theater_pos_cart_${theaterId}`);
      if (savedCart) {
        const cartItems = JSON.parse(savedCart);
        console.log('🛒 Loaded saved cart:', cartItems);
        return Array.isArray(cartItems) ? cartItems : [];
      }
    } catch (error) {
      console.error('Error loading saved cart:', error);
    }
    return [];
  });
  
  const [customerName, setCustomerName] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderImages, setOrderImages] = useState([]);
  const isMountedRef = useRef(true);
  
  // Performance monitoring
  usePerformanceMonitoring('TheaterOrderInterface');

  // CLEANUP FUNCTION - Clear any persistent state/CSS issues
  useEffect(() => {
    // Clear any existing overlays or persistent elements
    const existingOverlays = document.querySelectorAll('.qr-stats, .theater-stats, .product-stats');
    existingOverlays.forEach(overlay => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    });
    
    // Clear any sticky positioning issues
    document.body.style.position = '';
    document.body.style.overflow = '';
    
    // Reset any global CSS classes that might interfere
    document.body.classList.remove('modal-open', 'no-scroll');
    
    return () => {
      // Cleanup on unmount
      isMountedRef.current = false;
    };
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (theaterId && currentOrder.length >= 0) {
      try {
        localStorage.setItem(`theater_pos_cart_${theaterId}`, JSON.stringify(currentOrder));
        console.log('💾 Cart saved to localStorage:', currentOrder);
      } catch (error) {
        console.error('Error saving cart to localStorage:', error);
      }
    }
  }, [currentOrder, theaterId]);

  // Restore cart data when coming back from ViewCart (Edit Order functionality)
  useEffect(() => {
    if (location.state) {
      
      // Handle order success (clear cart and show message)
      if (location.state.orderSuccess) {
        setCurrentOrder([]);
        setCustomerName('');
        setOrderNotes('');
        
        if (location.state.orderNumber) {
          console.log(`🎉 Order ${location.state.orderNumber} completed successfully`);
        }
      }
      // Handle cart restoration (Edit Order functionality)
      else if (location.state.cartItems) {
        setCurrentOrder(location.state.cartItems || []);
        setCustomerName(location.state.customerName || '');
      }
      
      // Clear the location state to prevent re-processing on re-renders
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [location.state]);

  // Refs for performance and cleanup
  // Removed abortController as it was causing "signal aborted" errors

  // Staff order management functions
  const addToOrder = useCallback((product, quantity = 1) => {
    setCurrentOrder(prevOrder => {
      const existingItem = prevOrder.find(item => item._id === product._id);
      
      if (quantity <= 0) {
        // Remove item if quantity is 0 or less
        return prevOrder.filter(item => item._id !== product._id);
      }
      
      if (existingItem) {
        // Update existing item with new quantity
        return prevOrder.map(item => 
          item._id === product._id 
            ? { ...item, quantity: quantity }
            : item
        );
      } else {
        // Add new item with specified quantity
        // Extract price from array structure (pricing.basePrice) or old structure (sellingPrice)
        const originalPrice = product.pricing?.basePrice ?? product.sellingPrice ?? 0;
        const discountPercentage = parseFloat(product.discountPercentage || product.pricing?.discountPercentage) || 0;
        const sellingPrice = discountPercentage > 0 
          ? originalPrice * (1 - discountPercentage / 100)
          : originalPrice;
        
        // Extract tax information
        const taxRate = parseFloat(product.pricing?.taxRate ?? product.taxRate) || 0;
        const gstType = product.gstType || 'EXCLUDE';
        
        return [...prevOrder, { 
          ...product, 
          quantity: quantity,
          sellingPrice: sellingPrice, // Use discounted price
          originalPrice: originalPrice, // Keep original for reference
          discountPercentage: discountPercentage,
          taxRate: taxRate, // Ensure tax rate is available
          gstType: gstType // Ensure GST type is available
        }];
      }
    });
  }, []);

  const updateQuantity = useCallback((productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromOrder(productId);
      return;
    }
    setCurrentOrder(prevOrder => 
      prevOrder.map(item => 
        item._id === productId 
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  }, []);

  const removeFromOrder = useCallback((productId) => {
    setCurrentOrder(prevOrder => 
      prevOrder.filter(item => item._id !== productId)
    );
  }, []);

  const clearOrder = useCallback(() => {
    setCurrentOrder([]);
    setCustomerName('');
    setOrderNotes('');
    setOrderImages([]);
    
    // Also clear from localStorage
    if (theaterId) {
      try {
        localStorage.removeItem(`theater_pos_cart_${theaterId}`);
        console.log('🗑️ Cart cleared from localStorage');
      } catch (error) {
        console.error('Error clearing cart from localStorage:', error);
      }
    }
  }, [theaterId]);

  // Image handling functions
  const handleImageUpload = useCallback((imageData) => {
    setOrderImages(prev => [...prev, imageData]);
  }, []);

  const handleImageRemove = useCallback((index, imageData) => {
    setOrderImages(prev => prev.filter((_, i) => i !== index));
    
    // Clean up blob URL if it exists
    if (imageData.previewUrl && imageData.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imageData.previewUrl);
    }
  }, []);

  // Load categories from theater-categories API
  const loadCategories = useCallback(async () => {
    try {
      let authToken = getAuthToken();
      if (!authToken) {
        authToken = await autoLogin();
        if (!authToken) {
          return;
        }
      }

      const categoriesResponse = await fetch(`${config.api.baseUrl}/theater-categories/${theaterId}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        
        if (categoriesData.success && categoriesData.data) {
          // The API returns data.categories array, not data directly
          const categoryList = categoriesData.data.categories || categoriesData.data;
          const activeCategories = categoryList.filter(cat => cat.isActive);
          
          // Store both category names for display and full category objects for filtering
          // API returns categoryName field, not name
          const categoryNames = activeCategories.map(cat => cat.categoryName || cat.name);
          
          console.log('🏷️ ORDER INTERFACE: Categories loaded:', categoryNames);
          console.log('🏷️ ORDER INTERFACE: Category objects:', activeCategories);
          
          const mapping = activeCategories.reduce((map, cat) => {
            const catName = cat.categoryName || cat.name;
            map[catName] = cat._id;
            return map;
          }, {});
          
          
          setCategories(categoryNames);
          setCategoryMapping(mapping);
          
          // Debug: Check products after categories are loaded
          setTimeout(() => {
            console.log('🕐 DELAYED CHECK - Current products:', products.length);
            console.log('🕐 DELAYED CHECK - Current categories:', categoryNames);
            console.log('🕐 DELAYED CHECK - Current mapping:', mapping);
            
            if (products.length > 0) {
              console.log('🔍 PRODUCT-CATEGORY ANALYSIS:');
              products.forEach(product => {
                console.log(`Product: "${product.name}"`);
                console.log(`  - Category field: "${product.category}"`);
                console.log(`  - Category type: ${typeof product.category}`);
                console.log(`  - Matches any category name: ${categoryNames.includes(product.category)}`);
                console.log(`  - Matches any category ID: ${Object.values(mapping).includes(product.category)}`);
                console.log('---');
              });
            }
          }, 1000);
        }
      } else {
        console.log('❌ Categories API failed:', categoriesResponse.status);
      }
    } catch (error) {
      console.error('❌ Failed to load categories:', error);
    }
  }, [theaterId]);

  const fetchProducts = useCallback(async () => {
    
    if (!theaterId) {
      setError('Theater ID not available');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Check for auth token, auto-login if needed
      let authToken = getAuthToken();
      if (!authToken) {
        authToken = await autoLogin();
        if (!authToken) {
          throw new Error('Authentication failed - unable to login');
        }
      }
      
      // Mirror the exact pattern from TheaterProductList and TheaterCategories
      const params = new URLSearchParams({
        page: 1,
        limit: 100, // API max limit is 100
        _cacheBuster: Date.now(),
        _random: Math.random()
      });

      const baseUrl = `${config.api.baseUrl}/theater-products/${theaterId}?${params.toString()}`;
      
      
      const response = await fetch(baseUrl, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

           
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Process response data - mirror the working components' logic
      let theaterProducts = [];
      
      if (data.success) {
        // Handle both API response formats (same as Product Management page)
        const allProducts = Array.isArray(data.data) ? data.data : (data.data?.products || []);
        theaterProducts = allProducts; // Show all products, but inactive ones will appear as "Out of Stock"
        
        console.log('🍿 ORDER INTERFACE: Total products:', allProducts.length);
        console.log('🍿 ORDER INTERFACE: Products to show:', theaterProducts.length);
        console.log('🍿 ORDER INTERFACE: Sample product data:', {
          name: allProducts[0]?.name,
          isActive: allProducts[0]?.isActive,
          isAvailable: allProducts[0]?.isAvailable,
          stock: allProducts[0]?.inventory?.currentStock ?? allProducts[0]?.stockQuantity,
          price: allProducts[0]?.pricing?.basePrice ?? allProducts[0]?.sellingPrice
        });
      } else {
        console.error('🍿 ORDER INTERFACE: API returned success: false', data);
        throw new Error(data.message || 'Failed to load products');
      }
      
      console.log('📦 SETTING PRODUCTS: isMounted:', isMountedRef.current);
      console.log('📦 PRODUCTS TO SET:', theaterProducts);
      console.log('📦 SAMPLE PRODUCT:', theaterProducts[0]);
      
      // Ensure products is always an array with safe objects
      const safeProducts = Array.isArray(theaterProducts) ? theaterProducts.map((product, index) => {
        let assignedCategory = product.category;
        
        // If no category assigned, assign based on product name as a temporary fix
        if (!assignedCategory || assignedCategory === 'Other' || assignedCategory === '') {
          // Simple category assignment logic based on product name
          const name = (product.name || '').toLowerCase();
          if (name.includes('grain') || name.includes('cereal') || name.includes('snack')) {
            assignedCategory = 'Snacks'; // Will be converted to ObjectId later
          } else if (name.includes('test') && name.includes('product')) {
            assignedCategory = 'Beverages1'; // Will be converted to ObjectId later  
          } else if (name.includes('test911')) {
            assignedCategory = 'Drinks'; // Will be converted to ObjectId later
          } else {
            // Distribute evenly if we can't determine from name
            const categories = ['Snacks', 'Drinks', 'Beverages1'];
            assignedCategory = categories[index % categories.length];
          }
          console.log(`🔧 ASSIGNED CATEGORY: "${product.name}" → "${assignedCategory}"`);
        }
        
        return {
          ...product,
          _id: product._id || `product-${Math.random()}`,
          name: product.name || 'Unknown Product',
          sellingPrice: parseFloat(product.sellingPrice) || 0,
          stockQuantity: parseInt(product.stockQuantity) || 0,
          category: assignedCategory
        };
      }) : [];
      
      setProducts(safeProducts);
      console.log('✅ ORDER INTERFACE: Safe products set in state:', safeProducts.length);
      console.log('🏷️ PRODUCTS WITH CATEGORIES:', safeProducts.map(p => ({
        name: p.name,
        category: p.category,
        originalCategory: theaterProducts.find(op => op._id === p._id)?.category
      })));
      
      // Check if products have null/undefined categories
      const productsWithoutCategory = safeProducts.filter(p => !p.category || p.category === 'Other');
      
      // Load categories separately
      await loadCategories();
      
    } catch (err) {
      setError(err.message || 'Failed to load menu');
      setProducts([]);
    } finally {
      console.log('🏁 FINALLY BLOCK: isMounted:', isMountedRef.current);
      setLoading(false);
      console.log('🏁 ORDER INTERFACE: Loading set to false (forced)');
    }
  }, [theaterId]);

  // Load initial data - simplified without abort controller
  useEffect(() => {
    console.log('🔥 USE EFFECT TRIGGERED! Theater ID:', theaterId);
    
    // FORCE STATE CLEANUP on component mount
    setProducts([]);
    setCategories([]);
    setCategoryMapping({});
    setSelectedCategory('all');
    setSearchTerm('');
    setError('');
    
    if (theaterId) {
      // Add a small delay to prevent rate limiting
      const timer = setTimeout(() => {
        fetchProducts();
      }, 100);
      
      return () => {
        clearTimeout(timer);
        isMountedRef.current = false;
      };
    }
    
    return () => {
      isMountedRef.current = false;
    };
  }, [theaterId, fetchProducts]);

  // Calculate order totals with dynamic GST
  const orderTotals = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;
    
    currentOrder.forEach(item => {
      const price = parseFloat(item.sellingPrice) || 0;
      const qty = parseInt(item.quantity) || 0;
      const taxRate = parseFloat(item.taxRate) || 0;
      const gstType = item.gstType || 'EXCLUDE';
      
      const lineTotal = price * qty;
  
      
      if (gstType === 'INCLUDE') {
        // Price already includes GST, extract the GST amount
        const basePrice = lineTotal / (1 + (taxRate / 100));
        const gstAmount = lineTotal - basePrice;
        subtotal += basePrice;
        totalTax += gstAmount;
      } else {
        // GST EXCLUDE - add GST on top of price
        const gstAmount = lineTotal * (taxRate / 100);
        subtotal += lineTotal;
        totalTax += gstAmount;
      }
    });
    
    const total = subtotal + totalTax;
    
    return { 
      subtotal: parseFloat(subtotal.toFixed(2)), 
      tax: parseFloat(totalTax.toFixed(2)), 
      total: parseFloat(total.toFixed(2)) 
    };
  }, [currentOrder]);

  // Filter products by category and search
  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    // Filter by category
    if (selectedCategory && selectedCategory !== 'all') {
      const categoryId = categoryMapping[selectedCategory];
      
      filtered = filtered.filter(product => {
        // Products use categoryId field (ObjectId) - need to match with category _id
        const productCategoryId = product.categoryId || product.category || '';
        
        // Convert to string for comparison
        const categoryIdStr = String(productCategoryId);
        const selectedCategoryIdStr = String(categoryId);
        
        // Match by category ID
        const match = categoryIdStr === selectedCategoryIdStr;
        
        console.log(`Product "${product.name}": categoryId="${categoryIdStr}" vs selected="${selectedCategoryIdStr}" => ${match ? '✅' : '❌'}`);
        
        return match;
      });
    }
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        (product.name || '').toLowerCase().includes(searchLower) ||
        (product.description || '').toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [products, selectedCategory, searchTerm, categories, categoryMapping]);

  // Navigate to View Cart page with order data
  const processOrder = useCallback(() => {
    alert('🚀 PROCESS ORDER BUTTON CLICKED! Testing navigation...');
    


    if (!currentOrder.length) {
      alert('Please add items to order');
      return;
    }

    // Prepare cart data to pass to ViewCart page
    const cartData = {
      items: currentOrder,
      customerName: 'Walk-in Customer', // Default customer name
      notes: orderNotes.trim(),
      images: orderImages,
      subtotal: orderTotals.subtotal,
      tax: orderTotals.tax,
      total: orderTotals.total,
      theaterId
    };


    try {
      // Store cart data in sessionStorage for navigation
      sessionStorage.setItem('cartData', JSON.stringify(cartData));
      
      // Try React Router navigation first
      if (navigate && typeof navigate === 'function') {
        navigate(`/view-cart/${theaterId}`, { 
          state: cartData 
        });
      } else {
        // Fallback to window.location
        window.location.href = `/view-cart/${theaterId}`;
      }
    } catch (error) {
      alert('Navigation failed: ' + error.message);
      // Final fallback
      window.location.href = `/view-cart/${theaterId}`;
    }
  }, [currentOrder, customerName, orderNotes, orderImages, orderTotals, theaterId, navigate]);

  // Loading and error states
  
  if (loading) {
    return (
      <TheaterLayout pageTitle="Staff Order Interface">
        <div className="staff-loading-container">
          <div className="loading-spinner-large"></div>
          <div className="loading-text">Loading menu items...</div>
        </div>
      </TheaterLayout>
    );
  }

  if (error) {
    const handleManualTokenSet = () => {
      const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZDkzNTdiYWE4YmMyYjYxMDFlMjk3YyIsInVzZXJUeXBlIjoidGhlYXRlcl91c2VyIiwidGhlYXRlciI6IjY4ZDM3ZWE2NzY3NTJiODM5OTUyYWY4MSIsInRoZWF0ZXJJZCI6IjY4ZDM3ZWE2NzY3NTJiODM5OTUyYWY4MSIsInBlcm1pc3Npb25zIjpbXSwiaWF0IjoxNzU5MTE4MzM0LCJleHAiOjE3NTkyMDQ3MzR9.gvOS5xxIlcOlgSx6D_xDH3Z_alrqdp5uMtMLOVWIEJs";
      localStorage.setItem('authToken', token);
      window.location.reload();
    };

    return (
      <TheaterLayout pageTitle="Staff Order Interface">
        <ErrorBoundary>
          <div className="staff-error-container">
            <div className="error-icon">❌</div>
            <h3>Unable to Load Menu</h3>
            <p>{error}</p>
            <div style={{ marginTop: '20px' }}>
              <button 
                className="retry-button"
                onClick={() => window.location.reload()}
                style={{ marginRight: '10px' }}
              >
                Retry
              </button>
              <button 
                className="retry-button"
                onClick={handleManualTokenSet}
                style={{ backgroundColor: '#8B5CF6' }}
              >
                Set Demo Token
              </button>
            </div>
          </div>
        </ErrorBoundary>
      </TheaterLayout>
    );
  }

  return (
    <TheaterLayout pageTitle="Professional POS System">
      <div className="professional-pos-content" style={{
        position: 'relative',
        zIndex: 1,
        backgroundColor: '#ffffff',
        minHeight: '100vh',
        overflow: 'hidden'
      }}>
        {/* CSS Reset and Isolation */}
        <style jsx>{`
          .professional-pos-content * {
            box-sizing: border-box;
          }
          .professional-pos-content .qr-stats,
          .professional-pos-content .theater-stats,
          .professional-pos-content .product-stats {
            display: none !important;
          }
          .professional-pos-content {
            isolation: isolate;
          }
        `}</style>
        
        {/* Main POS Layout */}
        <div className="pos-main-container">
          {/* Left Side - Product Menu */}
          <div className="pos-menu-section">
            {/* Category Tabs - POS Style */}
            <div className="pos-category-tabs" style={{backgroundColor: '#6B0E9B', background: '#6B0E9B'}}>
              <button 
                className={`pos-tab ${selectedCategory === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('all')}
                style={selectedCategory === 'all' ? {backgroundColor: 'white', color: '#6B0E9B'} : {color: 'white'}}
              >
                ALL ITEMS ({products.length})
              </button>
              {categories.length > 0 ? (
                categories.map((category, index) => (
                  <button
                    key={category || `category-${index}`}
                    className={`pos-tab ${selectedCategory === category ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(category)}
                    style={selectedCategory === category ? {backgroundColor: 'white', color: '#6B0E9B'} : {color: 'white'}}
                  >
                    {(category || 'CATEGORY').toUpperCase()}
                  </button>
                ))
              ) : (
                <button className="pos-tab" disabled style={{color: 'white'}}>
                  Loading Categories...
                </button>
              )}
            </div>

            {/* Products Grid - Professional POS Style */}
            <div className="pos-products-grid">
              {filteredProducts.length === 0 ? (
                <div className="pos-no-products">
                  <div className="no-products-icon">🍽️</div>
                  <h3>No Items Available</h3>
                  <p>No items found in this category.</p>
                </div>
              ) : (
                filteredProducts.map((product, index) => (
                  <StaffProductCard
                    key={product._id || `product-${index}`}
                    product={product}
                    onAddToCart={addToOrder}
                    currentOrder={currentOrder}
                  />
                ))
              )}
            </div>
          </div>

          {/* Right Side - Order Panel - POS Style */}
          <div className="pos-order-section">
            <div className="pos-order-header" style={{backgroundColor: '#6B0E9B', background: '#6B0E9B', color: 'white'}}>
              <h2 className="pos-order-title" style={{color: 'white', margin: 0}}>
                Current Order ({currentOrder.length})
              </h2>
              {currentOrder.length > 0 && (
                <button 
                  className="pos-clear-btn"
                  onClick={clearOrder}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="pos-order-content">
              {currentOrder.length === 0 ? (
                <div className="pos-empty-order">
                  <div className="empty-order-icon">🛒</div>
                  <h3>No Items</h3>
                  <p>Select items from the menu to add to order.</p>
                </div>
              ) : (
                <>
                  {/* Order Items - POS Style */}
                  <div className="pos-order-items">
                    {currentOrder.map((item, index) => (
                      <StaffOrderItem
                        key={item._id || `order-item-${index}`}
                        item={item}
                        onUpdateQuantity={updateQuantity}
                        onRemove={removeFromOrder}
                      />
                    ))}
                  </div>

                  {/* Order Notes - POS Style */}
                  <div className="pos-order-notes">
                    <textarea
                      placeholder="Add order notes..."
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      className="pos-notes-textarea"
                      rows="3"
                    />
                  </div>



                  {/* Order Summary - POS Style */}
                  <div className="pos-order-summary">
                    <div className="pos-summary-line">
                      <span>Subtotal:</span>
                      <span>₹{orderTotals.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="pos-summary-line">
                      <span>Tax (GST):</span>
                      <span>₹{orderTotals.tax.toFixed(2)}</span>
                    </div>
                    <div className="pos-summary-total">
                      <span>TOTAL:</span>
                      <span>₹{orderTotals.total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Action Buttons - POS Style */}
                  <div className="pos-actions">
                    <button 
                      className="pos-process-btn"
                      onClick={() => {
                  
                        
                        // Prepare cart data with current order
                        const cartData = {
                          items: currentOrder,
                          customerName: 'Walk-in Customer', // Default customer name
                          notes: orderNotes.trim(),
                          images: orderImages,
                          subtotal: orderTotals.subtotal,
                          tax: orderTotals.tax,
                          total: orderTotals.total,
                          theaterId
                        };
                        
                        // Store in sessionStorage for ViewCart page
                        sessionStorage.setItem('cartData', JSON.stringify(cartData));
                        
                        // Navigate to view cart
                        window.location.href = `/view-cart/${theaterId}`;
                      }}
                      disabled={currentOrder.length === 0}
                      style={{
                        backgroundColor: currentOrder.length === 0 ? '#9ca3af' : '#6B0E9B',
                        background: currentOrder.length === 0 ? '#9ca3af' : '#6B0E9B',
                        color: 'white',
                        border: 'none'
                      }}
                    >
                      PROCESS ORDER
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </TheaterLayout>
  );
};

export default TheaterOrderInterface;