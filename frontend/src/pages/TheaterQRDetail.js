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
                {console.log('🎨 Render: displayImageUrl =', displayImageUrl)}
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

  // Load theater and QR data
  useEffect(() => {
    loadTheaterData();
    loadQRNames();
  }, [theaterId]);

  // Load QR Names for dynamic sidebar
  const loadQRNames = useCallback(async () => {
    if (!theaterId) return;
    
    try {
      console.log('ðŸ” Loading QR names for theater:', theaterId);
      setQrNamesLoading(true);
      const url = `/api/qrcodenames?theaterId=${theaterId}&status=active&limit=100`;
      console.log('ðŸŒ Fetching from URL:', url);
      
      const response = await fetch(url);
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
    console.log('ðŸŽ¯ QR Names effect - qrNames:', qrNames.length, 'activeCategory:', activeCategory);
    if (qrNames.length > 0 && !activeCategory) {
      const firstQRName = qrNames[0].qrName;
      console.log('ðŸŽ¯ Setting active category to:', firstQRName);
      setActiveCategory(firstQRName);
    }
  }, [qrNames, activeCategory]);

  const loadTheaterData = useCallback(async () => {
    try {
      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      
      setLoading(true);
      
      const signal = abortControllerRef.current.signal;
      const headers = {
        'Cache-Control': 'no-cache, no-store, must-revalidate', // Force fresh data
        'Pragma': 'no-cache',
        'Expires': '0',
        'Accept': 'application/json'
      };
      
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
      const singleUrl = addCacheBuster(`/api/qrcodes?theater=${theaterId}&qrType=single&limit=1000`);
      const screenUrl = addCacheBuster(`/api/qrcodes?theater=${theaterId}&qrType=screen&limit=1000`);
      console.log('ðŸŒ Single QR URL:', singleUrl);
      console.log('ðŸŒ Screen QR URL:', screenUrl);
      
      const [singleResponse, screenResponse] = await Promise.all([
        fetch(singleUrl, { signal, headers }),
        fetch(screenUrl, { signal, headers })
      ]);
      
      // Safely parse JSON responses
      const singleData = singleResponse.ok ? await singleResponse.json().catch(() => ({ success: false, message: 'Invalid JSON response' })) : { success: false, message: `HTTP ${singleResponse.status}` };
      const screenData = screenResponse.ok ? await screenResponse.json().catch(() => ({ success: false, message: 'Invalid JSON response' })) : { success: false, message: `HTTP ${screenResponse.status}` };
      
      // Group QR codes by name
      const qrsByName = {};
      
      console.log('ðŸ” Single QR API Response Status:', singleResponse.status);
      console.log('ðŸ” Single QR Data Response:', singleData);
      console.log('ðŸ” Screen QR API Response Status:', screenResponse.status);
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
      
      console.log('ðŸ” Screen QR API Response Status:', screenResponse.status);
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
      console.error('Error loading theater data:', error);
      showError('Failed to load theater QR codes');
    } finally {
      setLoading(false);
    }
  }, [theaterId, theater, showError]);

  // Fetch signed URL for QR code image display
  const fetchDisplayImageUrl = useCallback(async (qrCodeId) => {
    if (!qrCodeId) return null;
    
    try {
      console.log('🖼️ Fetching display image URL for QR code:', qrCodeId);
      
      const response = await fetch(`${config.api.baseUrl}/qrcodes/${qrCodeId}/image-url`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error('❌ Failed to fetch display image URL:', response.status);
        return null;
      }
      
      const data = await response.json();
      console.log('✅ Display image URL response:', data);
      
      if (data.success && data.data && data.data.imageUrl) {
        return data.data.imageUrl;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error fetching display image URL:', error);
      return null;
    }
  }, []);

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
    
    // Fetch display image URL for the QR code
    if (qrCode && qrCode._id) {
      console.log('🔄 openCrudModal: Fetching display image for QR:', qrCode._id);
      setDisplayImageUrl(null); // Reset previous image
      const imageUrl = await fetchDisplayImageUrl(qrCode._id);
      console.log('🖼️ openCrudModal: Got image URL:', imageUrl);
      setDisplayImageUrl(imageUrl);
      console.log('✅ openCrudModal: Set displayImageUrl state');
    }
  }, [fetchDisplayImageUrl]);

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
        // Update existing QR code
        const response = await fetch(`/api/qrcodes/${formData._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: formData.name,
            location: formData.location,
            isActive: formData.isActive,
            orderingEnabled: formData.orderingEnabled || false
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          // Update existing QR code in state
          setQrCodesByName(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(name => {
              updated[name] = updated[name].map(qr => 
                qr._id === formData._id ? { ...qr, ...formData } : qr
              );
            });
            return updated;
          });
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
      
      const response = await fetch(config.helpers.getApiUrl(`/qrcodes/${qrCodeId}`), {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setQrCodesByName(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(name => {
            updated[name] = updated[name].filter(qr => qr._id !== qrCodeId);
          });
          return updated;
        });
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
  }, [confirmDelete, showSuccess, showError, closeCrudModal]);

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
    console.log('🔽 Download button clicked!', { qrCode: qrCode.name, id: qrCode._id });
    try {
      if (!qrCode.qrImageUrl) {
        console.error('❌ No QR image URL available');
        showError('QR code image not available');
        return;
      }
      
      console.log('� QR Image URL:', qrCode.qrImageUrl);
      
      // Create clean filename
      const filename = `${qrCode.name.replace(/[^a-zA-Z0-9\s]/g, '_').replace(/\s+/g, '_')}_QR.png`;
      console.log('📁 Filename:', filename);
      
      // Since GCS bucket is private, use backend to get signed URL
      console.log('⬇️ Getting signed download URL from backend...');
      
      const response = await fetch(`${config.api.baseUrl}/qrcodes/${qrCode._id}/signed-url`);
      
      if (!response.ok) {
        throw new Error(`Failed to get signed URL: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('� Signed URL response:', data);
      
      if (!data.success || !data.data || !data.data.signedUrl) {
        throw new Error('Failed to generate signed download URL');
      }
      
      // Use the signed URL for download
      const a = document.createElement('a');
      a.href = data.data.signedUrl;
      a.download = filename;
      a.target = '_blank';
      a.style.display = 'none';
      
      console.log('⬇️ Triggering download with signed URL...');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      console.log('✅ Download initiated successfully!');
      showSuccess('QR code download started!');
      
    } catch (error) {
      console.error('❌ Error downloading QR code:', error);
      showError('Failed to download QR code: ' + error.message);
    }
  };
  const toggleQRStatus = async (qrCodeId, currentStatus) => {
    try {
      setActionLoading(prev => ({ ...prev, [qrCodeId]: true }));
      
      const response = await fetch(`/api/qrcodes/${qrCodeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update in qrCodesByName object
        setQrCodesByName(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(name => {
            updated[name] = updated[name].map(qr => 
              qr._id === qrCodeId ? { ...qr, isActive: !currentStatus } : qr
            );
          });
          return updated;
        });
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
      
      const response = await fetch(`/api/qrcodes/${qrCodeId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Remove from qrCodesByName object
        setQrCodesByName(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(name => {
            updated[name] = updated[name].filter(qr => qr._id !== qrCodeId);
          });
          return updated;
        });
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
                    <span>Total: {currentQRs.length}</span>
                    <span>Active: {currentQRs.filter(qr => qr.isActive).length}</span>
                  </div>
                </div>
                
                {/* QR Grid */}
                <div className="table-container">
                  <div className="table-wrapper">
                    <table className="theater-table">
                      <thead>
                        <tr>
                          <th className="sno-col">S NO</th>
                          <th className="photo-col">LOGO SELECTION</th>
                          <th className="name-col">QR CODE NAME</th>
                          <th className="owner-col">SEAT CLASS</th>
                          <th className="status-col">STATUS</th>
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

                              {/* Logo Selection Column */}
                              <td className="theater-logo-cell">
                                <span className={`logo-selection-text ${qrCode.logoType === 'theater' ? 'logo-theater' : 'logo-default'}`}>
                                  {qrCode.logoType === 'theater' ? 'THEATER' : 'DEFAULT'}
                                </span>
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
                                    type={qrCode.isActive ? "deactivate" : "activate"}
                                    onClick={() => toggleQRStatus(qrCode._id, qrCode.isActive)}
                                    disabled={actionLoading[qrCode._id]}
                                    title={qrCode.isActive ? 'Deactivate QR' : 'Activate QR'}
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

          <style jsx>{`
            .theater-qr-settings-container {
              max-width: 100%;
              margin: 0;
              background: transparent;
              border-radius: 0;
              box-shadow: none;
              overflow: hidden;
              display: flex;
              min-height: 600px;
              height: 100%;
            }

            .theater-qr-settings-tabs {
              display: flex;
              flex-direction: column;
              background: #f8f8f5;
              border-right: 1px solid #e5e5e0;
              width: 280px;
              min-width: 280px;
              height: 100%;
              min-height: 100%;
            }

            .theater-qr-settings-tab {
              padding: 20px 24px;
              background: none;
              border: none;
              cursor: pointer;
              font-size: 14px;
              font-weight: 500;
              color: #64748b;
              transition: all 0.2s;
              display: flex;
              align-items: center;
              gap: 12px;
              text-align: left;
              border-bottom: 1px solid #e2e8f0;
              position: relative;
            }

            .theater-qr-settings-tab:hover {
              background: #f0f0ed;
              color: #374151;
              transition: all 0.2s ease;
            }

            .theater-qr-settings-tab.active {
              background: #fafaf8;
              color: #6B0E9B;
              border-right: 3px solid #6B0E9B;
              font-weight: 600;
              box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.3);
            }

            .theater-qr-settings-tab.active::before {
              content: '';
              position: absolute;
              left: 0;
              top: 0;
              bottom: 0;
              width: 4px;
              background: #6B0E9B;
            }

            .theater-qr-tab-icon {
              font-size: 18px;
              min-width: 20px;
            }

            .theater-qr-tab-count {
              background: #e2e8f0;
              color: #64748b;
              font-size: 12px;
              font-weight: 600;
              padding: 2px 8px;
              border-radius: 12px;
              min-width: 20px;
              text-align: center;
              margin-left: auto;
            }

            .theater-qr-settings-tab.active .theater-qr-tab-count {
              background: #6B0E9B;
              color: white;
            }

            .theater-qr-settings-content {
              flex: 1;
              padding: 32px;
              background: transparent;
              height: 100%;
              min-height: 100%;
            }

            .theater-qr-settings-section {
              max-width: 1200px;
            }

            .theater-qr-section-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 24px;
              padding-bottom: 16px;
              border-bottom: 1px solid #e2e8f0;
            }

            .theater-qr-section-header h3 {
              margin: 0;
              color: #1e293b;
              font-size: 20px;
              font-weight: 600;
            }

            .theater-qr-section-stats {
              display: flex;
              gap: 16px;
              font-size: 14px;
              color: #64748b;
            }

            .theater-qr-section-stats span {
              font-weight: 500;
            }

            /* Logo Selection Badge Styles */
            .logo-selection-text {
              font-weight: 600;
              font-size: 12px;
              padding: 4px 8px;
              border-radius: 4px;
              text-transform: uppercase;
              letter-spacing: 0.025em;
              display: inline-block;
              min-width: 60px;
            }

            .logo-default {
              background: #e0f2fe;
              color: #0277bd;
              border: 1px solid #b3e5fc;
            }

            .logo-theater {
              background: #f3e5f5;
              color: #6B0E9B;
              border: 1px solid #e1bee7;
            }

            /* Seat Class Info Styling */
            .seat-class-info {
              display: flex;
              flex-direction: column;
              gap: 2px;
            }

            .screen-name {
              font-weight: 500;
              color: #374151;
            }

            .seat-number {
              color: #64748b;
              font-size: 0.875rem;
            }



            /* CRUD Modal Styles */
            .crud-modal-overlay {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(0, 0, 0, 0.75);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 1000;
              padding: 20px;
            }

            .crud-modal {
              background: white;
              border-radius: 16px;
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
              max-width: 600px;
              width: 100%;
              max-height: 90vh;
              overflow: hidden;
              display: flex;
              flex-direction: column;
            }

            .crud-modal-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 24px 32px;
              border-bottom: 1px solid #e2e8f0;
              background: #f8fafc;
            }

            .crud-modal-header h2 {
              margin: 0;
              color: #1e293b;
              font-size: 20px;
              font-weight: 600;
            }

            .crud-modal-close {
              background: none;
              border: none;
              font-size: 24px;
              color: #64748b;
              cursor: pointer;
              padding: 4px;
              border-radius: 4px;
              transition: all 0.2s;
            }

            .crud-modal-close:hover {
              background: #e2e8f0;
              color: #374151;
            }

            .crud-modal-body {
              padding: 32px;
              overflow-y: auto;
              flex: 1;
            }

            .form-group {
              margin-bottom: 24px;
            }

            .form-group:last-child {
              margin-bottom: 0;
            }

            .form-group label {
              display: block;
              margin-bottom: 8px;
              color: #374151;
              font-weight: 500;
              font-size: 14px;
            }

            .form-group input,
            .form-group select {
              width: 100%;
              padding: 12px 16px;
              border: 1px solid #d1d5db;
              border-radius: 8px;
              font-size: 14px;
              transition: all 0.2s;
            }

            .form-group input:focus,
            .form-group select:focus {
              outline: none;
              border-color: #6B0E9B;
              box-shadow: 0 0 0 3px rgba(107, 14, 155, 0.1);
            }

            .form-group input:disabled,
            .form-group select:disabled {
              background: #f3f4f6;
              color: #6b7280;
              cursor: not-allowed;
            }

            .checkbox-group {
              display: flex;
              align-items: center;
              gap: 8px;
            }

            .checkbox-group label {
              margin: 0;
              display: flex;
              align-items: center;
              gap: 8px;
              cursor: pointer;
            }

            .checkbox-group input[type="checkbox"] {
              width: auto;
              margin: 0;
            }

            .qr-preview {
              display: flex;
              justify-content: center;
              align-items: center;
              padding: 20px;
              background: #f8fafc;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
              min-height: 170px;
            }

            .qr-preview-img {
              width: 150px;
              height: 150px;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
              object-fit: cover;
            }

            .qr-image-container {
              position: relative;
              width: 150px;
              height: 150px;
              margin: 0 auto;
            }

            .qr-preview-placeholder {
              text-align: center;
              color: #64748b;
              padding: 20px;
            }

            .qr-preview-placeholder span {
              display: block;
              font-size: 48px;
              margin-bottom: 16px;
              opacity: 0.6;
            }

            .qr-preview-placeholder h4 {
              margin: 0 0 8px 0;
              color: #374151;
              font-size: 16px;
            }

            .qr-preview-placeholder p {
              margin: 0;
              font-size: 14px;
              color: #64748b;
            }

            .qr-preview-error {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: #f9fafb;
              border: 2px dashed #d1d5db;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              text-align: center;
              padding: 16px;
            }

            .qr-error-content {
              max-width: 200px;
            }

            .qr-error-content span {
              display: block;
              font-size: 32px;
              margin-bottom: 12px;
              opacity: 0.6;
            }

            .qr-error-content h4 {
              margin: 0 0 8px 0;
              color: #374151;
              font-size: 14px;
              font-weight: 600;
            }

            .qr-error-content p {
              margin: 0 0 8px 0;
              font-size: 12px;
              color: #64748b;
              line-height: 1.4;
            }

            .qr-error-content ul {
              margin: 8px 0 12px 0;
              padding-left: 16px;
              font-size: 11px;
              color: #64748b;
              text-align: left;
            }

            .qr-error-content li {
              margin-bottom: 2px;
            }

            .qr-error-content button {
              font-size: 12px;
              padding: 6px 12px;
            }

            .stats-group {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
              padding: 16px;
              background: #f8fafc;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
            }

            .stat-item {
              display: flex;
              flex-direction: column;
              gap: 4px;
            }

            .stat-label {
              font-size: 12px;
              color: #64748b;
              font-weight: 500;
            }

            .stat-value {
              font-size: 18px;
              color: #1e293b;
              font-weight: 600;
            }

            .crud-modal-footer {
              padding: 20px 32px;
              border-top: 1px solid #e2e8f0;
              background: #f8fafc;
            }

            .modal-actions-view,
            .modal-actions-edit,
            .modal-actions-create {
              display: flex;
              gap: 12px;
              justify-content: flex-end;
            }

            .btn {
              padding: 10px 20px;
              border: none;
              border-radius: 8px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s;
              font-size: 14px;
              text-transform: none;
            }

            .btn:disabled {
              opacity: 0.5;
              cursor: not-allowed;
              transform: none;
            }

            .btn-primary {
              background: #6B0E9B;
              color: white;
            }

            .btn-primary:hover:not(:disabled) {
              background: #5A0C82;
              transform: translateY(-1px);
            }

            .btn-secondary {
              background: #e5e7eb;
              color: #374151;
            }

            .btn-secondary:hover:not(:disabled) {
              background: #d1d5db;
              transform: translateY(-1px);
            }

            .btn-danger {
              background: #dc2626;
              color: white;
            }

            .btn-danger:hover:not(:disabled) {
              background: #b91c1c;
              transform: translateY(-1px);
            }

            .theater-qr-empty-state {
              grid-column: 1 / -1;
              text-align: center;
              padding: 60px 20px;
              color: #64748b;
            }

            .theater-qr-empty-state-icon {
              font-size: 64px;
              margin-bottom: 16px;
              opacity: 0.6;
            }

            .theater-qr-empty-state h4 {
              font-size: 18px;
              font-weight: 600;
              color: #374151;
              margin: 0 0 8px 0;
            }

            .theater-qr-empty-state p {
              font-size: 14px;
              color: #64748b;
              margin: 0 0 24px 0;
              max-width: 400px;
              margin-left: auto;
              margin-right: auto;
              line-height: 1.5;
            }

            .generate-qr-btn {
              background: #6B0E9B;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s;
              font-size: 14px;
            }

            .generate-qr-btn:hover {
              background: #5A0C82;
              transform: translateY(-1px);
            }

            /* QR Detail Cards */
            .qr-detail-card {
              background: white;
              border-radius: 12px;
              padding: 20px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
              border: 1px solid #e2e8f0;
              transition: all 0.2s ease;
              position: relative;
              overflow: hidden;
            }

            .qr-detail-card:hover {
              box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
              transform: translateY(-2px);
            }

            /* QR Image Section */
            .qr-image {
              position: relative;
              width: 120px;
              height: 120px;
              margin: 0 auto 16px auto;
              border-radius: 8px;
              overflow: hidden;
              background: #f8fafc;
              border: 2px solid #e2e8f0;
            }

            .qr-img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              transition: all 0.2s ease;
            }

            .qr-img.loading {
              opacity: 0.5;
              filter: blur(2px);
            }

            .qr-img.error {
              background: #fee2e2;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #dc2626;
              font-size: 24px;
            }

            /* QR Badges */
            .qr-type-badge {
              position: absolute;
              top: 8px;
              left: 8px;
              background: rgba(255, 255, 255, 0.95);
              padding: 4px 8px;
              border-radius: 6px;
              font-size: 14px;
              font-weight: 600;
              backdrop-filter: blur(8px);
              border: 1px solid rgba(0, 0, 0, 0.05);
            }

            .qr-status-indicator {
              position: absolute;
              top: 8px;
              right: 8px;
              width: 12px;
              height: 12px;
              border-radius: 50%;
              border: 2px solid white;
            }

            .qr-status-indicator.active {
              background: #22c55e;
            }

            .qr-status-indicator.inactive {
              background: #ef4444;
            }

            /* QR Info Section */
            .qr-info {
              text-align: center;
              margin-bottom: 16px;
            }

            .qr-name {
              font-size: 16px;
              font-weight: 600;
              color: #1e293b;
              margin: 0 0 4px 0;
              line-height: 1.4;
            }

            .qr-seat {
              font-size: 14px;
              color: #64748b;
              margin: 0 0 12px 0;
            }

            .qr-stats {
              display: flex;
              justify-content: space-between;
              gap: 8px;
              margin: 12px 0;
              padding: 8px 12px;
              background: #f8fafc;
              border-radius: 6px;
            }

            .qr-stats span {
              font-size: 12px;
              color: #64748b;
              font-weight: 500;
            }

            .qr-status {
              margin-top: 8px;
            }

            .qr-status .status {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.025em;
            }

            .qr-status .status.active {
              background: #dcfce7;
              color: #166534;
            }

            .qr-status .status.inactive {
              background: #fee2e2;
              color: #dc2626;
            }

            /* QR Actions */
            .qr-actions {
              display: flex;
              gap: 8px;
              justify-content: center;
              padding-top: 12px;
              border-top: 1px solid #f1f5f9;
            }

            .action-btn {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 36px;
              height: 36px;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              font-size: 16px;
              transition: all 0.2s ease;
              position: relative;
            }

            .action-btn:hover {
              transform: translateY(-1px);
            }

            .action-btn:disabled {
              opacity: 0.5;
              cursor: not-allowed;
              transform: none;
            }

            /* Action Button Variants */
            .view-btn {
              background: #dbeafe;
              color: #1d4ed8;
              border: 1px solid #93c5fd;
            }

            .view-btn:hover:not(:disabled) {
              background: #93c5fd;
              color: #1e40af;
            }

            .download-btn {
              background: #ecfdf5;
              color: #059669;
              border: 1px solid #86efac;
            }

            .download-btn:hover:not(:disabled) {
              background: #86efac;
              color: #047857;
            }

            .toggle-btn.active {
              background: #fef3c7;
              color: #d97706;
              border: 1px solid #fcd34d;
            }

            .toggle-btn.active:hover:not(:disabled) {
              background: #fcd34d;
              color: #b45309;
            }

            .toggle-btn.inactive {
              background: #dcfce7;
              color: #059669;
              border: 1px solid #86efac;
            }

            .toggle-btn.inactive:hover:not(:disabled) {
              background: #86efac;
              color: #047857;
            }

            .delete-btn {
              background: #fee2e2;
              color: #dc2626;
              border: 1px solid #fca5a5;
            }

            .delete-btn:hover:not(:disabled) {
              background: #fca5a5;
              color: #b91c1c;
            }

            /* Skeleton/Loading States */
            .qr-loading-placeholder {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #f8fafc;
            }

            .qr-skeleton {
              width: 80%;
              height: 80%;
              background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
              background-size: 200% 100%;
              animation: skeleton-loading 1.5s infinite;
              border-radius: 4px;
            }

            @keyframes skeleton-loading {
              0% { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }

            .skeleton-card {
              pointer-events: none;
              opacity: 0.7;
            }

            .skeleton-image {
              background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
              background-size: 200% 100%;
              animation: skeleton-loading 1.5s infinite;
            }

            .skeleton-line {
              height: 12px;
              background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
              background-size: 200% 100%;
              animation: skeleton-loading 1.5s infinite;
              border-radius: 4px;
              margin-bottom: 8px;
            }

            .skeleton-title {
              height: 16px;
              width: 80%;
              margin: 0 auto 12px auto;
            }

            .skeleton-text {
              height: 12px;
              width: 60%;
              margin: 0 auto 8px auto;
            }

            .skeleton-stats {
              height: 10px;
              width: 100%;
              margin: 12px 0;
            }

            .skeleton-button {
              width: 36px;
              height: 36px;
              background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
              background-size: 200% 100%;
              animation: skeleton-loading 1.5s infinite;
              border-radius: 8px;
            }

            .lazy-qr-container {
              position: relative;
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            @media (max-width: 768px) {
              .theater-qr-settings-container {
                flex-direction: column;
                min-height: auto;
              }

              .theater-qr-settings-tabs {
                flex-direction: row;
                width: 100%;
                min-width: 100%;
                border-right: none;
                border-bottom: 1px solid #e2e8f0;
                overflow-x: auto;
              }

              .theater-qr-settings-tab {
                min-width: 140px;
                padding: 16px 20px;
                border-bottom: none;
                border-right: 1px solid #e2e8f0;
                justify-content: center;
              }

              .theater-qr-settings-tab.active {
                border-right: 1px solid #e2e8f0;
                border-bottom: 3px solid #6B0E9B;
              }

              .theater-qr-settings-tab.active::before {
                display: none;
              }

              .theater-qr-settings-content {
                padding: 20px;
              }



              .crud-modal {
                margin: 10px;
                max-width: none;
                max-height: 90vh;
              }

              .crud-modal-body {
                padding: 24px;
              }

              .crud-modal-header {
                padding: 20px 24px;
              }

              .crud-modal-footer {
                padding: 16px 24px;
              }

              .modal-actions-view,
              .modal-actions-edit,
              .modal-actions-create {
                flex-direction: column;
              }

              .btn {
                width: 100%;
              }

              .theater-qr-tab-icon {
                font-size: 16px;
              }
            }
          `}</style>
        </PageContainer>
        </div>
      </AdminLayout>
    </ErrorBoundary>
  );
};

export default TheaterQRDetail;
