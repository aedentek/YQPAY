import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ErrorBoundary from '../../components/ErrorBoundary';
import config from '../../config';
import '../../styles/customer/CustomerLanding.css';

// Exact cinema combo image - purple popcorn bucket with gold designs and black drink cup
const CINEMA_COMBO_IMAGE = "/images/cinema-combo.jpg.png"; // Local branded cinema combo image

// Lazy loading image component
const LazyFoodImage = React.memo(({ src, alt, className }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (src) {
      const img = new Image();
      img.onload = () => {
        setImageSrc(src);
        setIsLoading(false);
      };
      img.onerror = () => {
        setHasError(true);
        setIsLoading(false);
      };
      img.src = src;
    }
  }, [src]);

  if (isLoading) {
    return (
      <div className={`${className} loading-placeholder`}>
        <div className="loading-shimmer"></div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={`${className} error-placeholder`}>
        <span>🍿</span>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      loading="lazy"
    />
  );
});

LazyFoodImage.displayName = 'LazyFoodImage';

const CustomerLanding = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams(); // Get route parameters (for /menu/:theaterId)
  
  // State management
  const [theater, setTheater] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [theaterId, setTheaterId] = useState(null);
  const [screenName, setScreenName] = useState(null);
  const [seatId, setSeatId] = useState(null);
  const [qrName, setQrName] = useState(null); // QR name from scanned code

  // Extract parameters from URL (theater ID, screen name, seat ID, QR name)
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    
    // Theater ID can come from route parameter (/menu/:theaterId) or query string (?theaterid=...)
    const routeTheaterId = params.theaterId; // From /menu/:theaterId
    const queryTheaterId = urlParams.get('theaterid'); // From ?theaterid=...
    const id = routeTheaterId || queryTheaterId;
    
    const screen = urlParams.get('screen');
    const seat = urlParams.get('seat');
    const qr = urlParams.get('qrName'); // QR name from scanned code
    
    if (!id) {
      setError('Theater ID is required');
      setLoading(false);
      return;
    }
    
    console.log('🎯 Customer Landing - Theater ID:', id, '| QR Name:', qr, '| Screen:', screen, '| Seat:', seat);
    
    setTheaterId(id);
    setScreenName(screen);
    setSeatId(seat);
    setQrName(qr);
  }, [location.search, params.theaterId]);

  // Load theater data
  const loadTheaterData = useCallback(async (id) => {
    try {
      console.log('🎭 Loading theater data for ID:', id);
      const apiUrl = `${config.api.baseUrl}/theaters/${id}`;
      console.log('📡 API URL:', apiUrl);
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      console.log('📦 API Response:', data);
      
      if (data.success && data.data) {
        setTheater(data.data);
        console.log('✅ Theater loaded:', data.data.name);
      } else {
        throw new Error(data.error || data.message || 'Theater not found');
      }
    } catch (error) {
      console.error('❌ Error loading theater:', error);
      setError(`Theater not found: ${error.message}`);
    }
  }, []);

  // Load settings data (theme, logo)
  const loadSettings = useCallback(async () => {
    try {
      console.log('⚙️ Loading settings...');
      const apiUrl = `${config.api.baseUrl}/settings/general`;
      console.log('📡 Settings API URL:', apiUrl);
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (data.success && data.data.config) {
        setSettings(data.data.config);
        console.log('✅ Settings loaded:', data.data.config.applicationName);
      }
    } catch (error) {
      console.error('❌ Error loading settings:', error);
      // Continue without settings (use defaults)
    }
  }, []);

  // Load data when theater ID is available
  useEffect(() => {
    if (theaterId) {
      Promise.all([
        loadTheaterData(theaterId),
        loadSettings()
      ]).finally(() => {
        setLoading(false);
      });
    }
  }, [theaterId, loadTheaterData, loadSettings]);

  // Navigation handlers
  const handleOrderFood = () => {
    let url = `/customer/order?theaterid=${theaterId}`;
    if (qrName) url += `&qrName=${encodeURIComponent(qrName)}`;
    if (screenName) url += `&screen=${encodeURIComponent(screenName)}`;
    if (seatId) url += `&seat=${encodeURIComponent(seatId)}`;
    // Try to extract seatClass from qrName or use a default
    const sClass = qrName || 'General';
    url += `&seatClass=${encodeURIComponent(sClass)}`;
    navigate(url);
  };

  const handleOrderHistory = () => {
    let url = `/customer/history?theaterid=${theaterId}`;
    if (screenName) url += `&screen=${encodeURIComponent(screenName)}`;
    if (seatId) url += `&seat=${encodeURIComponent(seatId)}`;
    navigate(url);
  };

  // Loading state
  if (loading) {
    return (
      <div className="customer-landing loading">
        <div className="welcome-section fade-in">
          <div className="loading-text">Loading...</div>
          <div className="loading-shimmer-bar"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="customer-landing error">
        <div className="error-section fade-in">
          <div className="error-icon">⚠️</div>
          <h2>Theater Not Found</h2>
          <p>{error}</p>
          <p className="error-hint">Please check the QR code and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="customer-landing">
        {/* Header Section - Clean welcome without seat info */}
        <div className="welcome-section fade-in">
          <h1 className="welcome-title">WELCOME TO</h1>
          <h2 className="theater-name">{theater?.name || 'THEATER NAME'}</h2>
          <p className="theater-location">
            {theater?.location?.city || theater?.location?.address || 'LOCATION'}
          </p>
        </div>

          {/* Cinema Combo Display - Direct Image */}
          <div className="food-section fade-in-delay">
            <LazyFoodImage
              src={CINEMA_COMBO_IMAGE}
              alt="Purple Popcorn Bucket & Black Drink Cup"
              className="cinema-combo-direct"
            />
          </div>

          {/* Action Buttons Section */}
          <div className="action-section fade-in-delay">
            <button 
              className="order-button primary-button"
              onClick={handleOrderFood}
            >
              <span className="button-arrows">»</span>
              FOOD ORDER
              <span className="button-arrows">«</span>
            </button>
            
            <button 
              className="history-link"
              onClick={handleOrderHistory}
            >
              ORDER HISTORY
            </button>
          </div>

          {/* Footer Section */}
          <div className="footer-section fade-in-delay">
            <p className="powered-by">Powered By</p>
            <div className="logo-container">
              {settings?.logoUrl ? (
                <img 
                  src="/api/settings/image/logo" 
                  alt={settings?.applicationName || 'YQPayNow'}
                  className="logo-image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
              ) : null}
              <div className="logo-text" style={{ display: settings?.logoUrl ? 'none' : 'block' }}>
                {settings?.applicationName || 'YQPayNow'}
              </div>
            </div>
          </div>
        </div>
    </ErrorBoundary>
  );
};

export default CustomerLanding;