import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import config from '../config';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';
import ErrorBoundary from '../components/ErrorBoundary';
import Pagination from '../components/Pagination';
import { useModal } from '../contexts/ModalContext';
import { clearTheaterCache, addCacheBuster } from '../utils/cacheManager';
import { usePerformanceMonitoring, preventLayoutShift } from '../hooks/usePerformanceMonitoring';
import '../styles/QRManagementPage.css';
import '../styles/TheaterList.css';

// Enhanced Lazy Loading Image Component with Intersection Observer (matching TheaterList)
const LazyTheaterImage = React.memo(({ src, alt, className, style }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    // Reset states when src changes
    setIsLoading(true);
    setHasError(false);
    setImageSrc(null);
    
    if (!src) {
      setIsLoading(false);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsIntersecting(true);
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

  useEffect(() => {
    if (isIntersecting && src && !imageSrc) {
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
    }
  }, [isIntersecting, src, imageSrc]);

  if (!src) {
    return (
      <div className="no-logo" ref={imgRef}>
        <svg viewBox="0 0 24 24" fill="currentColor" style={{width: '24px', height: '24px', color: '#8b5cf6'}}>
          <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z"/>
        </svg>
      </div>
    );
  }

  return (
    <div className="lazy-theater-container" style={style} ref={imgRef}>
      {imageSrc && !isLoading ? (
        <img
          src={imageSrc}
          alt={alt}
          className={`${className} ${hasError ? 'error' : ''}`}
          style={style}
        />
      ) : isLoading ? (
        <div className="image-loading-placeholder">
          <div className="image-skeleton"></div>
        </div>
      ) : hasError ? (
        <div className="no-logo">
          <svg viewBox="0 0 24 24" fill="currentColor" style={{width: '24px', height: '24px', color: '#8b5cf6'}}>
            <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z"/>
          </svg>
        </div>
      ) : null}
    </div>
  );
});

LazyTheaterImage.displayName = 'LazyTheaterImage';

// Skeleton component for table rows (matching TheaterList pattern)
const TableRowSkeleton = React.memo(() => (
  <tr className="skeleton-row">
    <td><div className="skeleton-text"></div></td>
    <td>
      <div className="theater-info-skeleton">
        <div className="skeleton-image"></div>
        <div className="skeleton-text"></div>
      </div>
    </td>
    <td><div className="skeleton-text"></div></td>
    <td><div className="skeleton-text"></div></td>
    <td><div className="skeleton-text"></div></td>
  </tr>
));

TableRowSkeleton.displayName = 'TableRowSkeleton';

const QRManagement = () => {
  const navigate = useNavigate();
  const { showError } = useModal();
  
  // PERFORMANCE MONITORING: Track page performance metrics
  usePerformanceMonitoring('QRManagement');
  
  // Data state
  const [managementData, setManagementData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState({
    totalTheaters: 0,
    totalCanteenQRs: 0,
    totalScreenQRs: 0,
    totalQRs: 0
  });
  
  // Pagination state (matching TheaterList)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [pagination, setPagination] = useState({});
  
  // Filter state with debounced search
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  // Performance refs (matching TheaterList)
  const searchTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Sort management data by ID in ascending order
  const sortedManagementData = useMemo(() => {
    return [...managementData].sort((a, b) => {
      // Sort by MongoDB ObjectId in ascending order (chronological creation order)
      const idA = a._id || '';
      const idB = b._id || '';
      return idA.localeCompare(idB);
    });
  }, [managementData]);

  // Debounced search effect (matching TheaterList)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page when searching
    }, 500); // PERFORMANCE: 500ms debounce to reduce API calls

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // Load management data with pagination and search
  useEffect(() => {
    loadManagementData();
  }, [currentPage, debouncedSearchTerm, itemsPerPage]);

  // Initial data load on component mount
  useEffect(() => {
    loadManagementData();
  }, []);

  const loadManagementData = useCallback(async () => {
    try {
      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();
      
      setLoading(true);
      setError('');
      
      // Build query parameters with pagination
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        isActive: 'true' // Only fetch active theaters
      });
      
      if (debouncedSearchTerm.trim()) {
        params.append('search', debouncedSearchTerm.trim());
      }
      
      // PERFORMANCE OPTIMIZATION: Use theaters API to get theater list and QR data
      const baseUrl = `${config.api.baseUrl}/theaters?${params.toString()}`;
      const cacheBustedUrl = addCacheBuster(baseUrl);
      
      
      const response = await fetch(cacheBustedUrl, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate', // Force fresh data
          'Pragma': 'no-cache',
          'Expires': '0',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch QR management data');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Process theaters data from theaters API
        const theaters = data.data || [];
        setManagementData(theaters);
        
        // Handle pagination data from theaters API
        const paginationData = data.pagination || {};
        setPagination(paginationData);
        setTotalPages(paginationData.totalPages || 0);
        setTotalItems(paginationData.totalItems || 0);
        
        // Calculate QR statistics from theaters data
        const totalTheaters = theaters.length;
        let totalCanteenQRs = 0;
        let totalScreenQRs = 0;
        
        theaters.forEach(theater => {
          // Count QR codes from theater data if available
          if (theater.qrCodes) {
            theater.qrCodes.forEach(qr => {
              if (qr.type === 'canteen') totalCanteenQRs++;
              else if (qr.type === 'screen') totalScreenQRs++;
            });
          }
        });
        
        setSummary({
          totalTheaters,
          totalCanteenQRs,
          totalScreenQRs,
          totalQRs: totalCanteenQRs + totalScreenQRs
        });
      } else {
        setError('Failed to load QR management data');
      }
    } catch (error) {
      // Handle AbortError gracefully
      if (error.name === 'AbortError') {
        console.log('QR Management request was cancelled');
        return;
      }
      setError('Failed to load QR management data');
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearchTerm, itemsPerPage]);

  // Pagination handlers (matching TheaterList)
  const handlePageChange = useCallback((newPage) => {
    setCurrentPage(newPage);
  }, []);

  const handleItemsPerPageChange = useCallback((e) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1); // Reset to first page when changing items per page
  }, []);

  // Cleanup effect for aborting requests (matching TheaterList)
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const viewTheaterQRs = (theater) => {
    // Navigate to theater-specific QR management page
    navigate(`/qr-theater/${theater._id}`, { 
      state: { 
        theater,
        canteenQRCount: theater.canteenQRCount,
        screenQRCount: theater.screenQRCount
      }
    });
  };

  const headerButton = (
    <button 
      className="header-btn"
      onClick={() => navigate('/qr-generate')}
    >
      <span className="btn-icon">
        <svg viewBox="0 0 24 24" fill="currentColor" style={{width: '20px', height: '20px'}}>
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
      </span>
      Generate QR Codes
    </button>
  );

  return (
    <ErrorBoundary>
      <AdminLayout pageTitle="QR Management" currentPage="qr-list">
        <PageContainer
          title="QR Code Management"
          headerButton={headerButton}
        >
        {/* Stats Section */}
        <div className="qr-stats">
          <div className="stat-card">
            <div className="stat-number">{summary.totalTheaters}</div>
            <div className="stat-label">Total Theaters</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{summary.totalCanteenQRs}</div>
            <div className="stat-label">Canteen QRs</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{summary.totalScreenQRs}</div>
            <div className="stat-label">Screen QRs</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{summary.totalQRs}</div>
            <div className="stat-label">Total QR Codes</div>
          </div>
        </div>

        {/* Enhanced Filters Section matching TheaterList */}
        <div className="theater-filters">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search theaters by name, city, or owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-controls">
            <select
              value="all"
              className="status-filter"
              disabled
            >
              <option value="all">All Status</option>
            </select>
            <div className="results-count">
              Showing {sortedManagementData.length} of {totalItems} theaters (Page {currentPage} of {totalPages})
            </div>
            <div className="items-per-page">
              <label>Items per page:</label>
              <select value={itemsPerPage} onChange={handleItemsPerPageChange} className="items-select">
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Management Table */}
        <div className="page-table-container">
          {/* {error && (
            <div className="error-message">
              <p>{error}</p>
              <button onClick={() => loadManagementData()} className="retry-btn">
                Try Again
              </button>
            </div>
          )} */}
          <table className="qr-management-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Logo</th>
                <th>Theater Name</th>
                <th>Canteen QR Count</th>
                <th>Screen QR Count</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }, (_, index) => (
                  <TableRowSkeleton key={`skeleton-${index}`} />
                ))
              ) : sortedManagementData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="no-data">
                    <div className="empty-state">
                      <svg viewBox="0 0 24 24" fill="currentColor" style={{width: '48px', height: '48px', opacity: 0.3}}>
                        <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z"/>
                      </svg>
                      <p>No theaters found</p>
                      <button 
                        className="btn-primary" 
                        onClick={() => navigate('/add-theater')}
                      >
                        CREATE YOUR FIRST THEATER
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedManagementData.map((theater, index) => (
                  <tr key={theater._id} className="theater-row">
                    <td className="serial-number">{((currentPage - 1) * itemsPerPage) + index + 1}</td>
                    <td className="theater-logo-cell">
                      {/* Fixed: Use branding.logoUrl like in TheaterList (not just logoUrl) */}
                      {(theater.documents?.logo || theater.branding?.logo || theater.branding?.logoUrl) ? (
                        <img
                          src={theater.documents?.logo || theater.branding?.logo || theater.branding?.logoUrl}
                          alt={theater.name}
                          className="theater-logo"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className="no-logo" style={{display: (theater.documents?.logo || theater.branding?.logo || theater.branding?.logoUrl) ? 'none' : 'flex'}}>
                        <svg viewBox="0 0 24 24" fill="currentColor" style={{width: '24px', height: '24px', color: '#8b5cf6'}}>
                          <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z"/>
                        </svg>
                      </div>
                    </td>
                    <td className="theater-name-cell">
                      <div className="theater-name">{theater.name || 'No Name'}</div>
                    </td>
                    <td className="qr-count">
                      <span className="count-badge canteen-badge">
                        {theater.canteenQRCount || 0}
                      </span>
                    </td>
                    <td className="qr-count">
                      <span className="count-badge screen-badge">
                        {theater.screenQRCount || 0}
                      </span>
                    </td>
                    <td className="actions">
                      <button
                        className="action-btn view-btn"
                        onClick={() => viewTheaterQRs(theater)}
                        title={`View QR Codes (${theater.totalQRCount || 0} total)`}
                        disabled={(theater.totalQRCount || 0) === 0}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" style={{width: '20px', height: '20px'}}>
                          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination - Global Component */}
        {!loading && (
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            itemType="theaters"
          />
        )}

        <div className="management-footer">
          <p>
            {debouncedSearchTerm ? (
              `Showing ${totalItems} of ${summary.totalTheaters} theaters matching "${debouncedSearchTerm}"`
            ) : (
              `Total: ${summary.totalTheaters} theaters, ${summary.totalQRs} QR codes`
            )}
          </p>
        </div>
      </PageContainer>
    </AdminLayout>
  </ErrorBoundary>
  );
};

export default QRManagement;
