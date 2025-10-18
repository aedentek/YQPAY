import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { useModal } from '../contexts/ModalContext';
import ErrorBoundary from '../components/ErrorBoundary';
import { usePerformanceMonitoring } from '../hooks/usePerformanceMonitoring';
import { clearTheaterCache } from '../utils/cacheManager';
import config from '../config';
import '../styles/QRGenerate.css';
import '../styles/TheaterList.css';

// Simple cache utilities
const getCachedData = (key) => {
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const { data, expiry } = JSON.parse(cached);
      if (Date.now() < expiry) {
        return data;
      }
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.error('Cache read error:', error);
  }
  return null;
};

const setCachedData = (key, data, ttl = 5 * 60 * 1000) => {
  try {
    const expiry = Date.now() + ttl;
    localStorage.setItem(key, JSON.stringify({ data, expiry }));
  } catch (error) {
    console.error('Cache write error:', error);
  }
};

// Simple debounce utility
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Theater Selection Skeleton Component
const TheaterSelectSkeleton = React.memo(() => (
  <div className="loading-select" style={{
    height: '40px',
    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
    backgroundSize: '200% 100%',
    animation: 'loading 1.5s infinite',
    borderRadius: '4px'
  }}>
    Loading theaters...
  </div>
));



const QRGenerate = React.memo(() => {
  const navigate = useNavigate();
  const { alert, showError, showSuccess } = useModal();
  const performanceMetrics = usePerformanceMonitoring('QRGenerate');
  const abortControllerRef = useRef(null);
  
  // Form state
  const [formData, setFormData] = useState({
    theaterId: '',
    qrType: '',
    name: '',
    seatStart: '',
    seatEnd: '',
    selectedSeats: [],
    logoType: '', // 'default' or 'theater'
    logoUrl: '',
    seatClass: '' // Will be auto-populated from QR name selection
  });
  
  // UI state
  const [theaters, setTheaters] = useState([]);
  const [theatersLoading, setTheatersLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState({ current: 0, total: 0, message: '' });
  const [showSeatMap, setShowSeatMap] = useState(false);
  const [allAvailableSeats, setAllAvailableSeats] = useState([]); // Store all generated seat ranges
  const [defaultLogoUrl, setDefaultLogoUrl] = useState(''); // Default logo from settings
  
  // QR Names state
  const [qrNames, setQrNames] = useState([]);
  const [qrNamesLoading, setQrNamesLoading] = useState(false);

  // Load active theaters on component mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadTheaters();
    loadDefaultLogo();
    
    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      clearTheaterCache(); // Clear cache on unmount
    };
  }, []); // Functions are stable due to useCallback

  const loadTheaters = useCallback(async () => {
    try {
      setTheatersLoading(true);
      
      // Check cache first
      const cacheKey = 'active-theaters';
      const cachedTheaters = getCachedData(cacheKey);
      if (cachedTheaters) {
        setTheaters(cachedTheaters);
        setTheatersLoading(false);
        return;
      }
      
      // Create abort controller for this request
      abortControllerRef.current = new AbortController();
      
      const response = await fetch(config.helpers.getApiUrl('/theaters?status=active&limit=100'), {
        signal: abortControllerRef.current.signal
      });
      const data = await response.json();
      
      if (data.success) {
        // Handle both paginated and direct response formats
        // Backend pagination returns: { success: true, data: [...], pagination: {...} }
        const theaterList = data.data || data.theaters || [];
        setTheaters(theaterList);
        
        // Cache the results
        setCachedData(cacheKey, theaterList, 5 * 60 * 1000); // 5 minutes
        
        console.log('Loaded theaters:', theaterList.length);
      } else {
        showError('Error', data.message || 'Failed to load theaters');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Theater fetch was aborted');
        return;
      }
      showError('Error', 'Failed to load theaters');
    } finally {
      setTheatersLoading(false);
      abortControllerRef.current = null;
    }
  }, [showError]);

  const loadDefaultLogo = useCallback(async () => {
    try {
      // Check cache first
      const cacheKey = 'default-logo';
      const cachedLogo = getCachedData(cacheKey);
      if (cachedLogo) {
        setDefaultLogoUrl(cachedLogo);
        console.log('✅ Loaded default logo from cache:', cachedLogo);
        return;
      }
      
      const response = await fetch(config.helpers.getApiUrl('/settings/general'));
      const data = await response.json();
      
      console.log('📥 Settings API response:', data);
      
      if (data.success && data.data) {
        // Use qrCodeUrl first (for QR codes), then fallback to logoUrl
        const logoUrl = data.data.qrCodeUrl || data.data.logoUrl || '';
        console.log('🖼️  Default QR logo URL:', logoUrl);
        setDefaultLogoUrl(logoUrl);
        if (logoUrl) {
          setCachedData(cacheKey, logoUrl, 10 * 60 * 1000); // 10 minutes
        }
      } else {
        console.warn('⚠️  No settings data found in API response');
      }
    } catch (error) {
      console.error('❌ Error loading default logo:', error);
    }
  }, []);

  const loadQRNames = useCallback(async (theaterId) => {
    console.log('🎬 ==> loadQRNames CALLED with theaterId:', theaterId);
    console.log('🕐 Timestamp:', new Date().toISOString());
    
    if (!theaterId) {
      console.log('❌ No theater ID provided, clearing QR names');
      setQrNames([]);
      setQrNamesLoading(false);
      return;
    }
    
    try {
      console.log('⏳ Setting loading state to true');
      setQrNamesLoading(true);
      
      // Fetch available QR code names from qrcodenames collection
      const apiUrl = config.helpers.getApiUrl(`/qrcodenames?theaterId=${theaterId}&limit=100&_t=${Date.now()}`); // Cache buster
      console.log('🌐 Full API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📊 Complete API Response:', JSON.stringify(data, null, 2));
      
      if (data.success && data.data && data.data.qrCodeNames) {
        console.log('✅ QR Names found:', data.data.qrCodeNames.length, data.data.qrCodeNames);
        
        // Try to fetch already generated QR codes from singleqrcodes database for this theater (to filter duplicates)
        let existingQRNames = [];
        console.log('🔍 About to fetch existing QR codes for theater:', theaterId);
        
        try {
          const token = config.helpers.getAuthToken();
          console.log('🔑 Auth token for single QR codes request:', token ? `Present (${token.substring(0, 20)}...)` : 'Missing');
          
          if (!token) {
            console.warn('⚠️ No authentication token available - cannot fetch existing QR codes, showing all QR names');
            existingQRNames = [];
          } else {
            const existingQRsUrl = config.helpers.getApiUrl(`/single-qrcodes/theater/${theaterId}?_t=${Date.now()}`); // Cache buster
            console.log('🔍 Fetching existing single QR codes from:', existingQRsUrl);
            
            const existingQRsResponse = await fetch(existingQRsUrl, {
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            });
            
            console.log('📡 Single QR codes API response status:', existingQRsResponse.status, existingQRsResponse.statusText);
            
            if (existingQRsResponse.ok) {
              const existingQRsData = await existingQRsResponse.json();
              console.log('📊 Existing Single QR Codes Response:', existingQRsData);
              
              if (existingQRsData.success && existingQRsData.data) {
                // Extract unique QR names that already have generated QR codes in singleqrcodes
                // This checks both single and screen type QR codes in the unified collection
                existingQRNames = [...new Set(existingQRsData.data.map(qr => qr.name))]; // Using 'name' field from transformed response
                console.log('🚫 Already generated QR names (from singleqrcodes - both single & screen types):', existingQRNames);
                console.log('🔍 Raw API data for debugging:', existingQRsData.data);
                console.log('🔍 Number of existing QR records found:', existingQRsData.data.length);
              } else {
                console.warn('⚠️ API responded OK but success=false or no data:', existingQRsData);
                existingQRNames = [];
              }
            } else {
              const responseText = await existingQRsResponse.text();
              console.warn('⚠️ Could not fetch existing single QR codes (status:', existingQRsResponse.status, ') - showing all QR names');
              console.warn('⚠️ Response text:', responseText);
              existingQRNames = [];
            }
          }
        } catch (fetchError) {
          // Silently handle error - if we can't fetch existing QRs, just show all QR names
          console.warn('⚠️ Error fetching existing single QR codes:', fetchError.message, '- showing all QR names');
          console.warn('⚠️ This might be due to authentication issues or API errors');
          
          // In case of error, set existingQRNames to empty array (showing all QR names)
          existingQRNames = [];
        }
        
        // Filter out QR names that already have generated QR codes
        const availableQRNames = data.data.qrCodeNames.filter(
          qrName => {
            const isAlreadyGenerated = existingQRNames.includes(qrName.qrName);
            console.log(`🔍 Checking QR name "${qrName.qrName}": Already generated? ${isAlreadyGenerated}`);
            return !isAlreadyGenerated;
          }
        );
        
        console.log('🔍 Validation Results:', {
          totalQRNames: data.data.qrCodeNames.length,
          totalQRNamesArray: data.data.qrCodeNames.map(qr => qr.qrName),
          existingQRNamesCount: existingQRNames.length,
          existingQRNamesArray: existingQRNames,
          availableQRNamesCount: availableQRNames.length,
          availableQRNamesArray: availableQRNames.map(qr => qr.qrName),
          databaseSource: 'singleqrcodes'
        });
        
        console.log('✅ Available QR Names (filtered by singleqrcodes):', availableQRNames.length, availableQRNames);
        setQrNames(availableQRNames);
        console.log('✅ State updated - qrNames set to:', availableQRNames);
        
        if (availableQRNames.length === 0 && data.data.qrCodeNames.length > 0) {
          console.log('ℹ️ All QR names have already been generated in singleqrcodes for this theater');
        } else if (existingQRNames.length === 0) {
          console.log('ℹ️ No existing QR codes found in singleqrcodes - all QR names are available');
        }
      } else {
        console.log('⚠️ No QR names in response or success=false');
        console.log('Response structure:', Object.keys(data));
        console.log('Data.success:', data.success);
        console.log('Data.data:', data.data);
        console.log('Data.data.qrCodeNames:', data.data?.qrCodeNames);
        setQrNames([]);
      }
    } catch (error) {
      console.error('❌ Error in loadQRNames:', error);
      setQrNames([]);
      showError('Error', `Failed to load QR names: ${error.message}`);
    } finally {
      console.log('🏁 Setting loading state to false');
      setQrNamesLoading(false);
    }
  }, [showError]);

  // Removed useEffect that was causing race condition
  // QR names are loaded directly in handleInputChange when theater is selected

  const handleInputChange = useCallback((e) => {
    const { name, value, type } = e.target;
    
    // Handle theater selection with logo update and QR names loading
    if (name === 'theaterId') {
      const selectedTheater = theaters.find(t => t._id === value);
      let logoUrl = formData.logoUrl;
      
      // Update logo URL if theater logo is selected
      if (formData.logoType === 'theater' && selectedTheater) {
        logoUrl = selectedTheater.media?.logo || selectedTheater.logo || selectedTheater.logoUrl || '';
        console.log('Theater logo selection:', {
          theaterName: selectedTheater.name,
          logoType: formData.logoType,
          mediaLogo: selectedTheater.media?.logo,
          directLogo: selectedTheater.logo,
          logoUrl: selectedTheater.logoUrl,
          finalLogoUrl: logoUrl
        });
      }
      
      // Load QR names for the selected theater
      console.log('🎭 Theater selected:', { 
        theaterId: value, 
        theaterName: selectedTheater?.name,
        loadingQRNames: true 
      });
      loadQRNames(value);
      
      setFormData(prev => ({
        ...prev,
        theaterId: value,
        logoUrl,
        name: '', // Reset QR name when theater changes
        seatClass: '' // Reset seat class when theater changes
      }));
    } 
    // Handle QR name selection with automatic seat class update
    else if (name === 'name') {
      const selectedQRName = qrNames.find(qr => qr.qrName === value);
      
      setFormData(prev => ({
        ...prev,
        name: value,
        seatClass: selectedQRName ? selectedQRName.seatClass : ''
      }));
    } 
    else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseInt(value) || 0 : value
      }));
    }
  }, [theaters, formData.logoUrl, formData.logoType, loadQRNames, qrNames]);

  const handleLogoTypeChange = useCallback((logoType) => {
    const selectedTheater = theaters.find(t => t._id === formData.theaterId);
    let logoUrl = '';
    
    if (logoType === 'default') {
      logoUrl = defaultLogoUrl;
      console.log('🎨 Using default logo:', logoUrl);
    } else if (logoType === 'theater' && selectedTheater) {
      // Check multiple possible logo locations in theater object
      logoUrl = selectedTheater.branding?.logoUrl 
        || selectedTheater.branding?.logo 
        || selectedTheater.documents?.logo 
        || selectedTheater.media?.logo 
        || selectedTheater.logo 
        || selectedTheater.logoUrl 
        || '';
      
      console.log('🎭 Theater logo lookup:', {
        theaterName: selectedTheater.name,
        brandingLogoUrl: selectedTheater.branding?.logoUrl,
        brandingLogo: selectedTheater.branding?.logo,
        documentsLogo: selectedTheater.documents?.logo,
        mediaLogo: selectedTheater.media?.logo,
        directLogo: selectedTheater.logo,
        logoUrl: selectedTheater.logoUrl,
        finalLogoUrl: logoUrl
      });
    }
    
    setFormData(prev => ({
      ...prev,
      logoType,
      logoUrl
    }));
  }, [theaters, formData.theaterId, defaultLogoUrl]);

  const handleQRTypeChange = useCallback((type) => {
    setFormData(prev => ({
      ...prev,
      qrType: type,
      name: '',
      seatStart: '',
      seatEnd: '',
      selectedSeats: []
    }));
    setShowSeatMap(false); // Hide seat map when changing type
    setAllAvailableSeats([]); // Clear all stored seat ranges when changing type
  }, []);

  // Memoized calculations
  const selectedTheater = useMemo(() => 
    theaters.find(t => t._id === formData.theaterId),
    [theaters, formData.theaterId]
  );

  const qrCodeCount = useMemo(() => {
    if (formData.qrType === 'single') return 1;
    return formData.selectedSeats.length;
  }, [formData.qrType, formData.selectedSeats.length]);

  const hasTheaterLogo = useMemo(() => 
    selectedTheater?.branding?.logoUrl 
    || selectedTheater?.branding?.logo 
    || selectedTheater?.documents?.logo 
    || selectedTheater?.media?.logo 
    || selectedTheater?.logo 
    || selectedTheater?.logoUrl,
    [selectedTheater]
  );

  const seatMapData = useMemo(() => {
    if (allAvailableSeats.length === 0) return [];
    
    const seatMap = [];
    const rowSeatsMap = new Map();
    
    allAvailableSeats.forEach(range => {
      const { startRowCode, endRowCode, startNumber, endNumber } = range;
      
      for (let rowCode = 65; rowCode <= endRowCode; rowCode++) {
        const currentRow = String.fromCharCode(rowCode);
        
        let rowStart, rowEnd;
        
        if (startRowCode === endRowCode) {
          if (rowCode === startRowCode) {
            rowStart = startNumber;
            rowEnd = endNumber;
          } else {
            continue;
          }
        } else {
          if (rowCode === startRowCode) {
            rowStart = startNumber;
            rowEnd = endNumber;
          } else if (rowCode === endRowCode) {
            rowStart = 1;
            rowEnd = endNumber;
          } else {
            rowStart = 1;
            rowEnd = endNumber;
          }
        }
        
        if (!rowSeatsMap.has(currentRow)) {
          rowSeatsMap.set(currentRow, new Set());
        }
        
        const seatSet = rowSeatsMap.get(currentRow);
        for (let i = rowStart; i <= rowEnd; i++) {
          seatSet.add(i);
        }
      }
    });
    
    Array.from(rowSeatsMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([row, seatSet]) => {
        const seats = Array.from(seatSet)
          .sort((a, b) => a - b)
          .map(num => `${row}${num}`);
        seatMap.push({ row, seats });
      });
    
    return seatMap;
  }, [allAvailableSeats]);

  // Function to calculate QR codes from seat range
  const calculateQRCodes = useCallback((startSeat, endSeat) => {
    if (!startSeat || !endSeat) return { count: 0, seats: [] };
    
    try {
      // Extract row letter and number from seat IDs
      const startMatch = startSeat.match(/^([A-Z]+)(\d+)$/);
      const endMatch = endSeat.match(/^([A-Z]+)(\d+)$/);
      
      if (!startMatch || !endMatch) return { count: 0, seats: [] };
      
      const [, startRow, startNum] = startMatch;
      const [, endRow, endNum] = endMatch;
      
      // If same row, calculate seats in that row
      if (startRow === endRow) {
        const start = parseInt(startNum);
        const end = parseInt(endNum);
        const count = Math.max(0, end - start + 1);
        const seats = [];
        
        for (let i = start; i <= end; i++) {
          seats.push(`${startRow}${i}`);
        }
        
        return { count, seats };
      }
      
      // If different rows (A1 to B20), calculate across rows
      const startRowCode = startRow.charCodeAt(0);
      const endRowCode = endRow.charCodeAt(0);
      const startNumber = parseInt(startNum);
      const endNumber = parseInt(endNum);
      
      let totalSeats = [];
      
      for (let rowCode = startRowCode; rowCode <= endRowCode; rowCode++) {
        const currentRow = String.fromCharCode(rowCode);
        const start = rowCode === startRowCode ? startNumber : 1;
        const end = rowCode === endRowCode ? endNumber : endNumber;
        
        for (let seatNum = start; seatNum <= end; seatNum++) {
          totalSeats.push(`${currentRow}${seatNum}`);
        }
      }
      
      return { count: totalSeats.length, seats: totalSeats };
    } catch (error) {
      return { count: 0, seats: [] };
    }
  }, []);

  // Generate theater seat map based on all stored ranges - now memoized above as seatMapData
  const generateSeatMap = useCallback(() => seatMapData, [seatMapData]);

  // Handle seat selection
  const handleSeatClick = useCallback((seatId) => {
    setFormData(prev => {
      const isSelected = prev.selectedSeats.includes(seatId);
      const newSelectedSeats = isSelected
        ? prev.selectedSeats.filter(seat => seat !== seatId)
        : [...prev.selectedSeats, seatId];
      
      return {
        ...prev,
        selectedSeats: newSelectedSeats
      };
    });
  }, []);

  // Auto-populate seat range based on selection
  const updateSeatRangeFromSelection = () => {
    const { selectedSeats } = formData;
    if (selectedSeats.length === 0) return;
    
    // Sort seats to find range
    const sortedSeats = [...selectedSeats].sort((a, b) => {
      const [rowA, numA] = [a.match(/[A-Z]+/)[0], parseInt(a.match(/\d+/)[0])];
      const [rowB, numB] = [b.match(/[A-Z]+/)[0], parseInt(b.match(/\d+/)[0])];
      
      if (rowA !== rowB) return rowA.localeCompare(rowB);
      return numA - numB;
    });
    
    setFormData(prev => ({
      ...prev,
      seatStart: sortedSeats[0],
      seatEnd: sortedSeats[sortedSeats.length - 1]
    }));
  };

  const validateForm = useCallback(() => {
    const { theaterId, qrType, name, seatStart, seatEnd, seatClass } = formData;
    
    if (!theaterId) {
      showError('Validation Error', 'Please select a theater');
      return false;
    }
    
    if (!name.trim()) {
      showError('Validation Error', 'Please enter a QR code name');
      return false;
    }
    
    if (qrType === 'screen') {
      if (!seatClass) {
        showError('Validation Error', 'Please select a seat class');
        return false;
      }
      
      // Check if seats are selected
      if (!formData.selectedSeats || formData.selectedSeats.length === 0) {
        showError('Validation Error', 'Please generate seat map and select seats before creating QR codes');
        return false;
      }
      
      if (formData.selectedSeats.length > 100) {
        showError('Validation Error', 'Cannot generate more than 100 QR codes at once');
        return false;
      }
    }
    
    return true;
  }, [formData, showError]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    console.log('Form submission started with data:', formData);
    
    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }
    
    try {
      setGenerating(true);
      
      // Set initial progress
      const totalSeats = formData.qrType === 'single' ? 1 : (formData.selectedSeats?.length || 1);
      setGeneratingProgress({ 
        current: 0, 
        total: totalSeats, 
        message: formData.qrType === 'single' ? 'Generating single QR code...' : `Preparing to generate ${totalSeats} QR codes...`
      });
      
      // No simulated progress - we'll only update based on real backend responses
      
      // Get authentication token
      const token = config.helpers.getAuthToken();
      
      if (!token) {
        showError('Authentication Error', 'Please login to generate QR codes');
        setGenerating(false);
        return;
      }
      
      console.log('Sending request to backend with:', formData);
      
      console.log('🔍 Form Data Debug:', {
        theaterId: formData.theaterId,
        logoType: formData.logoType,
        logoUrl: formData.logoUrl,
        defaultLogoUrl: defaultLogoUrl
      });
      
      // ✅ FIX: Use different endpoint for single vs screen QR codes
      const endpoint = formData.qrType === 'single' 
        ? '/single-qrcodes'  // New unified endpoint for single QR codes
        : '/single-qrcodes';  // SAME endpoint for screen QR codes (unified collection)
      
      // Prepare request body based on QR type
      let requestBody;
      if (formData.qrType === 'single') {
        // For single QR codes
        requestBody = {
          theaterId: formData.theaterId,
          qrType: 'single',
          qrName: formData.name,
          seatClass: formData.seatClass,
          logoUrl: formData.logoUrl || (formData.logoType === 'default' ? defaultLogoUrl : ''),
          logoType: formData.logoType || 'default'
        };
      } else {
        // For screen QR codes
        requestBody = {
          theaterId: formData.theaterId,
          qrType: 'screen',
          qrName: formData.name,
          seatClass: formData.seatClass,
          seats: formData.selectedSeats, // Array of seats (A1, A2, B1, etc.)
          logoUrl: formData.logoUrl || (formData.logoType === 'default' ? defaultLogoUrl : ''),
          logoType: formData.logoType || 'default'
        };
      }
      
      console.log('📤 Request Body being sent:', requestBody);
      
      // Update progress for API call
      setGeneratingProgress(prev => ({ 
        ...prev, 
        message: 'Sending request to server...' 
      }));
      
      const response = await fetch(config.helpers.getApiUrl(endpoint), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });
      
      const data = await response.json();
      
      // Update progress for processing response
      setGeneratingProgress(prev => ({ 
        ...prev, 
        message: 'Processing server response...' 
      }));
      
      console.log('Backend response:', data);
      
      if (data.success) {
        console.log('🔍 Debugging count extraction:', {
          'data.count': data.count,
          'data.data': data.data,
          'data.data?.count': data.data?.count,
          'typeof data.count': typeof data.count
        });
        
        const count = data.count || (data.data && data.data.count) || totalSeats;
        const message = formData.qrType === 'single' 
          ? 'Single QR code generated and saved successfully!'
          : `${count} screen QR codes generated successfully!`;
        
        // Directly set progress to completion since QR codes are already created
        setGeneratingProgress({
          current: totalSeats,
          total: totalSeats,
          message: 'QR codes generated successfully!'
        });
        
        // Keep the completion visible for 1 second before showing success modal
        setTimeout(() => {
          setGenerating(false);
          
          // Reload QR names to update the dropdown (with delay to ensure DB update)
          if (formData.theaterId) {
            console.log('🔄 Reloading QR names after successful generation');
            setTimeout(() => {
              console.log('🔄 Executing delayed QR names reload...');
              loadQRNames(formData.theaterId);
            }, 500); // 500ms delay to ensure database is updated
          }
          
          // Show success and auto-navigate after 2 seconds
          showSuccess('Success', message);
          
          // Auto-navigate to QR Management page after 2 seconds
          setTimeout(() => {
            navigate('/qr-management');
          }, 2000);
        }, 1000);
      } else {
        console.error('Backend returned error:', data);
        showError('Error', data.message || 'Failed to generate QR codes');
        setGenerating(false);
      }
    } catch (error) {
      console.error('Error generating QR codes:', error);
      showError('Error', 'Failed to generate QR codes. Please try again.');
      setGenerating(false);
    }
  }, [formData, validateForm, showSuccess, showError, navigate, loadQRNames, defaultLogoUrl]);

  // Add button click handler to generate seat map
  const handleGenerateSeatMap = useCallback(() => {
    // For now, allow generating seat map without specific start/end requirements
    // Users can interact with the visual seat map directly
    
    // Generate a default seat map if no specific range is provided
    if (!formData.seatStart && !formData.seatEnd) {
      // Generate default range A1-A20 if no input provided
      setFormData(prev => ({
        ...prev,
        seatStart: 'A1',
        seatEnd: 'A20'
      }));
      // Use setTimeout to wait for state update
      setTimeout(() => {
        handleGenerateSeatMap();
      }, 100);
      return;
    }
    
    // Validate format if values are provided
    const startMatch = formData.seatStart.match(/^([A-Z]+)(\d+)$/);
    const endMatch = formData.seatEnd.match(/^([A-Z]+)(\d+)$/);
    
    if (!startMatch || !endMatch) {
      showError('Validation Error', 'Please enter valid seat IDs (e.g., A1, B20, etc.)');
      return;
    }
    
    const [, startRow, startNum] = startMatch;
    const [, endRow, endNum] = endMatch;
    const startRowCode = startRow.charCodeAt(0);
    const endRowCode = endRow.charCodeAt(0);
    const startNumber = parseInt(startNum);
    const endNumber = parseInt(endNum);
    
    // Validate that start comes before or equals end
    if (startRowCode > endRowCode || (startRowCode === endRowCode && startNumber > endNumber)) {
      alert('Start seat must come before or equal to end seat');
      return;
    }
    
    // Add current range to available seats list
    const currentRange = {
      startRow,
      endRow,
      startNumber,
      endNumber,
      startRowCode,
      endRowCode
    };
    
    setAllAvailableSeats(prev => {
      // Check if this range already exists
      const exists = prev.some(range => 
        range.startRow === startRow && 
        range.endRow === endRow && 
        range.startNumber === startNumber && 
        range.endNumber === endNumber
      );
      
      if (!exists) {
        return [...prev, currentRange];
      }
      return prev;
    });
    
    // Show seat map
    setShowSeatMap(true);
    
    // Auto-select all newly generated seats
    const currentRangeSeats = [];
    for (let rowCode = 65; rowCode <= endRowCode; rowCode++) { // 65 = 'A'
      const currentRow = String.fromCharCode(rowCode);
      
      let rowStart, rowEnd;
      if (startRowCode === endRowCode) {
        if (rowCode === startRowCode) {
          rowStart = startNumber;
          rowEnd = endNumber;
        } else {
          continue;
        }
      } else {
        if (rowCode === startRowCode) {
          rowStart = startNumber;
          rowEnd = endNumber;
        } else if (rowCode === endRowCode) {
          rowStart = 1;
          rowEnd = endNumber;
        } else {
          rowStart = 1;
          rowEnd = endNumber;
        }
      }
      
      for (let i = rowStart; i <= rowEnd; i++) {
        currentRangeSeats.push(`${currentRow}${i}`);
      }
    }
    
    // Add new seats to selected seats (avoid duplicates)
    setFormData(prev => ({
      ...prev,
      seatStart: '',
      seatEnd: '',
      selectedSeats: [...new Set([...prev.selectedSeats, ...currentRangeSeats])]
    }));
  }, [formData.seatStart, formData.seatEnd, showError]);

  // Delete specific row from seat map
  const handleDeleteRow = useCallback((rowToDelete) => {
    // Remove ranges that contain this row
    setAllAvailableSeats(prev => {
      return prev.filter(range => {
        const { startRowCode, endRowCode } = range;
        const deleteRowCode = rowToDelete.charCodeAt(0);
        // Keep ranges that don't include the row to delete
        return !(deleteRowCode >= startRowCode && deleteRowCode <= endRowCode);
      });
    });
    
    // Remove selected seats from this row
    setFormData(prev => ({
      ...prev,
      selectedSeats: prev.selectedSeats.filter(seat => !seat.startsWith(rowToDelete))
    }));
  }, []);

  const handleReset = useCallback(() => {
    setFormData({
      theaterId: '',
      qrType: '',
      name: '',
      seatStart: '',
      seatEnd: '',
      selectedSeats: [],
      logoType: 'default',
      logoUrl: defaultLogoUrl,
      seatClass: ''
    });
    setShowSeatMap(false); // Hide seat map when resetting
    setAllAvailableSeats([]); // Clear all stored seat ranges
    setQrNames([]); // Clear QR names when resetting
  }, [defaultLogoUrl]);

  return (
    <ErrorBoundary>
      <AdminLayout pageTitle="Generate QR" currentPage="qr-generate">
        <div className="theater-list-container">
          <div className="theater-main-container">
            <div className="theater-list-header">
              <h1>Generate QR Codes</h1>
            </div>
          <form onSubmit={handleSubmit} className="qr-generate-form">
          {/* Form Section Header */}
          <div className="form-section">
                <h2 className="section-title">Basic Information</h2>
                
                <div className="form-grid">
                  {/* Theater Selection */}
                  <div className="form-group">
                    <label htmlFor="theaterId">
                      SELECT THEATER <span className="required">*</span>
                    </label>
                    {theatersLoading ? (
                      <TheaterSelectSkeleton />
                    ) : (
                      <select
                        id="theaterId"
                        name="theaterId"
                        value={formData.theaterId}
                        onChange={handleInputChange}
                        className="form-control"
                        required
                      >
                        <option value="">
                          {theaters.length === 0 ? 'No active theaters found' : 'Select a theater'}
                        </option>
                        {theaters.map(theater => (
                          <option key={theater._id} value={theater._id}>
                            {theater.name}
                            {theater.location?.city && theater.location?.state && 
                              ` - ${theater.location.city}, ${theater.location.state}`
                            }
                          </option>
                        ))}
                      </select>
                    )}
                    {!theatersLoading && theaters.length === 0 && (
                      <p className="form-help-text">
                        No active theaters available. Please add theaters first.
                      </p>
                    )}
                  </div>

                  {/* Logo Selection */}
                  <div className="form-group">
                    <label htmlFor="logoType">
                      LOGO SELECTION <span className="required">*</span>
                    </label>
                    <select
                      id="logoType"
                      name="logoType"
                      value={formData.logoType}
                      onChange={(e) => handleLogoTypeChange(e.target.value)}
                      className="form-control"
                      required
                    >
                      <option value="">Select Logo Type</option>
                      <option value="default">Default Logo</option>
                      <option value="theater">Theater Logo</option>
                    </select>
                    {formData.logoType === 'default' && !defaultLogoUrl && (
                      <p className="form-help-text">
                        No default logo configured in settings. Please upload a default logo in settings.
                      </p>
                    )}
                    {formData.logoType === 'theater' && formData.theaterId && (
                      (() => {
                        const selectedTheater = theaters.find(t => t._id === formData.theaterId);
                        const hasTheaterLogo = selectedTheater?.logo || selectedTheater?.logoUrl;
                        return !hasTheaterLogo ? (
                          <p className="form-help-text">
                            Selected theater has no logo. Please upload a logo for this theater or use default logo.
                          </p>
                        ) : null;
                      })()
                    )}
                  </div>

                  {/* QR Type Selection */}
                  <div className="form-group">
                    <label htmlFor="qrType">
                      QR CODE TYPE <span className="required">*</span>
                    </label>
                    <select
                      id="qrType"
                      name="qrType"
                      value={formData.qrType}
                      onChange={(e) => handleQRTypeChange(e.target.value)}
                      className="form-control"
                      required
                    >
                      <option value="">Select QR Code Type</option>
                      <option value="single">SINGLE QR CODE</option>
                      <option value="screen">Screen</option>
                    </select>
                  </div>

                  {/* QR Code Name */}
                  <div className="form-group">
                    <label htmlFor="name">
                      QR CODE NAME <span className="required">*</span>
                    </label>
                    {!formData.theaterId ? (
                      <div className="form-control disabled-dropdown">
                        <span>Please select a theater first</span>
                      </div>
                    ) : qrNamesLoading ? (
                      <div className="form-control disabled-dropdown">
                        <span>Loading QR names...</span>
                      </div>
                    ) : qrNames.length === 0 ? (
                      <div className="form-control disabled-dropdown" style={{ color: '#e74c3c' }}>
                        <span>⚠️ All QR names have already been generated for this theater (checked against singleqrcodes database)</span>
                      </div>
                    ) : (
                      <select
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="form-control"
                        required
                      >
                        <option value="">Select QR Code Name</option>
                        {qrNames.map(qrName => (
                          <option key={qrName._id} value={qrName.qrName}>
                            {qrName.qrName}
                          </option>
                        ))}
                      </select>
                    )}
                    {formData.theaterId && !qrNamesLoading && qrNames.length > 0 && (
                      <p className="form-help-text">
                        ✅ {qrNames.length} QR name(s) available for generation (filtered by singleqrcodes database)
                      </p>
                    )}
                  </div>

                  {/* Seat Class - Show for both canteen and screen types */}
                  <div className="form-group">
                    <label htmlFor="seatClass">
                      SEAT CLASS <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      id="seatClass"
                      name="seatClass"
                      value={formData.seatClass}
                      className="form-control"
                      readOnly
                      placeholder={formData.name ? "Auto-populated from QR name" : "Select a QR name first"}
                      title={formData.name ? `Seat class auto-populated from selected QR name: ${formData.name}` : "Seat class will be auto-populated when you select a QR name"}
                    />
                  </div>

                  {/* Screen-specific fields */}
                  {formData.qrType === 'screen' && (
                    <>

                      {/* Seat Range and Generate Button - Always visible for multiple ranges */}
                      <div className="seat-range-container form-group-full">
                        <div className="form-group">
                          <label htmlFor="seatStart">
                            SEAT START ID {(!formData.selectedSeats || formData.selectedSeats.length === 0) && <span className="required">*</span>}
                          </label>
                          <input
                            type="text"
                            id="seatStart"
                            name="seatStart"
                            value={formData.seatStart}
                            onChange={handleInputChange}
                            placeholder="e.g., A1, B1, C1"
                            className="form-control"
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="seatEnd">
                            SEAT END ID {(!formData.selectedSeats || formData.selectedSeats.length === 0) && <span className="required">*</span>}
                          </label>
                          <input
                            type="text"
                            id="seatEnd"
                            name="seatEnd"
                            value={formData.seatEnd}
                            onChange={handleInputChange}
                            placeholder="e.g., A20, B20, C20"
                            className="form-control"
                          />
                        </div>
                        
                        {/* Generate Seat Map Button */}
                        <div className="form-group">
                          <label>&nbsp;</label>
                          <button 
                            type="button" 
                            className="generate-seat-map-btn"
                            onClick={handleGenerateSeatMap}
                          >
                            {formData.selectedSeats && formData.selectedSeats.length > 0 ? 'Add More Seats' : 'Generate Seat Map'}
                          </button>
                        </div>
                      </div>

           
                    </>
                  )}
                </div>
                
                {/* Theater Seat Map for Screen Type - Show only after clicking Generate Seat Map button */}
                {formData.qrType === 'screen' && showSeatMap && (
                  <div className="seat-map-section">
                    <div className="seat-map-header">
                      <h4>Select Seats</h4>
                      <div className="seat-controls">
                        <button 
                          type="button" 
                          className="btn btn-outline btn-sm"
                          onClick={updateSeatRangeFromSelection}
                        >
                          Apply Selected ({formData.selectedSeats.length})
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-outline btn-sm"
                          onClick={() => setFormData(prev => ({ ...prev, selectedSeats: [] }))}
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                    
                    <div className="theater-screen">
                      <div className="screen-label">🎬 SCREEN</div>
                    </div>
                    
                    <div className="seat-map">
                      {generateSeatMap().map(({ row, seats }) => (
                        <div key={row} className="seat-row">
                          <div className="row-label">{row}</div>
                          <div className="seats">
                            {seats.map(seatId => (
                              <button
                                key={seatId}
                                type="button"
                                className={`seat ${formData.selectedSeats.includes(seatId) ? 'selected' : 'available'}`}
                                onClick={() => handleSeatClick(seatId)}
                                title={seatId}
                              >
                                {seatId.replace(/[A-Z]/g, '')}
                              </button>
                            ))}
                          </div>
                          <button 
                            type="button"
                            className="action-btn delete-btn"
                            onClick={() => handleDeleteRow(row)}
                            title={`Delete Row ${row}`}
                          >
                            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    {formData.selectedSeats.length > 0 && (
                      <div className="selection-info">
                        <p><strong>{formData.selectedSeats.length} seats selected</strong></p>
                        <p className="selected-seats-preview">
                          {formData.selectedSeats.slice(0, 10).join(', ')}
                          {formData.selectedSeats.length > 10 && `... and ${formData.selectedSeats.length - 10} more`}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="form-actions">
                <button 
                  type="button" 
                  onClick={() => navigate('/qr-management')} 
                  className="cancel-btn"
                  disabled={generating}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={generating || theatersLoading} 
                  className={`submit-btn ${generating ? 'loading' : ''}`}
                >
                  {generating ? (
                    <>
                      <span className="loading-spinner"></span>
                      Generating...
                    </>
                  ) : (
                    `Generate QR ${formData.qrType === 'screen' ? 'Codes' : 'Code'}`
                  )}
                </button>
              </div>
            </form>
            
            {/* QR Generation Loading Overlay */}
            {generating && (
              <div className="qr-generation-overlay">
                <div className="qr-generation-modal">
                  <div className="qr-generation-header">
                    <h3>Generating QR Codes</h3>
                    <div className="qr-generation-spinner">
                      <div className="spinner-circle"></div>
                    </div>
                  </div>
                  
                  <div className="qr-generation-content">
                    <div className="progress-info">
                      <div className="progress-message">{generatingProgress.message}</div>
                      {generatingProgress.total > 1 && (
                        <div className="progress-counter">
                          {generatingProgress.current} of {generatingProgress.total} completed
                        </div>
                      )}
                    </div>
                    
                    {generatingProgress.total > 1 ? (
                      <div className="progress-bar-container">
                        <div className="progress-bar-wrapper">
                          <div className="progress-bar">
                            <div 
                              className="progress-bar-fill"
                              style={{ 
                                width: `${(generatingProgress.current / generatingProgress.total) * 100}%` 
                              }}
                            >
                              <div className="progress-bar-shine"></div>
                            </div>
                          </div>
                          <div className="progress-percentage-overlay">
                            {Math.round((generatingProgress.current / generatingProgress.total) * 100)}%
                          </div>
                        </div>
                        <div className="progress-stats">
                          <span className="progress-current">{generatingProgress.current}/{generatingProgress.total} QR Codes</span>
                          <span className="progress-speed">Generating...</span>
                        </div>
                      </div>
                    ) : (
                      <div className="simple-loading">
                        <div className="simple-progress-bar">
                          <div className="simple-progress-fill"></div>
                        </div>
                        <div className="loading-text">Creating QR code...</div>
                      </div>
                    )}
                    
                    <div className="generating-details">
                      {formData.qrType === 'screen' && formData.selectedSeats && (
                        <div className="seats-info">
                          <strong>Selected Seats:</strong> {formData.selectedSeats.join(', ')}
                        </div>
                      )}
                      <div className="theater-info">
                        <strong>Theater:</strong> {theaters.find(t => t._id === formData.theaterId)?.name || 'Unknown'}
                      </div>
                      <div className="class-info">
                        <strong>Seat Class:</strong> {formData.seatClass}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Performance Monitoring Display */}
            {process.env.NODE_ENV === 'development' && performanceMetrics && (
              <div style={{
                position: 'fixed',
                bottom: '10px',
                right: '10px',
                background: 'rgba(0,0,0,0.8)',
                color: 'white',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '12px',
                zIndex: 1000
              }}>
                QR Generate: {qrCodeCount} codes | 
                Theaters: {theaters.length} | 
                Memory: {performanceMetrics.memoryUsage}MB
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    </ErrorBoundary>
  );
});

export default QRGenerate;