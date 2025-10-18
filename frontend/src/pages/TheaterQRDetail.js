import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import config from '../config';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';
import VerticalPageHeader from '../components/VerticalPageHeader';
import ErrorBoundary from '../components/ErrorBoundary';
import { ActionButton, ActionButtons } from '../components/ActionButton';
import { useModal } from '../contexts/ModalContext';
import '../styles/components.css';
import '../styles/TheaterList.css';
import '../styles/TheaterQRDetail.css';
import '../styles/buttons.css';
import { clearTheaterCache, addCacheBuster } from '../utils/cacheManager';
import { usePerformanceMonitoring, preventLayoutShift } from '../hooks/usePerformanceMonitoring';

// Helper function to get authenticated headers
const getAuthHeaders = () => {
  const authToken = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Accept': 'application/json',
    ...(authToken && { 'Authorization': `Bearer ${authToken}` })
  };
};

// Enhanced Lazy Loading QR Image Component with Intersection Observer (matching QRManagement)
const LazyQRImage = React.memo(({ src, alt, className, style }) => {
  const [imageSrc, setImageSrc] = useState('/placeholder-qr.png');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && src && src !== '/placeholder-qr.png') {
          const img = new Image();
          img.onload = () => {
            setImageSrc(src);
            setIsLoading(false);
            setHasError(false);
          };
          img.onerror = () => {
            setHasError(true);
            setIsLoading(false);
          };
          img.src = src;
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  return (
    <div className="lazy-qr-container" style={style}>
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        className={`${className} ${isLoading ? 'loading' : ''} ${hasError ? 'error' : ''}`}
        style={style}
      />
      {isLoading && (
        <div className="qr-loading-placeholder">
          <div className="qr-skeleton"></div>
        </div>
      )}
    </div>
  );
});

LazyQRImage.displayName = 'LazyQRImage';

// QR Card Component
const QRCard = React.memo(({ qrCode, onView, onDownload, onToggleStatus, onDelete, actionLoading }) => (
  <div className="qr-detail-card">
    <div className="qr-image">
      <LazyQRImage 
        src={qrCode.qrImageUrl} 
        alt={qrCode.name}
        className="qr-img"
      />
      <div className="qr-type-badge">
        {qrCode.qrType === 'canteen' ? 'ðŸ•' : 'ðŸŽ¬'}
      </div>
      <div className={`qr-status-indicator ${qrCode.isActive ? 'active' : 'inactive'}`}></div>
    </div>
    
    <div className="qr-info">
      <h3 className="qr-name">{qrCode.name}</h3>
      {qrCode.qrType === 'screen' && (
        <p className="qr-seat">
          {qrCode.screenName} - Seat {qrCode.seatNumber}
        </p>
      )}
      <div className="qr-stats">
        <span>Orders: {qrCode.orderCount || 0}</span>
        <span>Revenue: â‚¹{qrCode.totalRevenue || 0}</span>
      </div>
      <div className="qr-status">
        <span className={`status ${qrCode.isActive ? 'active' : 'inactive'}`}>
          {qrCode.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
    </div>
    
    <div className="qr-actions">
      <button
        className="action-btn view-btn"
        onClick={() => onView(qrCode)}
        title="View Details"
      >
        ðŸ‘ï¸
      </button>
      <button
        className="action-btn download-btn"
        onClick={() => onDownload(qrCode)}
        title="Download QR Code"
      >
        â¬‡ï¸
      </button>
      <button
        className={`action-btn toggle-btn ${qrCode.isActive ? 'active' : 'inactive'}`}
        onClick={() => onToggleStatus(qrCode._id, qrCode.isActive)}
        disabled={actionLoading[qrCode._id]}
        title={qrCode.isActive ? 'Deactivate' : 'Activate'}
      >
        {actionLoading[qrCode._id] ? 'âŸ³' : (qrCode.isActive ? 'â¸ï¸' : 'â–¶ï¸')}
      </button>
      <button
        className="action-btn delete-btn"
        onClick={() => onDelete(qrCode._id, qrCode.name)}
        disabled={actionLoading[qrCode._id]}
        title="Delete"
      >
        ðŸ—‘ï¸
      </button>
    </div>
  </div>
));

QRCard.displayName = 'QRCard';

// CRUD Modal Component
const CrudModal = React.memo(({ isOpen, qrCode, mode, theater, onClose, onSave, onDelete, onModeChange, actionLoading, confirmDelete, displayImageUrl }) => {
  const [formData, setFormData] = useState({
    name: '',
    qrType: 'single',
    screenName: '',
    seatNumber: '',
    location: '',
    isActive: true,
    ...qrCode
  });

  useEffect(() => {
    if (qrCode) {
      console.log('ðŸ” CrudModal - QR Code data received:', qrCode);
      console.log('ðŸ–¼ï¸ QR Image URL:', qrCode.qrImageUrl);
      console.log('ðŸ” QR Code Full Object Keys:', Object.keys(qrCode));
      console.log('ðŸ” QR Image URL Details:', {
        exists: !!qrCode.qrImageUrl,
        type: typeof qrCode.qrImageUrl,
        length: qrCode.qrImageUrl?.length || 0,
        value: qrCode.qrImageUrl
      });
      setFormData({ ...qrCode });
    }
  }, [qrCode]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleDelete = async () => {
    const confirmed = await confirmDelete(
      `Are you sure you want to delete "${formData.name}"?`,
      'This action cannot be undone.'
    );
    
    if (confirmed) {
      onDelete(formData._id);
    }
  };

  const isReadOnly = mode === 'view';
  const isEditing = mode === 'edit';

  const getModalTitle = () => {
    switch (mode) {
      case 'view': return 'View QR Code';
      case 'edit': return 'Edit QR Code';
      case 'create': return 'Create QR Code';
      default: return 'QR Code Details';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content theater-edit-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-nav-left">
          </div>
          
          <div className="modal-title-section">
            <h2>{getModalTitle()}</h2>
          </div>
          
          <div className="modal-nav-right">
            <button 
              className="close-btn"
              onClick={onClose}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" style={{width: '20px', height: '20px'}}>
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        </div>
        
        <div className="modal-body">
          <div className="edit-form">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
              <label>QR Code Name *</label>
              <input
                type="text"
                name="name"
                className="form-control"
                value={formData.name || ''}
                onChange={handleInputChange}
                disabled={isReadOnly}
                required
                placeholder="Enter QR code name"
              />
            </div>

            <div className="form-group">
              <label>QR Type</label>
              <select
                name="qrType"
                className="form-control"
                value={formData.qrType || 'single'}
                onChange={handleInputChange}
                disabled={isReadOnly}
              >
                <option value="single">Single QR</option>
                <option value="screen">Screen QR</option>
              </select>
            </div>

            {formData.qrType === 'screen' && (
              <>
                <div className="form-group">
                  <label>Screen Name</label>
                  <input
                    type="text"
                    name="screenName"
                    className="form-control"
                    value={formData.screenName || ''}
                    onChange={handleInputChange}
                    disabled={isReadOnly}
                    placeholder="Enter screen name"
                  />
                </div>

                <div className="form-group">
                  <label>Seat Number</label>
                  <input
                    type="text"
                    name="seatNumber"
                    className="form-control"
                    value={formData.seatNumber || ''}
                    onChange={handleInputChange}
                    disabled={isReadOnly}
                    placeholder="Enter seat number"
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                name="location"
                className="form-control"
                value={formData.location || ''}
                onChange={handleInputChange}
                disabled={isReadOnly}
                placeholder="e.g., Entrance, Lobby, Screen 1"
              />
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive || false}
                  onChange={handleInputChange}
                  disabled={isReadOnly}
                  style={{marginRight: '8px'}}
                />
                Active
              </label>
            </div>

            <div className="form-group">
              <label>QR Code Preview</label>
              <div className="qr-preview">
                {console.log('?? Render: displayImageUrl =', displayImageUrl)}
                {displayImageUrl ? (
                  <div className="qr-image-container">
                    <img 
                      src={displayImageUrl} 
                      alt="QR Code Preview"
                      className="qr-preview-img"
                      onLoad={(e) => {
                        console.log('âœ… QR Image loaded successfully');
                        e.target.nextElementSibling.style.display = 'none';
                      }}
                      onError={(e) => {
                        console.error('âŒ QR Image failed to load:', formData.qrImageUrl);
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'flex';
                      }}
                    />
                    <div className="qr-preview-error" style={{ display: 'none' }}>
                      <div className="qr-error-content">
                        <span>ðŸ–¼ï¸</span>
                        <h4>Image not available</h4>
                        <p>The QR code image could not be loaded. This might be due to:</p>
                        <ul>
                          <li>Expired access URL</li>
                          <li>Network connectivity issues</li>
                          <li>Google Cloud Storage configuration</li>
                        </ul>
                        <button 
                          type="button" 
                          className="btn btn-secondary"
                          onClick={() => {
                            // Generate new QR code on the fly
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            canvas.width = 150;
                            canvas.height = 150;
                            
                            // Simple QR-like pattern
                            ctx.fillStyle = '#000';
                            ctx.fillRect(0, 0, 150, 150);
                            ctx.fillStyle = '#fff';
                            ctx.fillRect(10, 10, 130, 130);
                            ctx.fillStyle = '#000';
                            
                            // Create a simple grid pattern
                            for (let i = 0; i < 15; i++) {
                              for (let j = 0; j < 15; j++) {
                                if ((i + j) % 2 === 0) {
                                  ctx.fillRect(i * 9 + 15, j * 9 + 15, 8, 8);
                                }
                              }
                            }
                            
                            // Add text
                            ctx.fillStyle = '#fff';
                            ctx.font = '12px Arial';
                            ctx.textAlign = 'center';
                            ctx.fillText(formData.name || 'QR Code', 75, 80);
                            
                            const img = document.querySelector('.qr-preview-img');
                            img.src = canvas.toDataURL();
                            img.style.display = 'block';
                            img.nextElementSibling.style.display = 'none';
                          }}
                        >
                          Generate Preview
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="qr-preview-placeholder">
                    <span>ðŸ”</span>
                    <h4>No QR Code Available</h4>
                    <p>No QR code image URL found for this item.</p>
                  </div>
                )}
              </div>
            </div>

            {/* <div className="form-group stats-group">
              <div className="stat-item">
                <span className="stat-label">Orders:</span>
                <span className="stat-value">{formData.orderCount || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Revenue:</span>
                <span className="stat-value">â‚¹{formData.totalRevenue || 0}</span>
              </div>
            </div> */}
            </form>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-actions">
          {mode === 'view' && (
            <>
              <button
                type="button"
                className="btn-primary"
                onClick={() => onModeChange('edit')}
              >
                Edit
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleDelete}
                disabled={actionLoading[formData._id]}
              >
                {actionLoading[formData._id] ? 'Deleting...' : 'Delete'}
              </button>
              <button type="button" className="cancel-btn" onClick={onClose}>
                Close
              </button>
            </>
          )}
          
          {mode === 'edit' && (
            <>
              <button type="button" className="cancel-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                onClick={handleSubmit}
                disabled={actionLoading[formData._id]}
              >
                {actionLoading[formData._id] ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
          
          {mode === 'create' && (
            <>
              <button type="button" className="cancel-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                onClick={handleSubmit}
                disabled={actionLoading.new}
              >
                {actionLoading.new ? 'Creating...' : 'Create QR Code'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

CrudModal.displayName = 'CrudModal';

// Skeleton component for QR cards (matching performance patterns)
const QRCardSkeleton = React.memo(() => (
  <div className="qr-detail-card skeleton-card">
    <div className="qr-image skeleton-image"></div>
    <div className="qr-info">
      <div className="skeleton-line skeleton-title"></div>
      <div className="skeleton-line skeleton-text"></div>
      <div className="skeleton-line skeleton-stats"></div>
    </div>
    <div className="qr-actions">
      <div className="skeleton-button"></div>
      <div className="skeleton-button"></div>
      <div className="skeleton-button"></div>
      <div className="skeleton-button"></div>
    </div>
  </div>
));

QRCardSkeleton.displayName = 'QRCardSkeleton';

const TheaterQRDetail = () => {
  const { theaterId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { showError, showSuccess, confirmDelete, alert } = useModal();
  
  // PERFORMANCE MONITORING: Track page performance metrics
  usePerformanceMonitoring('TheaterQRDetail');
  
  // Data from navigation state or fetch
  const [theater, setTheater] = useState(location.state?.theater || null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  
  // QR Names state for dynamic sidebar
  const [qrNames, setQrNames] = useState([]);
  const [qrNamesLoading, setQrNamesLoading] = useState(true);
  
  // QR Codes grouped by name
  const [qrCodesByName, setQrCodesByName] = useState({});
  
  // Performance refs (matching QRManagement)
  const abortControllerRef = useRef(null);
  
  // Active category state - will be set to first QR name when loaded
  const [activeCategory, setActiveCategory] = useState(null);
  
  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    isActive: ''
  });
  
  // CRUD Modal state
  const [crudModal, setCrudModal] = useState({
    isOpen: false,
    qrCode: null,
    mode: 'view' // 'view', 'edit', 'create'
  });

  // Display image URL state for signed URL
  const [displayImageUrl, setDisplayImageUrl] = useState(null);

  // Load QR Names for dynamic sidebar
  const loadQRNames = useCallback(async () => {
    if (!theaterId) return;
    
    try {
      console.log('ðŸ” Loading QR names for theater:', theaterId);
      setQrNamesLoading(true);
      const url = `/api/qrcodenames?theaterId=${theaterId}&status=active&limit=100`;
      console.log('ðŸŒ Fetching from URL:', url);
      
      const response = await fetch(url, { headers: getAuthHeaders() });
      const data = await response.json();
      
      console.log('ðŸ“¡ QR Names API Response:', data);
      console.log('ðŸ“‹ QR Names found:', data.data?.qrCodeNames?.length || 0);
      
      if (data.success && data.data) {
        const qrNamesArray = data.data.qrCodeNames || [];
        console.log('âœ… Setting QR names:', qrNamesArray.map(qr => qr.qrName));
        setQrNames(qrNamesArray);
      } else {
        console.error('âŒ Failed to load QR names:', data.message);
        setQrNames([]);
      }
    } catch (error) {
      console.error('âŒ Error loading QR names:', error);
      setQrNames([]);
    } finally {
      setQrNamesLoading(false);
    }
  }, [theaterId]);

  // Set active category to first QR name when QR names are loaded
  useEffect(() => {
    console.log('🎯 QR Names effect - qrNames:', qrNames.length, 'activeCategory:', activeCategory);
    if (qrNames.length > 0) {
      // Set activeCategory if it's null OR if current activeCategory is not in the list
      if (!activeCategory || !qrNames.find(qr => qr.qrName === activeCategory)) {
        const firstQRName = qrNames[0].qrName;
        console.log('🎯 Setting active category to:', firstQRName);
        setActiveCategory(firstQRName);
      }
    }
  }, [qrNames]); // Removed activeCategory from dependencies to prevent loops

  const loadTheaterData = useCallback(async () => {
    try {
      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      
      setLoading(true);
      
      const signal = abortControllerRef.current.signal;
      const headers = getAuthHeaders();
      
      if (!theater) {
        const theaterUrl = addCacheBuster(`/api/theaters/${theaterId}`);
        const theaterResponse = await fetch(theaterUrl, { signal, headers });
        const theaterData = await theaterResponse.json();
        if (theaterData.success) {
          setTheater(theaterData.theater);
        }
      }
      
      // PERFORMANCE OPTIMIZATION: Parallel requests for all QR codes
      console.log('ðŸš€ Making API calls for theater:', theaterId);
      const singleUrl = addCacheBuster(`${config.api.baseUrl}/single-qrcodes/theater/${theaterId}`);
      // Fetching from singleqrcodes collection which contains both single and screen QR codes
      console.log('ðŸŒ Single QR URL:', singleUrl);
      // singleUrl removed
      
      const singleResponse = await fetch(singleUrl, { signal, headers });
      
      // Safely parse JSON response
      const singleData = singleResponse.ok ? await singleResponse.json().catch(() => ({ success: false, message: 'Invalid JSON response' })) : { success: false, message: `HTTP ${singleResponse.status}` };
      const screenData = { success: false }; // Not fetching screens separately anymore
      
      // Group QR codes by name
      const qrsByName = {};
      
      console.log('ðŸ” Single QR API Response Status:', singleResponse.status);
      console.log('ðŸ” Single QR Data Response:', singleData);
      // singleResponse removed
      console.log('ðŸ” Screen QR Data Response:', screenData);
      
      if (!singleData.success) {
        console.log('â„¹ï¸ Single QR API Info:', singleData.message || 'No single QR codes found');
        // Only show error for actual server errors, not "not found" cases
        if (singleData.message && !singleData.message.includes('not found') && !singleData.message.includes('No QR codes found')) {
          console.error('âŒ Single QR API Error:', singleData.message);
          showError(`Single QR Error: ${singleData.message}`);
        }
      }
      
      if (!screenData.success) {
        console.log('â„¹ï¸ Screen QR API Info:', screenData.message || 'No screen QR codes found');
        // Only show error for actual server errors, not "not found" cases
        if (screenData.message && !screenData.message.includes('not found') && !screenData.message.includes('No QR codes found')) {
          console.error('âŒ Screen QR API Error:', screenData.message);
          showError(`Screen QR Error: ${screenData.message}`);
        }
      }
      
      if (singleData.success) {
        console.log('ðŸ“‹ Single QR Codes found:', singleData.data?.qrCodes?.length || 0);
        (singleData.data?.qrCodes || []).forEach(qr => {
          console.log('ðŸŽ¯ Processing QR:', { 
            name: qr.name, 
            qrType: 'single',
            qrImageUrl: qr.qrImageUrl ? 'EXISTS' : 'MISSING',
            qrImageUrlLength: qr.qrImageUrl?.length || 0
          });
          if (!qrsByName[qr.name]) {
            qrsByName[qr.name] = [];
          }
          qrsByName[qr.name].push({ ...qr, qrType: 'single' });
        });
      }
      
      // singleResponse removed
      console.log('ðŸ” Screen QR Data Response:', screenData);
      
      // Additional error logging for screen QR codes (already handled above)
      if (!screenData.success) {
        console.log('â„¹ï¸ Screen QR additional info:', screenData.message || 'No screen QR codes found');
      }
      
      if (screenData.success) {
        console.log('ðŸ“‹ Screen QR Codes found:', screenData.data?.qrCodes?.length || 0);
        (screenData.data?.qrCodes || []).forEach(qr => {
          console.log('ðŸŽ¯ Processing Screen QR:', { 
            name: qr.name, 
            qrType: 'screen',
            qrImageUrl: qr.qrImageUrl ? 'EXISTS' : 'MISSING',
            qrImageUrlLength: qr.qrImageUrl?.length || 0
          });
          if (!qrsByName[qr.name]) {
            qrsByName[qr.name] = [];
          }
          qrsByName[qr.name].push({ ...qr, qrType: 'screen' });
        });
      }
      
      console.log('ðŸŽ¯ Final QR codes grouped by name:', qrsByName);
      setQrCodesByName(qrsByName);
      
    } catch (error) {
      // Handle AbortError gracefully
      if (error.name === 'AbortError') {
        console.log('TheaterQRDetail request was cancelled');
        return;
      }
      console.log('Error loading theater data:', error);
      showError('Failed to load theater QR codes');
    } finally {
      setLoading(false);
    }
  }, [theaterId, showError]); // Removed 'theater' to prevent circular dependency

  // Fetch signed URL for QR code image display
  const fetchDisplayImageUrl = useCallback(async (qrCodeId) => {
    if (!qrCodeId) return null;
    
    try {
      console.log('??? Fetching display image URL for QR code:', qrCodeId);
      
      const response = await fetch(`${config.api.baseUrl}/qrcodes/${qrCodeId}/image-url`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        console.error('? Failed to fetch display image URL:', response.status);
        return null;
      }
      
      const data = await response.json();
      console.log('? Display image URL response:', data);
      
      if (data.success && data.data && data.data.imageUrl) {
        return data.data.imageUrl;
      }
      
      return null;
    } catch (error) {
      console.error('? Error fetching display image URL:', error);
      return null;
    }
  }, []);

  // Load theater and QR data - MUST be after function declarations
  useEffect(() => {
    loadTheaterData();
    loadQRNames();
    
    // Cleanup on unmount to prevent stale data
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Reset state to prevent displaying stale data on remount
      setQrCodesByName({});
      setActiveCategory(null);
      setQrNames([]);
      setLoading(true);
    };
  }, [theaterId, loadTheaterData, loadQRNames]);

  // Memoized computations for better performance - now based on QR names
  const currentQRs = useMemo(() => {
    if (!activeCategory || !qrCodesByName[activeCategory]) {
      return [];
    }
    
    return qrCodesByName[activeCategory].filter(qr => {
      const matchesSearch = !filters.search || 
        qr.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        (qr.screenName && qr.screenName.toLowerCase().includes(filters.search.toLowerCase())) ||
        (qr.seatNumber && qr.seatNumber.toLowerCase().includes(filters.search.toLowerCase()));
      
      const matchesStatus = !filters.isActive || 
        qr.isActive.toString() === filters.isActive;
      
      return matchesSearch && matchesStatus;
    });
  }, [activeCategory, qrCodesByName, filters.search, filters.isActive]);

  // Get QR count for each QR name (for sidebar display)
  const qrNameCounts = useMemo(() => {
    const counts = {};
    Object.keys(qrCodesByName).forEach(name => {
      counts[name] = qrCodesByName[name].length;
    });
    return counts;
  }, [qrCodesByName]);

  const statsInfo = useMemo(() => {
    const allQRs = Object.values(qrCodesByName).flat();
    return {
      totalQRs: allQRs.length,
      activeQRs: allQRs.filter(qr => qr.isActive).length,
      qrNameCount: qrNames.length
    };
  }, [qrCodesByName, qrNames]);

  // Action handlers (matching QRManagement performance)
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      isActive: ''
    });
  }, []);

  // CRUD Modal Functions
  const openCrudModal = useCallback(async (qrCode, mode = 'view') => {
    setCrudModal({
      isOpen: true,
      qrCode: { ...qrCode },
      mode
    });
    
    // Set display image URL directly from qrCode data
    if (qrCode && qrCode.qrImageUrl) {
      console.log('🖼️ openCrudModal: Using QR image URL from data:', qrCode.qrImageUrl);
      setDisplayImageUrl(qrCode.qrImageUrl);
    } else {
      console.warn('⚠️ openCrudModal: No qrImageUrl found in QR code data');
      setDisplayImageUrl(null);
    }
  }, []);

  const closeCrudModal = useCallback(() => {
    setCrudModal({
      isOpen: false,
      qrCode: null,
      mode: 'view'
    });
  }, []);

  const handleCrudSave = useCallback(async (formData) => {
    console.log('ðŸ”„ CRUD Save operation started:', { mode: crudModal.mode, formData, theaterId });
    try {
      setActionLoading(prev => ({ ...prev, [formData._id || 'new']: true }));
      
      const isEditing = crudModal.mode === 'edit';
      
      if (isEditing) {
        // Update existing QR code using single-qrcodes detail endpoint
        if (!formData.parentDocId) {
          showError('Cannot update QR code: Missing parent document reference');
          setActionLoading(prev => ({ ...prev, [formData._id]: false }));
          return;
        }

        // Prepare update payload with all fields needed for QR regeneration
        const updatePayload = {
          qrName: formData.name,           // QR code name
          seatClass: formData.seatClass,   // Seat class (e.g., 'screen-1')
          seat: formData.seat || null,     // Seat number (for screen QR codes)
          logoUrl: formData.logoUrl,       // Logo overlay URL
          logoType: formData.logoType || 'default',
          isActive: formData.isActive
        };

        console.log('📤 Sending update payload:', updatePayload);

        const response = await fetch(`${config.api.baseUrl}/single-qrcodes/${formData.parentDocId}/details/${formData._id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(updatePayload)
        });
        
        const data = await response.json();
        
        if (data.success) {
          // Reload theater data to get updated QR codes
          await loadTheaterData();
          showSuccess('QR code updated successfully');
          closeCrudModal();
        } else {
          showError(data.message || 'Failed to update QR code');
        }
      } else {
        // Create new QR code using generate endpoint
        let payload;
        
        if (formData.qrType === 'screen' && formData.screenName && formData.seatNumber) {
          // For screen QR codes, use selectedSeats array format expected by backend
          payload = {
            theaterId: theaterId,
            qrType: 'screen',
            name: formData.screenName, // Use screen name as the QR name
            selectedSeats: [formData.seatNumber], // Array of seat numbers
            logoType: 'theater'
          };
        } else {
          // For single QR codes
          payload = {
            theaterId: theaterId,
            qrType: 'single',
            name: formData.name,
            logoType: 'theater'
          };
        }
        
        console.log('ðŸ“¤ Creating QR code with payload:', payload);

        const response = await fetch('/api/qrcodes/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (data.success) {
          // Reload theater data to get the new QR code
          loadTheaterData();
          showSuccess('QR code created successfully');
          closeCrudModal();
        } else {
          showError(data.message || 'Failed to create QR code');
        }
      }
    } catch (error) {
      console.error('Error saving QR code:', error);
      showError('Failed to save QR code');
    } finally {
      setActionLoading(prev => ({ ...prev, [formData._id || 'new']: false }));
    }
  }, [crudModal.mode, showSuccess, showError, loadTheaterData, closeCrudModal, theaterId]);

  const handleCrudDelete = useCallback(async (qrCodeId) => {
    try {
      const confirmed = await confirmDelete('this QR code');
      if (!confirmed) return;
      
      setActionLoading(prev => ({ ...prev, [qrCodeId]: true }));
      
      // Find the QR code to get its parentDocId
      let qrToDelete = null;
      let parentDocId = null;
      
      Object.keys(qrCodesByName).forEach(name => {
        const qr = qrCodesByName[name].find(q => q._id === qrCodeId);
        if (qr) {
          qrToDelete = qr;
          parentDocId = qr.parentDocId;
        }
      });
      
      if (!parentDocId) {
        showError('Cannot delete QR code: Missing parent document reference');
        return;
      }
      
      const response = await fetch(`${config.api.baseUrl}/single-qrcodes/${parentDocId}/details/${qrCodeId}?permanent=true`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Reload theater data to get updated list
        await loadTheaterData();
        showSuccess('QR code deleted successfully');
        closeCrudModal();
      } else {
        showError(data.message || 'Failed to delete QR code');
      }
    } catch (error) {
      console.error('Error deleting QR code:', error);
      showError('Failed to delete QR code');
    } finally {
      setActionLoading(prev => ({ ...prev, [qrCodeId]: false }));
    }
  }, [confirmDelete, showSuccess, showError, closeCrudModal, qrCodesByName, loadTheaterData]);

  const viewQRCode = (qrCode) => {
    const details = [
      `Name: ${qrCode.name}`,
      `Theater: ${theater?.name}`,
      `Type: ${qrCode.qrType === 'canteen' ? 'Canteen' : 'Screen'}`,
      ...(qrCode.qrType === 'screen' ? [
        `Screen: ${qrCode.screenName}`,
        `Seat: ${qrCode.seatNumber}`
      ] : []),
      `Location: ${qrCode.location || 'Not specified'}`,
      `Status: ${qrCode.isActive ? 'Active' : 'Inactive'}`,
      `Orders: ${qrCode.orderCount || 0}`,
      `Revenue: â‚¹${qrCode.totalRevenue || 0}`
    ].join('\n');

    alert({
      title: 'QR Code Details',
      message: details,
      type: 'info'
    });
  };

  const downloadQRCode = async (qrCode) => {
    console.log('?? Download button clicked!', { qrCode: qrCode.name, id: qrCode._id });
    try {
      if (!qrCode.qrImageUrl) {
        console.error('? No QR image URL available');
        showError('QR code image not available');
        return;
      }
      
      console.log('? QR Image URL:', qrCode.qrImageUrl);
      
      // Create clean filename
      const filename = `${qrCode.name.replace(/[^a-zA-Z0-9\s]/g, '_').replace(/\s+/g, '_')}_QR.png`;
      console.log('?? Filename:', filename);
      
      // Since GCS bucket is private, use backend to get signed URL
      console.log('?? Getting signed download URL from backend...');
      
      const response = await fetch(`${config.api.baseUrl}/qrcodes/${qrCode._id}/signed-url`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get signed URL: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('? Signed URL response:', data);
      
      if (!data.success || !data.data || !data.data.signedUrl) {
        throw new Error('Failed to generate signed download URL');
      }
      
      // Use the signed URL for download
      const a = document.createElement('a');
      a.href = data.data.signedUrl;
      a.download = filename;
      a.target = '_blank';
      a.style.display = 'none';
      
      console.log('?? Triggering download with signed URL...');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      console.log('? Download initiated successfully!');
      showSuccess('QR code download started!');
      
    } catch (error) {
      console.error('? Error downloading QR code:', error);
      showError('Failed to download QR code: ' + error.message);
    }
  };
  const toggleQRStatus = async (qrCodeId, currentStatus) => {
    try {
      setActionLoading(prev => ({ ...prev, [qrCodeId]: true }));
      
      // Find the QR code to get its parentDocId
      let qrToUpdate = null;
      let parentDocId = null;
      
      Object.keys(qrCodesByName).forEach(name => {
        const qr = qrCodesByName[name].find(q => q._id === qrCodeId);
        if (qr) {
          qrToUpdate = qr;
          parentDocId = qr.parentDocId;
        }
      });
      
      if (!parentDocId) {
        showError('Cannot update QR code: Missing parent document reference');
        return;
      }
      
      const response = await fetch(`${config.api.baseUrl}/single-qrcodes/${parentDocId}/details/${qrCodeId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isActive: !currentStatus })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Reload theater data to get updated QR codes
        await loadTheaterData();
        showSuccess(`QR code ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      } else {
        showError(data.message || 'Failed to update QR code status');
      }
    } catch (error) {
      console.error('Error updating QR code status:', error);
      showError('Failed to update QR code status');
    } finally {
      setActionLoading(prev => ({ ...prev, [qrCodeId]: false }));
    }
  };

  const deleteQRCode = async (qrCodeId, qrCodeName) => {
    const confirmed = await confirmDelete(qrCodeName);
    
    if (!confirmed) return;
    
    try {
      setActionLoading(prev => ({ ...prev, [qrCodeId]: true }));
      
      // Find the QR code to get its parentDocId
      let qrToDelete = null;
      let parentDocId = null;
      
      Object.keys(qrCodesByName).forEach(name => {
        const qr = qrCodesByName[name].find(q => q._id === qrCodeId);
        if (qr) {
          qrToDelete = qr;
          parentDocId = qr.parentDocId;
        }
      });
      
      if (!parentDocId) {
        showError('Cannot delete QR code: Missing parent document reference');
        return;
      }
      
      const response = await fetch(`${config.api.baseUrl}/single-qrcodes/${parentDocId}/details/${qrCodeId}?permanent=true`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Reload theater data to get updated list
        await loadTheaterData();
        showSuccess('QR code deleted successfully');
      } else {
        showError(data.message || 'Failed to delete QR code');
      }
    } catch (error) {
      console.error('Error deleting QR code:', error);
      showError('Failed to delete QR code');
    } finally {
      setActionLoading(prev => ({ ...prev, [qrCodeId]: false }));
    }
  };

  // Cleanup effect for aborting requests (matching QRManagement)
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  if (loading) {
    return (
      <ErrorBoundary>
        <AdminLayout 
          pageTitle="Loading Theater QR Details..." 
          currentPage="qr-list"
        >
          <PageContainer
            title="Loading..."
            subtitle="Loading theater QR codes..."
          >
            <div className="loading-container">
              <div className="qr-grid">
                {Array.from({ length: 6 }, (_, index) => (
                  <QRCardSkeleton key={`skeleton-${index}`} />
                ))}
              </div>
            </div>
          </PageContainer>
        </AdminLayout>
      </ErrorBoundary>
    );
  }

  if (!theater) {
    return (
      <AdminLayout 
        pageTitle="Theater Not Found" 
        currentPage="qr-list"
      >
        <PageContainer
          title="Theater Not Found"
          subtitle="The requested theater could not be found"
        >
          <div className="error-container">
            <h2>Theater not found</h2>
            <button onClick={() => navigate('/qr-management')}>
              Back to QR Management
            </button>
          </div>
        </PageContainer>
      </AdminLayout>
    );
  }

  const headerButton = (
    <button 
      className="header-btn"
      onClick={() => console.log('Generate QR Codes clicked')}
    >
      <span className="btn-icon">
        <svg viewBox="0 0 24 24" fill="currentColor" style={{width: '20px', height: '20px'}}>
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
      </span>
      GENERATE QR CODES
    </button>
  );

  return (
    <ErrorBoundary>
      <AdminLayout 
        pageTitle={theater ? `QR Codes - ${theater.name}` : "Theater QR Management"} 
        currentPage="qr-list"
      >
        <div className="theater-qr-details-page">
        <PageContainer
          hasHeader={false}
          className="theater-qr-vertical"
        >
          {/* Global Vertical Header Component */}
          <VerticalPageHeader
            title={theater?.name || 'Loading Theater...'}
            backButtonText="Back to QR Management"
            backButtonPath="/qr-management"
            actionButton={headerButton}
          />
          <div className="theater-qr-settings-container">
            {/* Settings Tabs - Dynamic QR Names */}
            <div className="theater-qr-settings-tabs">
              {qrNamesLoading ? (
                <div className="theater-qr-loading">Loading QR names...</div>
              ) : qrNames.length > 0 ? (
                qrNames.map((qrName) => (
                  <button 
                    key={qrName.qrName}
                    className={`theater-qr-settings-tab ${activeCategory === qrName.qrName ? 'active' : ''}`}
                    onClick={() => setActiveCategory(qrName.qrName)}
                  >
                    <span className="theater-qr-tab-icon"></span>
                    {qrName.qrName}
                    <span className="theater-qr-tab-count">{qrNameCounts[qrName.qrName] || 0}</span>
                  </button>
                ))
              ) : (
                <div className="theater-qr-no-names">No QR names configured for this theater</div>
              )}
            </div>

            {/* Settings Content - EXACTLY like Settings page */}
            <div className="theater-qr-settings-content">
              <div className="theater-qr-settings-section">
                <div className="theater-qr-section-header">
                  <h3>{activeCategory ? `${activeCategory} QR Codes` : 'QR Codes'}</h3>
                  <div className="theater-qr-section-stats">
                    {loading ? (
                      <>
                        <span>Total: <span className="loading-dots">...</span></span>
                        <span>Active: <span className="loading-dots">...</span></span>
                      </>
                    ) : (
                      <>
                        <span>Total: {currentQRs.length}</span>
                        <span>Active: {currentQRs.filter(qr => qr.isActive).length}</span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* QR Grid */}
                <div className="table-container">
                  <div className="table-wrapper">
                    <table className="theater-table">
                      <thead>
                        <tr>
                          <th className="sno-col">S NO</th>
                          <th className="name-col">QR CODE NAME</th>
                          <th className="owner-col">SEAT CLASS</th>
                          <th className="status-col">STATUS</th>
                          <th className="access-status-col">ACCESS STATUS</th>
                          <th className="actions-col">ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentQRs.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="no-data">
                              <div className="empty-state">
                                <svg viewBox="0 0 24 24" fill="currentColor" style={{width: '48px', height: '48px', opacity: 0.3}}>
                                  <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1V3H9V1L3 7V9H1V11H3V19C3 20.1 3.9 21 5 21H11V19H5V11H3V9H21M16 12C14.9 12 14 12.9 14 14S14.9 16 16 16 18 15.1 18 14 17.1 12 16 12M24 20V18H18V20C18 21.1 18.9 22 20 22H22C23.1 22 24 21.1 24 20Z"/>
                                </svg>
                                <p>No QR Code Names found</p>
                                <button 
                                  className="btn-primary" 
                                  onClick={() => navigate('/qr-generate')}
                                >
                                  CREATE YOUR FIRST QR CODE
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          currentQRs.map((qrCode, index) => (
                            <tr key={qrCode._id} className={`theater-row ${!qrCode.isActive ? 'inactive' : ''}`}>
                              {/* S NO Column */}
                              <td className="sno-cell">
                                <div className="sno-number">{index + 1}</div>
                              </td>

                              {/* QR Name Column */}
                              <td className="theater-name-cell">
                                <div className="theater-name-full">{qrCode.name}</div>
                              </td>

                              {/* Seat Class Column */}
                              <td className="owner-cell">
                                <div className="owner-info">
                                  {qrCode.qrType === 'screen' ? (
                                    <div className="seat-class-info">
                                      <div className="screen-name">{qrCode.screenName}</div>
                                      <div className="seat-number">Seat {qrCode.seatNumber}</div>
                                    </div>
                                  ) : (
                                    <div className="owner-name">Single QR</div>
                                  )}
                                </div>
                              </td>

                              {/* Status Column */}
                              <td className="status-cell">
                                <span className={`status-badge ${qrCode.isActive ? 'active' : 'inactive'}`}>
                                  {qrCode.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </td>

                              {/* Access Status Column - Toggle Button */}
                              <td className="access-status-cell">
                                <div className="toggle-wrapper">
                                  <label className="switch" style={{
                                    position: 'relative',
                                    display: 'inline-block',
                                    width: '50px',
                                    height: '24px'
                                  }}>
                                    <input
                                      type="checkbox"
                                      checked={qrCode.isActive}
                                      onChange={() => toggleQRStatus(qrCode._id, qrCode.isActive)}
                                      disabled={actionLoading[qrCode._id]}
                                      style={{
                                        opacity: 0,
                                        width: 0,
                                        height: 0
                                      }}
                                    />
                                    <span className="slider" style={{
                                      position: 'absolute',
                                      cursor: actionLoading[qrCode._id] ? 'not-allowed' : 'pointer',
                                      top: 0,
                                      left: 0,
                                      right: 0,
                                      bottom: 0,
                                      backgroundColor: qrCode.isActive ? 'var(--primary-dark, #6D28D9)' : '#ccc',
                                      transition: '.4s',
                                      borderRadius: '24px',
                                      opacity: actionLoading[qrCode._id] ? 0.5 : 1
                                    }}>
                                      <span style={{
                                        position: 'absolute',
                                        content: '""',
                                        height: '18px',
                                        width: '18px',
                                        left: qrCode.isActive ? '26px' : '3px',
                                        bottom: '3px',
                                        backgroundColor: 'white',
                                        transition: '.4s',
                                        borderRadius: '50%',
                                        display: 'block'
                                      }}></span>
                                    </span>
                                  </label>
                                </div>
                              </td>

                              {/* Actions Column */}
                              <td className="actions-cell">
                                <ActionButtons>
                                  <ActionButton 
                                    type="view"
                                    onClick={() => openCrudModal(qrCode)}
                                    disabled={actionLoading[qrCode._id]}
                                    title="View QR Details"
                                  />
                                  
                                  <ActionButton 
                                    type="download"
                                    onClick={() => downloadQRCode(qrCode)}
                                    title="Download QR Code"
                                  />
                                  
                                  <ActionButton 
                                    type="delete"
                                    onClick={() => deleteQRCode(qrCode._id, qrCode.name)}
                                    disabled={actionLoading[qrCode._id]}
                                    title="Delete QR Code"
                                  />
                                </ActionButtons>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CRUD Modal */}
          {crudModal.isOpen && (
            <CrudModal
              isOpen={crudModal.isOpen}
              qrCode={crudModal.qrCode}
              mode={crudModal.mode}
              theater={theater}
              onClose={closeCrudModal}
              onSave={handleCrudSave}
              onDelete={handleCrudDelete}
              onModeChange={(mode) => setCrudModal(prev => ({ ...prev, mode }))}
              actionLoading={actionLoading}
              confirmDelete={confirmDelete}
              displayImageUrl={displayImageUrl}
            />
          )}

        </PageContainer>
        </div>
      </AdminLayout>
    </ErrorBoundary>
  );
};

export default TheaterQRDetail;

