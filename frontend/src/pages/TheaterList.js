import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import config from '../config';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import ErrorBoundary from '../components/ErrorBoundary';
import { ActionButton, ActionButtons } from '../components/ActionButton';
import Pagination from '../components/Pagination';
import { useModal } from '../contexts/ModalContext';
import { clearTheaterCache, addCacheBuster } from '../utils/cacheManager';
import { usePerformanceMonitoring } from '../hooks/usePerformanceMonitoring';
import '../styles/TheaterList.css';
import '../styles/QRManagementPage.css';

// Lazy Loading Image Component
const LazyImage = React.memo(({ src, alt, className, style, fallback = '/placeholder-theater.png' }) => {
  const [imageSrc, setImageSrc] = useState(fallback);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && src && src !== fallback) {
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
  }, [src, fallback]);

  return (
    <div className="lazy-image-container" style={style}>
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        className={`${className} ${isLoading ? 'loading' : ''} ${hasError ? 'error' : ''}`}
        style={style}
      />
      {isLoading && (
        <div className="image-loading-placeholder">
          <div className="image-skeleton"></div>
        </div>
      )}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';

// Loading Skeleton Components
const TheaterCardSkeleton = React.memo(() => (
  <div className="theater-card skeleton-card">
    <div className="theater-card-image skeleton-image"></div>
    <div className="theater-card-content">
      <div className="skeleton-line skeleton-title"></div>
      <div className="skeleton-line skeleton-subtitle"></div>
      <div className="skeleton-line skeleton-text"></div>
      <div className="skeleton-buttons">
        <div className="skeleton-button"></div>
        <div className="skeleton-button"></div>
      </div>
    </div>
  </div>
));

TheaterCardSkeleton.displayName = 'TheaterCardSkeleton';

const TheaterListSkeleton = React.memo(({ count = 6 }) => (
  <div className="theaters-grid">
    {Array.from({ length: count }, (_, index) => (
      <TheaterCardSkeleton key={`skeleton-${index}`} />
    ))}
  </div>
));

TheaterListSkeleton.displayName = 'TheaterListSkeleton';

// Table Skeleton Component
const TableSkeletonRow = React.memo(() => (
  <tr className="theater-row skeleton-row">
    <td className="sno-cell">
      <div className="skeleton-line skeleton-small"></div>
    </td>
    <td className="photo-cell">
      <div className="theater-photo-thumb skeleton-image"></div>
    </td>
    <td className="name-cell">
      <div className="skeleton-line skeleton-medium"></div>
    </td>
    <td className="owner-cell">
      <div className="skeleton-line skeleton-medium"></div>
    </td>
    <td className="location-cell">
      <div className="skeleton-line skeleton-small"></div>
    </td>
    <td className="contact-cell">
      <div className="skeleton-line skeleton-small"></div>
    </td>
    <td className="agreement-cell">
      <div className="skeleton-line skeleton-small"></div>
    </td>
    <td className="status-cell">
      <div className="skeleton-line skeleton-small"></div>
    </td>
    <td className="actions-cell">
      <div className="skeleton-buttons">
        <div className="skeleton-button skeleton-small"></div>
        <div className="skeleton-button skeleton-small"></div>
      </div>
    </td>
  </tr>
));

TableSkeletonRow.displayName = 'TableSkeletonRow';

const TableSkeleton = React.memo(({ count = 10 }) => (
  <>
    {Array.from({ length: count }, (_, index) => (
      <TableSkeletonRow key={`table-skeleton-${index}`} />
    ))}
  </>
));

TableSkeleton.displayName = 'TableSkeleton';

// Memoized Theater Row Component to prevent unnecessary re-renders
const TheaterRow = React.memo(({ theater, index, onEdit, onView, onDelete }) => (
  <tr key={theater._id}>
    <td>{theater.name || 'N/A'}</td>
    <td>{theater.ownerDetails?.name || 'N/A'}</td>
    <td>{theater.phone || 'N/A'}</td>
    <td>{theater.address ? `${theater.address.city}, ${theater.address.state}` : 'N/A'}</td>
    <td>
      <span className={`status ${theater.isActive ? 'active' : 'inactive'}`}>
        {theater.isActive ? 'Active' : 'Inactive'}
      </span>
    </td>
    <td className="actions-cell">
      <ActionButtons>
        <ActionButton 
          type="view"
          onClick={() => onView(theater, index)}
          title="View theater details"
        />
        <ActionButton 
          type="edit"
          onClick={() => onEdit(theater, index)}
          title="Edit theater"
        />
        <ActionButton 
          type="delete"
          onClick={() => onDelete(theater)}
          title="Delete theater"
        />
      </ActionButtons>
    </td>
  </tr>
));

TheaterRow.displayName = 'TheaterRow';

const TheaterList = () => {
  const navigate = useNavigate();
  const modal = useModal();
  
  // PERFORMANCE MONITORING: Track page performance metrics
  usePerformanceMonitoring('TheaterList');
  
  const [theaters, setTheaters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState({ show: false, theater: null });
  const [viewModal, setViewModal] = useState({ show: false, theater: null, currentIndex: 0 });
  const [editModal, setEditModal] = useState({ show: false, theater: null, currentIndex: 0 });
  const [editFormData, setEditFormData] = useState({});
  const [uploadFiles, setUploadFiles] = useState({
    theaterPhoto: null,
    logo: null,
    aadharCard: null,
    panCard: null,
    gstCertificate: null,
    businessLicense: null,
    agreementDocument: null
  });
  const [uploadProgress, setUploadProgress] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Sort theaters by ID in ascending order
  const sortedTheaters = useMemo(() => {
    return [...theaters].sort((a, b) => {
      // Sort by MongoDB ObjectId in ascending order (chronological creation order)
      const idA = a._id || '';
      const idB = b._id || '';
      return idA.localeCompare(idB);
    });
  }, [theaters]);

  // Helper function to close modal with cleanup
  const closeEditModal = useCallback(() => {
    // Clear upload files and progress
    setUploadFiles({
      theaterPhoto: null,
      logo: null,
      aadharCard: null,
      panCard: null,
      gstCertificate: null,
      businessLicense: null,
      agreementDocument: null
    });
    
    setUploadProgress({});
    
    // Close modal
    setEditModal({ show: false, theater: null, currentIndex: 0 });
  }, []);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [pagination, setPagination] = useState({});

  // Performance refs (matching QRManagement)
  const searchTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Debounced search effect (matching QRManagement)
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

  // Clear any cached data on component mount
  useEffect(() => {
    console.log('🚀 TheaterList component mounted - clearing all caches');
    clearTheaterCache();
  }, []);

  useEffect(() => {
    fetchTheaters();
  }, [currentPage, debouncedSearchTerm, filterStatus, itemsPerPage]);

  const fetchTheaters = useCallback(async () => {
    try {
      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();
      
      setLoading(true);
      setError('');
      
      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        isActive: 'true' // 🔥 SOFT DELETE: Only fetch active theaters (deleted ones stay in DB but hidden from UI)
      });
      
      if (debouncedSearchTerm.trim()) {
        params.append('q', debouncedSearchTerm.trim());
      }
      
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      
      // PERFORMANCE OPTIMIZATION: Add cache headers but bust cache when needed
      const baseUrl = `${config.api.baseUrl}/theaters?${params.toString()}`;
      const cacheBustedUrl = addCacheBuster(baseUrl);
      
      console.log('🌐 Fetching theaters from:', cacheBustedUrl);
      console.log('🔧 FIXED API URL - Using config.api.baseUrl:', config.api.baseUrl);
      
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
        throw new Error('Failed to fetch theaters');
      }
      const result = await response.json();
      
      // PERFORMANCE OPTIMIZATION: Direct state update without expensive comparison
      const newTheaters = result.data || [];
      setTheaters(newTheaters);
      
      // PERFORMANCE OPTIMIZATION: Batch pagination state updates
      const paginationData = result.pagination || {};
      setPagination(paginationData);
      setTotalPages(paginationData.totalPages || 0);
      setTotalItems(paginationData.totalItems || 0);
    } catch (error) {
      // Handle AbortError gracefully
      if (error.name === 'AbortError') {
        console.log('Request was cancelled');
        return;
      }
      console.error('Error fetching theaters:', error);
      setError('Failed to load theaters');
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearchTerm, filterStatus, itemsPerPage]);

  const handleDelete = useCallback(async (theaterId) => {
    try {
      const token = config.helpers.getAuthToken();
      console.log('🔐 Delete Debug - Token exists:', !!token);
      console.log('🎯 Delete Debug - Theater ID:', theaterId);
      console.log('🌐 Delete Debug - API URL:', `${config.api.baseUrl}/theaters/${theaterId}`);
      
      const response = await fetch(`${config.api.baseUrl}/theaters/${theaterId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...token ? { 'Authorization': `Bearer ${token}` } : {}
        }
      });

      console.log('📡 Delete Debug - Response status:', response.status);
      console.log('📡 Delete Debug - Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Delete Debug - Error response:', errorText);
        throw new Error(`Failed to delete theater: ${response.status} ${errorText}`);
      }

      // CRITICAL FIX: Update local state immediately for instant UI feedback
      // Remove from display (soft deleted theater won't appear in future fetches)
      setTheaters(prevTheaters => 
        prevTheaters.filter(theater => theater._id !== theaterId)
      );
      
      // CACHE INVALIDATION: Clear ALL theater-related cache aggressively
      console.log('🧹 Clearing cache after theater deletion');
      clearTheaterCache();
      
      // Close modal and show success message
      setDeleteModal({ show: false, theater: null });
      modal.showSuccess('Theater removed from display (data preserved in database)');
      
      // Optional: Background refresh to ensure server consistency (no await to avoid blocking)
      setTimeout(() => {
        fetchTheaters().catch(error => {
          console.warn('Background refresh after delete failed:', error);
        });
      }, 100); // Small delay to ensure cache is cleared
    } catch (error) {
      console.error('Error deleting theater:', error);
      modal.showError('Failed to delete theater');
    }
  }, [modal]);

  const handleEditClick = useCallback((theater) => {
    console.log('Theater data:', theater); // Debug log
    const currentIndex = sortedTheaters.findIndex(t => t._id === theater._id);
    setEditFormData({
      theaterName: theater.name || '',
      ownerName: theater.ownerDetails?.name || '',
      ownerContactNumber: theater.ownerDetails?.contactNumber || '',
      phone: theater.phone || '',
      email: theater.email || '',
      businessType: theater.businessType || '',
      address: theater.address?.street || '',
      city: theater.address?.city || '',
      state: theater.address?.state || '',
      pincode: theater.address?.pincode || theater.address?.zipCode || ''
    });
    // Reset upload files when opening edit modal
    setUploadFiles({
      theaterPhoto: null,
      logo: null,
      aadharCard: null,
      panCard: null,
      gstCertificate: null,
      businessLicense: null,
      agreementDocument: null
    });
    setUploadProgress({});
    setEditModal({ show: true, theater, currentIndex });
  }, [sortedTheaters]);

  const handleViewClick = useCallback((theater) => {
    const currentIndex = sortedTheaters.findIndex(t => t._id === theater._id);
    setViewModal({ show: true, theater, currentIndex });
  }, [sortedTheaters]);

  // Navigation functions for modals
  const navigateModal = useCallback((direction, modalType) => {
    const isEdit = modalType === 'edit';
    const currentModal = isEdit ? editModal : viewModal;
    const setModal = isEdit ? setEditModal : setViewModal;
    
    if (!currentModal.show || sortedTheaters.length === 0) return;
    
    let newIndex;
    if (direction === 'next') {
      newIndex = (currentModal.currentIndex + 1) % sortedTheaters.length;
    } else {
      newIndex = (currentModal.currentIndex - 1 + sortedTheaters.length) % sortedTheaters.length;
    }
    
    const newTheater = sortedTheaters[newIndex];
    
    if (isEdit) {
      setEditFormData({
        theaterName: newTheater.name || '',
        ownerName: newTheater.ownerDetails?.name || '',
        ownerContactNumber: newTheater.ownerDetails?.contactNumber || '',
        phone: newTheater.phone || '',
        email: newTheater.email || '',
        businessType: newTheater.businessType || '',
        address: newTheater.address?.street || '',
        city: newTheater.address?.city || '',
        state: newTheater.address?.state || '',
        pincode: newTheater.address?.pincode || newTheater.address?.zipCode || ''
      });
    }
    
    setModal({ show: true, theater: newTheater, currentIndex: newIndex });
  }, [sortedTheaters, editModal, viewModal]);

  const handleNextTheater = useCallback((modalType) => {
    navigateModal('next', modalType);
  }, [navigateModal]);

  const handlePrevTheater = useCallback((modalType) => {
    navigateModal('prev', modalType);
  }, [navigateModal]);

  const handleEditFormChange = useCallback((field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleFileChange = useCallback((fileType, file) => {
    setUploadFiles(prev => ({
      ...prev,
      [fileType]: file
    }));
  }, []);

  // New handler for the integrated upload fields
  const handleFileUpload = useCallback((event, fileType) => {
    const file = event.target.files[0];
    if (file) {
      setUploadFiles(prev => ({
        ...prev,
        [fileType]: file
      }));
    }
  }, []);

  // Handler for removing existing files
  const handleRemoveFile = useCallback((fileType) => {
    // Show confirmation dialog
    if (window.confirm(`Are you sure you want to remove this ${fileType.replace(/([A-Z])/g, ' $1').toLowerCase()}?`)) {
      // This would typically call an API to remove the file from server
      console.log(`Removing ${fileType} file`);
      // For now, we'll just show a message that the file will be removed
      alert(`${fileType.replace(/([A-Z])/g, ' $1')} will be removed when you save changes`);
    }
  }, []);

  const uploadFile = async (file, fileType) => {
    if (!file) return null;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileType', fileType);
    formData.append('theaterId', editModal.theater._id);

    try {
      setUploadProgress(prev => ({ ...prev, [fileType]: 0 }));
      
      const response = await fetch(`${config.api.baseUrl}/upload/theater-document`, {
        method: 'POST',
        body: formData,
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(prev => ({ ...prev, [fileType]: progress }));
        }
      });

      if (!response.ok) {
        throw new Error('File upload failed');
      }

      const result = await response.json();
      setUploadProgress(prev => ({ ...prev, [fileType]: 100 }));
      
      return result.fileUrl || result.url;
    } catch (error) {
      console.error(`Error uploading ${fileType}:`, error);
      setUploadProgress(prev => ({ ...prev, [fileType]: null }));
      throw error;
    }
  };

  const handleEditSubmit = async () => {
    try {
      // Create FormData to handle both files and form fields
      const formData = new FormData();
      
      // Add form fields
      if (editFormData.theaterName) formData.append('name', editFormData.theaterName);
      if (editFormData.ownerName) formData.append('ownerName', editFormData.ownerName);
      if (editFormData.ownerContactNumber) formData.append('ownerContactNumber', editFormData.ownerContactNumber);
      if (editFormData.phone) formData.append('phone', editFormData.phone);
      if (editFormData.email) formData.append('email', editFormData.email);
      if (editFormData.address) formData.append('address', editFormData.address);
      if (editFormData.city) formData.append('city', editFormData.city);
      if (editFormData.state) formData.append('state', editFormData.state);
      if (editFormData.pincode) formData.append('pincode', editFormData.pincode);
      if (editFormData.businessType) formData.append('businessType', editFormData.businessType);
      
      // Add any new files
      const fileTypes = Object.keys(uploadFiles);
      for (const fileType of fileTypes) {
        if (uploadFiles[fileType]) {
          formData.append(fileType, uploadFiles[fileType]);
        }
      }

      console.log('Sending update with FormData'); // Debug log

      const response = await fetch(`${config.api.baseUrl}/theaters/${editModal.theater._id}`, {
        method: 'PUT',
        headers: {
          // Don't set Content-Type header - browser will set it automatically with boundary for FormData
          ...config.helpers.getAuthToken() ? { 'Authorization': `Bearer ${config.helpers.getAuthToken()}` } : {}
        },
        body: formData
      });

      console.log('Response status:', response.status); // Debug log

      if (!response.ok) {
        const errorData = await response.text();
        console.error('API Error:', errorData);
        throw new Error('Failed to update theater');
      }

      const responseData = await response.json();
      console.log('API Response:', responseData); // Debug log
      
      // Handle different response formats
      const updatedTheater = responseData.data || responseData;
      console.log('Updated theater data:', updatedTheater); // Debug log
      
      // First, update the local state immediately for instant feedback
      setTheaters(prevTheaters => 
        prevTheaters.map(theater => 
          theater._id === editModal.theater._id ? { ...theater, ...updatedTheater } : theater
        )
      );
      
      // Update the current modal theater with the updated data
      setEditModal(prevModal => ({
        ...prevModal,
        theater: updatedTheater
      }));
      
      // Clear uploaded files and progress immediately for better UX
      setUploadFiles({
        theaterPhoto: null,
        logo: null,
        aadharCard: null,
        panCard: null,
        gstCertificate: null,
        businessLicense: null,
        agreementDocument: null
      });
      setUploadProgress({});
      
      // Show success message and close modal for instant feedback
      modal.showSuccess('Theater updated successfully!');
      closeEditModal();
      
      // Optional: Background refresh for data consistency (no await to avoid blocking)
      fetchTheaters().catch(error => {
        console.warn('Background refresh failed:', error);
        // No user-facing error since local update already succeeded
      });
    } catch (error) {
      console.error('Error updating theater:', error);
      modal.showError('Failed to update theater');
    }
  };

  const toggleTheaterStatus = async (theaterId, currentStatus) => {
    try {
      const response = await fetch(`${config.api.baseUrl}/theaters/${theaterId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...config.helpers.getAuthToken() ? { 'Authorization': `Bearer ${config.helpers.getAuthToken()}` } : {}
        },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update theater status');
      }

      // Refresh the current page to get updated data
      fetchTheaters();
    } catch (error) {
      console.error('Error updating theater status:', error);
      modal.showError('Failed to update theater status');
    }
  };

  // Handle search with debounce
  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
    // currentPage reset is handled in debounced effect
  }, []);

  // Handle filter change
  const handleFilterChange = useCallback((e) => {
    setFilterStatus(e.target.value);
    setCurrentPage(1); // Reset to first page when filtering
  }, []);

  // Pagination handlers (matching QRManagement)
  const handlePageChange = useCallback((newPage) => {
    setCurrentPage(newPage);
  }, []);

  // Handle items per page change
  const handleItemsPerPageChange = useCallback((e) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1); // Reset to first page when changing items per page
  }, []);

  // Cleanup effect for aborting requests (matching QRManagement)
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

  if (loading) {
    return (
      <AdminLayout pageTitle="Theater Management" currentPage="theaters">
        <div className="theater-list-container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading theaters...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout pageTitle="Theater Management" currentPage="theaters">
        <div className="theater-list-container">
          <div className="error-state">
            <h3>Error Loading Theaters</h3>
            <p>{error}</p>
            <button onClick={fetchTheaters} className="retry-btn">
              Try Again
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <ErrorBoundary>
      <AdminLayout pageTitle="Theater Management" currentPage="theaters">
      <div className="theater-list-container">
        {/* Main Theater Management Container */}
        <div className="theater-main-container">
          {/* Header */}
          <div className="theater-list-header">
            <div className="header-content">
              <h1>Theater Management</h1>
            </div>
            <button 
              onClick={() => navigate('/add-theater')} 
              className="add-theater-btn"
            >
              <span className="btn-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" style={{width: '20px', height: '20px'}}>
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
              </span>
              Add New Theater
            </button>
          </div>

          {/* Stats Section */}
          <div className="qr-stats">
            <div className="stat-card">
              <div className="stat-number">{totalItems || 0}</div>
              <div className="stat-label">Total Theaters</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{theaters.filter(theater => theater.status === 'active').length || 0}</div>
              <div className="stat-label">Active Theaters</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{theaters.filter(theater => theater.status === 'inactive').length || 0}</div>
              <div className="stat-label">Inactive Theaters</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{theaters.filter(theater => theater.agreement?.status === 'active').length || 0}</div>
              <div className="stat-label">Active Agreements</div>
            </div>
          </div>

          {/* Theater Content Container */}
          <div className="theater-content">
          {/* Filters and Search */}
          <div className="theater-filters">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search theaters by name, city, or owner..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="search-input"
            />
          </div>
          <div className="filter-controls">
            <select
              value={filterStatus}
              onChange={handleFilterChange}
              className="status-filter"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
            <div className="results-count">
              Showing {sortedTheaters.length} of {totalItems} theaters (Page {currentPage} of {totalPages})
            </div>
            <div className="items-per-page">
              <label>Items per page:</label>
              <select value={itemsPerPage} onChange={handleItemsPerPageChange} className="items-select">
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Theater Table */}
        {sortedTheaters.length === 0 && !loading ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="currentColor" style={{width: '48px', height: '48px', color: 'var(--text-gray)'}}>
                <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z"/>
              </svg>
            </div>
            <h3>No Theaters Found</h3>
            <p>
              {searchTerm || filterStatus !== 'all' 
                ? 'No theaters match your current filters.'
                : 'Start by adding your first theater to the network.'
              }
            </p>
            {!searchTerm && filterStatus === 'all' && (
              <button 
                onClick={() => navigate('/add-theater')} 
                className="add-theater-btn"
              >
                Add Your First Theater
              </button>
            )}
          </div>
        ) : (
          <div className="table-container">
            <div className="table-wrapper">
              <table className="theater-table">
                <thead>
                  <tr>
                    <th className="sno-col">S NO</th>
                    <th className="photo-col">Photo</th>
                    <th className="name-col">Theater Name</th>
                    <th className="owner-col">Owner</th>
                    <th className="location-col">Location</th>
                    <th className="contact-col">Contact</th>
                    <th className="agreement-col">Agreement Period</th>
                    <th className="status-col">Status</th>
                    <th className="actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSkeleton count={itemsPerPage} />
                  ) : (
                    sortedTheaters.map((theater, index) => (
                      <tr key={theater._id} className={`theater-row ${!theater.isActive ? 'inactive' : ''}`}>
                      {/* S NO Column */}
                      <td className="sno-cell">
                        <div className="sno-number">{(currentPage - 1) * itemsPerPage + index + 1}</div>
                      </td>

                      {/* Logo Column */}
                      <td className="theater-logo-cell">
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

                      {/* Theater Name Column */}
                      <td className="theater-name-cell">
                        <div className="theater-name-full">{theater.name}</div>
                      </td>

                      {/* Owner Column */}
                      <td className="owner-cell">
                        <div className="owner-info">
                          <div className="owner-name">{theater.ownerDetails?.name || 'N/A'}</div>
                        </div>
                      </td>

                      {/* Location Column */}
                      <td className="location-cell">
                        <div className="location-info">
                          <div className="city">{theater.address?.city || 'N/A'}</div>
                          <div className="state">{theater.address?.state || 'N/A'}</div>
                          <div className="pincode">{theater.address?.pincode || theater.address?.zipCode || 'N/A'}</div>
                        </div>
                      </td>

                      {/* Contact Column */}
                      <td className="contact-cell">
                        <div className="contact-info">
                          <div className="phone">
                            <svg viewBox="0 0 24 24" fill="currentColor" style={{width: '14px', height: '14px', display: 'inline', marginRight: '6px'}}>
                              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                            </svg>
                            {theater.phone}
                          </div>
                        </div>
                      </td>

                      {/* Agreement Column */}
                      <td className="agreement-cell">
                        <div className="agreement-info">
                          {theater.agreementDetails?.startDate && theater.agreementDetails?.endDate ? (
                            <>
                              <div className="start-date">
                                From: {new Date(theater.agreementDetails.startDate).toLocaleDateString()}
                              </div>
                              <div className="end-date">
                                To: {new Date(theater.agreementDetails.endDate).toLocaleDateString()}
                              </div>
                            </>
                          ) : (
                            <div className="no-agreement">
                              <span style={{color: '#999', fontSize: '0.9em'}}>No agreement dates</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status Column */}
                      <td className="status-cell">
                        <span className={`status-badge ${theater.isActive ? 'active' : 'inactive'}`}>
                          {theater.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions Column */}
                      <td className="actions-cell">
                        <ActionButtons>
                          <ActionButton 
                            type="view"
                            onClick={() => {
                              console.log('View theater data:', theater); // Debug log
                              handleViewClick(theater);
                            }}
                            title="View Theater Details"
                          />
                          
                          <ActionButton 
                            type="edit"
                            onClick={() => handleEditClick(theater)}
                            title="Edit Theater"
                          />
                          
                          <ActionButton 
                            type="delete"
                            onClick={() => setDeleteModal({ show: true, theater })}
                            title="Delete Theater"
                          />
                        </ActionButtons>
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
          </div>
        )}
        </div>
        {/* End Theater Content Container */}
        </div>
        {/* End Main Theater Management Container */}

        {/* View Theater Modal */}
        {viewModal.show && (
          <div className="modal-overlay" onClick={() => setViewModal({ show: false, theater: null })}>
            <div className="modal-content theater-view-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-nav-left">
                  <button 
                    className="nav-btn prev-btn" 
                    onClick={() => handlePrevTheater('view')}
                    disabled={sortedTheaters.length <= 1}
                    title="Previous Theater"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" style={{width: '20px', height: '20px'}}>
                      <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                    </svg>
                  </button>
                </div>
                
                <div className="modal-title-section">
                  <h2>Theater Details</h2>
                  <span className="theater-counter">
                    {viewModal.currentIndex + 1} of {sortedTheaters.length}
                  </span>
                </div>
                
                <div className="modal-nav-right">
                  <button 
                    className="nav-btn next-btn" 
                    onClick={() => handleNextTheater('view')}
                    disabled={sortedTheaters.length <= 1}
                    title="Next Theater"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" style={{width: '20px', height: '20px'}}>
                      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                    </svg>
                  </button>
                  
                  <button 
                    className="close-btn" 
                    onClick={() => setViewModal({ show: false, theater: null })}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" style={{width: '20px', height: '20px'}}>
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="modal-body">
                <div className="edit-form">
                  <div className="form-group">
                    <label>Theater Name</label>
                    <input 
                      type="text" 
                      value={viewModal.theater?.name || ''} 
                      className="form-control"
                      readOnly
                    />
                  </div>
                  <div className="form-group">
                    <label>Owner Name</label>
                    <input 
                      type="text" 
                      value={viewModal.theater?.ownerDetails?.name || 'N/A'} 
                      className="form-control"
                      readOnly
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input 
                      type="text" 
                      value={viewModal.theater?.phone || 'N/A'} 
                      className="form-control"
                      readOnly
                    />
                  </div>
                  <div className="form-group">
                    <label>Owner Contact Number</label>
                    <input 
                      type="text" 
                      value={viewModal.theater?.ownerDetails?.contactNumber || 'N/A'} 
                      className="form-control"
                      readOnly
                    />
                  </div>
                  {viewModal.theater?.email && (
                    <div className="form-group">
                      <label>Email Address</label>
                      <input 
                        type="text" 
                        value={viewModal.theater?.email || 'N/A'} 
                        className="form-control"
                        readOnly
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label>Business Type</label>
                    <input 
                      type="text" 
                      value={viewModal.theater?.businessType || 'N/A'} 
                      className="form-control"
                      readOnly
                    />
                  </div>
                  <div className="form-group">
                    <label>Address</label>
                    <input 
                      type="text" 
                      value={viewModal.theater?.address?.street || 'N/A'} 
                      className="form-control"
                      readOnly
                    />
                  </div>
                  <div className="form-group">
                    <label>City</label>
                    <input 
                      type="text" 
                      value={viewModal.theater?.address?.city || 'N/A'} 
                      className="form-control"
                      readOnly
                    />
                  </div>
                  <div className="form-group">
                    <label>State</label>
                    <input 
                      type="text" 
                      value={viewModal.theater?.address?.state || 'N/A'} 
                      className="form-control"
                      readOnly
                    />
                  </div>
                  <div className="form-group">
                    <label>Pincode</label>
                    <input 
                      type="text" 
                      value={viewModal.theater?.address?.pincode || viewModal.theater?.address?.zipCode || 'N/A'} 
                      className="form-control"
                      readOnly
                    />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select 
                      value={viewModal.theater?.isActive ? 'Active' : 'Inactive'} 
                      className="form-control"
                      disabled
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  {viewModal.theater?.agreementDetails?.startDate && (
                    <div className="form-group">
                      <label>Agreement Start Date</label>
                      <input 
                        type="text" 
                        value={new Date(viewModal.theater.agreementDetails.startDate).toLocaleDateString()} 
                        className="form-control"
                        readOnly
                      />
                    </div>
                  )}
                  {viewModal.theater?.agreementDetails?.endDate && (
                    <div className="form-group">
                      <label>Agreement End Date</label>
                      <input 
                        type="text" 
                        value={new Date(viewModal.theater.agreementDetails.endDate).toLocaleDateString()} 
                        className="form-control"
                        readOnly
                      />
                    </div>
                  )}
                  {(viewModal.theater?.documents?.logo || viewModal.theater?.branding?.logo || viewModal.theater?.branding?.logoUrl) && (
                    <div className="form-group">
                      <label>Theater Logo</label>
                      <div className="logo-preview-container">
                        <img 
                          src={viewModal.theater.documents?.logo || viewModal.theater.branding?.logo || viewModal.theater.branding?.logoUrl} 
                          alt="Theater Logo" 
                          className="theater-logo-preview"
                          style={{width: '120px', height: '120px', objectFit: 'contain', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px'}}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Documents Section in View Modal */}
                {viewModal.theater && viewModal.theater.documents && (
                  <div className="documents-section">
                    <h3>Documents & Media</h3>
                    <div className="documents-grid">
                      {/* Theater Photo */}
                      {viewModal.theater.documents?.theaterPhoto && (
                        <div className="document-item">
                          <label>Theater Photo</label>
                          <div className="document-preview">
                            <img 
                              src={viewModal.theater.documents.theaterPhoto} 
                              alt="Theater Photo"
                              className="document-image"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                              }}
                            />
                            <div className="document-placeholder" style={{display: 'none'}}>
                              📷 Theater Photo
                            </div>
                            <a 
                              href={viewModal.theater.documents.theaterPhoto} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="view-document-btn"
                            >
                              View Full Size
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Logo */}
                      {(viewModal.theater.documents?.logo || viewModal.theater.branding?.logo || viewModal.theater.branding?.logoUrl) && (
                        <div className="document-item">
                          <label>Theater Logo</label>
                          <div className="document-preview">
                            <img 
                              src={viewModal.theater.documents?.logo || viewModal.theater.branding?.logo || viewModal.theater.branding?.logoUrl} 
                              alt="Theater Logo"
                              className="document-image"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                              }}
                            />
                            <div className="document-placeholder" style={{display: 'none'}}>
                              🏢 Theater Logo
                            </div>
                            <a 
                              href={viewModal.theater.documents?.logo || viewModal.theater.branding?.logo || viewModal.theater.branding?.logoUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="view-document-btn"
                            >
                              View Full Size
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Aadhar Card */}
                      {viewModal.theater.documents?.aadharCard && (
                        <div className="document-item">
                          <label>Aadhar Card</label>
                          <div className="document-preview">
                            <img 
                              src={viewModal.theater.documents.aadharCard} 
                              alt="Aadhar Card"
                              className="document-image"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                              }}
                            />
                            <div className="document-placeholder" style={{display: 'none'}}>
                              🆔 Aadhar Card
                            </div>
                            <a 
                              href={viewModal.theater.documents.aadharCard} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="view-document-btn"
                            >
                              View Document
                            </a>
                          </div>
                        </div>
                      )}

                      {/* PAN Card */}
                      {viewModal.theater.documents?.panCard && (
                        <div className="document-item">
                          <label>PAN Card</label>
                          <div className="document-preview">
                            <img 
                              src={viewModal.theater.documents.panCard} 
                              alt="PAN Card"
                              className="document-image"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                              }}
                            />
                            <div className="document-placeholder" style={{display: 'none'}}>
                              📄 PAN Card
                            </div>
                            <a 
                              href={viewModal.theater.documents.panCard} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="view-document-btn"
                            >
                              View Document
                            </a>
                          </div>
                        </div>
                      )}

                      {/* GST Certificate */}
                      {viewModal.theater.documents?.gstCertificate && (
                        <div className="document-item">
                          <label>GST Certificate</label>
                          <div className="document-preview">
                            <img 
                              src={viewModal.theater.documents.gstCertificate} 
                              alt="GST Certificate"
                              className="document-image"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                              }}
                            />
                            <div className="document-placeholder" style={{display: 'none'}}>
                              📋 GST Certificate
                            </div>
                            <a 
                              href={viewModal.theater.documents.gstCertificate} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="view-document-btn"
                            >
                              View Document
                            </a>
                          </div>
                        </div>
                      )}

                      {/* FSSAI Certificate */}
                      {viewModal.theater.documents?.fssaiCertificate && (
                        <div className="document-item">
                          <label>FSSAI Certificate</label>
                          <div className="document-preview">
                            <img 
                              src={viewModal.theater.documents.fssaiCertificate} 
                              alt="FSSAI Certificate"
                              className="document-image"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                              }}
                            />
                            <div className="document-placeholder" style={{display: 'none'}}>
                              🍽️ FSSAI Certificate
                            </div>
                            <a 
                              href={viewModal.theater.documents.fssaiCertificate} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="view-document-btn"
                            >
                              View Document
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Agreement Copy */}
                      {viewModal.theater.documents?.agreementCopy && (
                        <div className="document-item">
                          <label>Agreement Copy</label>
                          <div className="document-preview">
                            <img 
                              src={viewModal.theater.documents.agreementCopy} 
                              alt="Agreement Copy"
                              className="document-image"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                              }}
                            />
                            <div className="document-placeholder" style={{display: 'none'}}>
                              📝 Agreement Copy
                            </div>
                            <a 
                              href={viewModal.theater.documents.agreementCopy} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="view-document-btn"
                            >
                              View Document
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Edit Theater Modal */}
        {editModal.show && (
          <div className="modal-overlay" onClick={closeEditModal}>
            <div className="modal-content theater-edit-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-nav-left">
                  <button 
                    className="nav-btn prev-btn" 
                    onClick={() => handlePrevTheater('edit')}
                    disabled={sortedTheaters.length <= 1}
                    title="Previous Theater"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" style={{width: '20px', height: '20px'}}>
                      <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                    </svg>
                  </button>
                </div>
                
                <div className="modal-title-section">
                  <h2>Edit Theater</h2>
                  <span className="theater-counter">
                    {editModal.currentIndex + 1} of {sortedTheaters.length}
                  </span>
                </div>
                
                <div className="modal-nav-right">
                  <button 
                    className="nav-btn next-btn" 
                    onClick={() => handleNextTheater('edit')}
                    disabled={sortedTheaters.length <= 1}
                    title="Next Theater"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" style={{width: '20px', height: '20px'}}>
                      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                    </svg>
                  </button>
                  
                  <button 
                    className="close-btn"
                    onClick={closeEditModal}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" style={{width: '20px', height: '20px'}}>
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="modal-body">
                <div className="edit-form">
                  <div className="form-group">
                    <label>Theater Name</label>
                    <input 
                      type="text" 
                      value={editFormData.theaterName || ''} 
                      onChange={(e) => handleEditFormChange('theaterName', e.target.value)}
                      className="form-control"
                      placeholder="Enter theater name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Owner Name</label>
                    <input 
                      type="text" 
                      value={editFormData.ownerName || ''} 
                      onChange={(e) => handleEditFormChange('ownerName', e.target.value)}
                      className="form-control"
                      placeholder="Enter owner name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Owner Contact Number</label>
                    <input 
                      type="tel" 
                      value={editFormData.ownerContactNumber || ''} 
                      onChange={(e) => handleEditFormChange('ownerContactNumber', e.target.value)}
                      className="form-control"
                      placeholder="Enter owner contact number"
                    />
                  </div>
                  <div className="form-group">
                    <label>Theater Phone</label>
                    <input 
                      type="tel" 
                      value={editFormData.phone || ''} 
                      onChange={(e) => handleEditFormChange('phone', e.target.value)}
                      className="form-control"
                      placeholder="Enter theater phone number"
                    />
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input 
                      type="email" 
                      value={editFormData.email || ''} 
                      onChange={(e) => handleEditFormChange('email', e.target.value)}
                      className="form-control"
                      placeholder="Enter email address"
                    />
                  </div>
                  <div className="form-group">
                    <label>Business Type</label>
                    <select 
                      value={editFormData.businessType || ''} 
                      onChange={(e) => handleEditFormChange('businessType', e.target.value)}
                      className="form-control"
                    >
                      <option value="">Select Business Type</option>
                      <option value="Theater">Theater</option>
                      <option value="Canteen">Canteen</option>
                      <option value="Restaurant">Restaurant</option>
                      <option value="Food Court">Food Court</option>
                      <option value="Cafe">Cafe</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Address</label>
                    <textarea 
                      value={editFormData.address || ''} 
                      onChange={(e) => handleEditFormChange('address', e.target.value)}
                      className="form-control"
                      placeholder="Enter complete address"
                      rows="3"
                    ></textarea>
                  </div>
                  <div className="form-group">
                    <label>City</label>
                    <input 
                      type="text" 
                      value={editFormData.city || ''} 
                      onChange={(e) => handleEditFormChange('city', e.target.value)}
                      className="form-control"
                      placeholder="Enter city"
                    />
                  </div>
                  <div className="form-group">
                    <label>State</label>
                    <input 
                      type="text" 
                      value={editFormData.state || ''} 
                      onChange={(e) => handleEditFormChange('state', e.target.value)}
                      className="form-control"
                      placeholder="Enter state"
                    />
                  </div>
                  <div className="form-group">
                    <label>Pincode</label>
                    <input 
                      type="text" 
                      value={editFormData.pincode || ''} 
                      onChange={(e) => handleEditFormChange('pincode', e.target.value)}
                      className="form-control"
                      placeholder="Enter pincode"
                    />
                  </div>
                </div>

                {/* Documents & Media Section - Integrated Form Fields */}
                <div className="form-section">
                  <h3>Documents & Media</h3>
                  
                  {/* Theater Photo Field */}
                  <div className="form-group upload-form-group">
                    <label>Theater Photo</label>
                    <div className="upload-field-container">
                      <div className="upload-input-section">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'theaterPhoto')}
                          className="form-control file-input"
                          id="theaterPhoto-upload"
                        />
                        <div className="upload-instructions">
                          Choose a high-quality photo of your theater (JPG, PNG)
                        </div>
                      </div>
                      <div className="upload-preview-section">
                        {editModal.theater?.documents?.theaterPhoto ? (
                          <div className="current-file-preview">
                            <img 
                              src={editModal.theater.documents.theaterPhoto} 
                              alt="Theater Photo"
                              className="preview-image"
                              onClick={() => window.open(editModal.theater.documents.theaterPhoto, '_blank')}
                            />
                            <div className="preview-actions">
                              <button 
                                type="button" 
                                className="preview-btn view-btn"
                                onClick={() => window.open(editModal.theater.documents.theaterPhoto, '_blank')}
                              >
                                🔍 View
                              </button>
                              <button 
                                type="button" 
                                className="preview-btn remove-btn"
                                onClick={() => handleRemoveFile('theaterPhoto')}
                              >
                                🗑️ Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="upload-placeholder">
                            <div className="placeholder-icon">📷</div>
                            <div className="placeholder-text">No photo uploaded</div>
                            <div className="placeholder-hint">Click "Choose File" to upload</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Theater Logo Field */}
                  <div className="form-group upload-form-group">
                    <label>Theater Logo</label>
                    <div className="upload-field-container">
                      <div className="upload-input-section">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'logo')}
                          className="form-control file-input"
                          id="logo-upload"
                        />
                        <div className="upload-instructions">
                          Upload your theater's official logo (JPG, PNG)
                        </div>
                      </div>
                      <div className="upload-preview-section">
                        {(editModal.theater?.documents?.logo || editModal.theater?.branding?.logo || editModal.theater?.branding?.logoUrl) ? (
                          <div className="current-file-preview">
                            <img 
                              src={editModal.theater.documents?.logo || editModal.theater.branding?.logo || editModal.theater.branding?.logoUrl} 
                              alt="Theater Logo"
                              className="preview-image"
                              onClick={() => window.open(editModal.theater.documents?.logo || editModal.theater.branding?.logo || editModal.theater.branding?.logoUrl, '_blank')}
                            />
                            <div className="preview-actions">
                              <button 
                                type="button" 
                                className="preview-btn view-btn"
                                onClick={() => window.open(editModal.theater.documents?.logo || editModal.theater.branding?.logo || editModal.theater.branding?.logoUrl, '_blank')}
                              >
                                🔍 View
                              </button>
                              <button 
                                type="button" 
                                className="preview-btn remove-btn"
                                onClick={() => handleRemoveFile('logo')}
                              >
                                🗑️ Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="upload-placeholder">
                            <div className="placeholder-icon">🏢</div>
                            <div className="placeholder-text">No logo uploaded</div>
                            <div className="placeholder-hint">Click "Choose File" to upload</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Aadhar Card Field */}
                  <div className="form-group upload-form-group">
                    <label>Aadhar Card</label>
                    <div className="upload-field-container">
                      <div className="upload-input-section">
                        <input 
                          type="file" 
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileUpload(e, 'aadharCard')}
                          className="form-control file-input"
                          id="aadharCard-upload"
                        />
                        <div className="upload-instructions">
                          Upload Aadhar card copy (JPG, PNG, PDF)
                        </div>
                      </div>
                      <div className="upload-preview-section">
                        {editModal.theater?.documents?.aadharCard ? (
                          <div className="current-file-preview">
                            <img 
                              src={editModal.theater.documents.aadharCard} 
                              alt="Aadhar Card"
                              className="preview-image"
                              onClick={() => window.open(editModal.theater.documents.aadharCard, '_blank')}
                            />
                            <div className="preview-actions">
                              <button 
                                type="button" 
                                className="preview-btn view-btn"
                                onClick={() => window.open(editModal.theater.documents.aadharCard, '_blank')}
                              >
                                🔍 View
                              </button>
                              <button 
                                type="button" 
                                className="preview-btn remove-btn"
                                onClick={() => handleRemoveFile('aadharCard')}
                              >
                                🗑️ Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="upload-placeholder">
                            <div className="placeholder-icon">🆔</div>
                            <div className="placeholder-text">No Aadhar card uploaded</div>
                            <div className="placeholder-hint">Click "Choose File" to upload</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* PAN Card Field */}
                  <div className="form-group upload-form-group">
                    <label>PAN Card</label>
                    <div className="upload-field-container">
                      <div className="upload-input-section">
                        <input 
                          type="file" 
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileUpload(e, 'panCard')}
                          className="form-control file-input"
                          id="panCard-upload"
                        />
                        <div className="upload-instructions">
                          Upload PAN card copy (JPG, PNG, PDF)
                        </div>
                      </div>
                      <div className="upload-preview-section">
                        {editModal.theater?.documents?.panCard ? (
                          <div className="current-file-preview">
                            <img 
                              src={editModal.theater.documents.panCard} 
                              alt="PAN Card"
                              className="preview-image"
                              onClick={() => window.open(editModal.theater.documents.panCard, '_blank')}
                            />
                            <div className="preview-actions">
                              <button 
                                type="button" 
                                className="preview-btn view-btn"
                                onClick={() => window.open(editModal.theater.documents.panCard, '_blank')}
                              >
                                🔍 View
                              </button>
                              <button 
                                type="button" 
                                className="preview-btn remove-btn"
                                onClick={() => handleRemoveFile('panCard')}
                              >
                                🗑️ Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="upload-placeholder">
                            <div className="placeholder-icon">📄</div>
                            <div className="placeholder-text">No PAN card uploaded</div>
                            <div className="placeholder-hint">Click "Choose File" to upload</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* GST Certificate Field */}
                  <div className="form-group upload-form-group">
                    <label>GST Certificate</label>
                    <div className="upload-field-container">
                      <div className="upload-input-section">
                        <input 
                          type="file" 
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileUpload(e, 'gstCertificate')}
                          className="form-control file-input"
                          id="gstCertificate-upload"
                        />
                        <div className="upload-instructions">
                          Upload GST certificate (JPG, PNG, PDF)
                        </div>
                      </div>
                      <div className="upload-preview-section">
                        {editModal.theater?.documents?.gstCertificate ? (
                          <div className="current-file-preview">
                            <img 
                              src={editModal.theater.documents.gstCertificate} 
                              alt="GST Certificate"
                              className="preview-image"
                              onClick={() => window.open(editModal.theater.documents.gstCertificate, '_blank')}
                            />
                            <div className="preview-actions">
                              <button 
                                type="button" 
                                className="preview-btn view-btn"
                                onClick={() => window.open(editModal.theater.documents.gstCertificate, '_blank')}
                              >
                                🔍 View
                              </button>
                              <button 
                                type="button" 
                                className="preview-btn remove-btn"
                                onClick={() => handleRemoveFile('gstCertificate')}
                              >
                                🗑️ Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="upload-placeholder">
                            <div className="placeholder-icon">📋</div>
                            <div className="placeholder-text">No GST certificate uploaded</div>
                            <div className="placeholder-hint">Click "Choose File" to upload</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* FSSAI Certificate Field */}
                  <div className="form-group upload-form-group">
                    <label>FSSAI Certificate</label>
                    <div className="upload-field-container">
                      <div className="upload-input-section">
                        <input 
                          type="file" 
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileUpload(e, 'fssaiCertificate')}
                          className="form-control file-input"
                          id="fssaiCertificate-upload"
                        />
                        <div className="upload-instructions">
                          Upload FSSAI certificate (JPG, PNG, PDF)
                        </div>
                      </div>
                      <div className="upload-preview-section">
                        {editModal.theater?.documents?.fssaiCertificate ? (
                          <div className="current-file-preview">
                            <img 
                              src={editModal.theater.documents.fssaiCertificate} 
                              alt="FSSAI Certificate"
                              className="preview-image"
                              onClick={() => window.open(editModal.theater.documents.fssaiCertificate, '_blank')}
                            />
                            <div className="preview-actions">
                              <button 
                                type="button" 
                                className="preview-btn view-btn"
                                onClick={() => window.open(editModal.theater.documents.fssaiCertificate, '_blank')}
                              >
                                🔍 View
                              </button>
                              <button 
                                type="button" 
                                className="preview-btn remove-btn"
                                onClick={() => handleRemoveFile('fssaiCertificate')}
                              >
                                🗑️ Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="upload-placeholder">
                            <div className="placeholder-icon">🍽️</div>
                            <div className="placeholder-text">No FSSAI certificate uploaded</div>
                            <div className="placeholder-hint">Click "Choose File" to upload</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Business License Field */}
                  <div className="form-group upload-form-group">
                    <label>Business License</label>
                    <div className="upload-field-container">
                      <div className="upload-input-section">
                        <input 
                          type="file" 
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileUpload(e, 'businessLicense')}
                          className="form-control file-input"
                          id="businessLicense-upload"
                        />
                        <div className="upload-instructions">
                          Upload business license (JPG, PNG, PDF)
                        </div>
                      </div>
                      <div className="upload-preview-section">
                        {editModal.theater?.documents?.businessLicense ? (
                          <div className="current-file-preview">
                            <img 
                              src={editModal.theater.documents.businessLicense} 
                              alt="Business License"
                              className="preview-image"
                              onClick={() => window.open(editModal.theater.documents.businessLicense, '_blank')}
                            />
                            <div className="preview-actions">
                              <button 
                                type="button" 
                                className="preview-btn view-btn"
                                onClick={() => window.open(editModal.theater.documents.businessLicense, '_blank')}
                              >
                                🔍 View
                              </button>
                              <button 
                                type="button" 
                                className="preview-btn remove-btn"
                                onClick={() => handleRemoveFile('businessLicense')}
                              >
                                🗑️ Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="upload-placeholder">
                            <div className="placeholder-icon">📋</div>
                            <div className="placeholder-text">No business license uploaded</div>
                            <div className="placeholder-hint">Click "Choose File" to upload</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Agreement Copy Field */}
                  <div className="form-group upload-form-group">
                    <label>Agreement Copy</label>
                    <div className="upload-field-container">
                      <div className="upload-input-section">
                        <input 
                          type="file" 
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileUpload(e, 'agreementCopy')}
                          className="form-control file-input"
                          id="agreementCopy-upload"
                        />
                        <div className="upload-instructions">
                          Upload agreement document (JPG, PNG, PDF)
                        </div>
                      </div>
                      <div className="upload-preview-section">
                        {editModal.theater?.documents?.agreementCopy ? (
                          <div className="current-file-preview">
                            <img 
                              src={editModal.theater.documents.agreementCopy} 
                              alt="Agreement Copy"
                              className="preview-image"
                              onClick={() => window.open(editModal.theater.documents.agreementCopy, '_blank')}
                            />
                            <div className="preview-actions">
                              <button 
                                type="button" 
                                className="preview-btn view-btn"
                                onClick={() => window.open(editModal.theater.documents.agreementCopy, '_blank')}
                              >
                                🔍 View
                              </button>
                              <button 
                                type="button" 
                                className="preview-btn remove-btn"
                                onClick={() => handleRemoveFile('agreementCopy')}
                              >
                                🗑️ Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="upload-placeholder">
                            <div className="placeholder-icon">📝</div>
                            <div className="placeholder-text">No agreement copy uploaded</div>
                            <div className="placeholder-hint">Click "Choose File" to upload</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="modal-actions">
                  <button 
                    className="cancel-btn" 
                    onClick={closeEditModal}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn-primary"
                    onClick={handleEditSubmit}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModal.show && (
          <div className="modal-overlay">
            <div className="delete-modal">
              <div className="modal-header">
                <h3>Confirm Deletion</h3>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete <strong>{deleteModal.theater?.name}</strong>?</p>
                <p className="warning-text">This action cannot be undone.</p>
              </div>
              <div className="modal-actions">
                <button 
                  onClick={() => setDeleteModal({ show: false, theater: null })}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDelete(deleteModal.theater._id)}
                  className="confirm-delete-btn"
                >
                  Delete Theater
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>

    {/* Custom CSS for TheaterList modals only */}
    <style dangerouslySetInnerHTML={{
      __html: `
        .theater-view-modal-content,
        .theater-edit-modal-content {
          max-width: 900px !important;
          width: 85% !important;
        }

        @media (max-width: 768px) {
          .theater-view-modal-content,
          .theater-edit-modal-content {
            width: 95% !important;
            max-width: none !important;
          }
        }
      `
    }} />
  </ErrorBoundary>
  );
};

export default TheaterList;