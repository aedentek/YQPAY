import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import TheaterLayout from '../../components/theater/TheaterLayout';
import PageContainer from '../../components/PageContainer';
import ErrorBoundary from '../../components/ErrorBoundary';
import { useModal } from '../../contexts/ModalContext';
import { usePerformanceMonitoring } from '../../hooks/usePerformanceMonitoring';
import config from '../../config';
import '../../styles/QRGenerate.css';
import '../../styles/TheaterList.css';

const TheaterGenerateQR = () => {
  const navigate = useNavigate();
  const { theaterId } = useParams();
  const { user, theaterId: userTheaterId, userType } = useAuth();
  const { showError, showSuccess, alert } = useModal();
  
  // PERFORMANCE MONITORING
  usePerformanceMonitoring('TheaterGenerateQR');
  
  const abortControllerRef = useRef(null);
  
  // Form state
  const [formData, setFormData] = useState({
    qrType: '',
    name: '',
    seatStart: '',
    seatEnd: '',
    selectedSeats: [],
    logoType: '',
    logoUrl: '',
    seatClass: ''
  });
  
  // UI state
  const [generating, setGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState({ current: 0, total: 0, message: '' });
  const [showSeatMap, setShowSeatMap] = useState(false);
  const [allAvailableSeats, setAllAvailableSeats] = useState([]);
  const [defaultLogoUrl, setDefaultLogoUrl] = useState('');
  const [theaterLogoUrl, setTheaterLogoUrl] = useState('');
  
  // QR Names state
  const [qrNames, setQrNames] = useState([]);
  const [qrNamesLoading, setQrNamesLoading] = useState(false);

  // Validate theater access
  useEffect(() => {
    if (userType === 'theater_user' && userTheaterId && theaterId !== userTheaterId) {
      console.error('Theater access denied: User can only access their own theater');
      return;
    }
  }, [theaterId, userTheaterId, userType]);

  // Load default logo and theater data
  useEffect(() => {
    loadDefaultLogo();
    loadTheaterLogo();
    loadQRNames();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [theaterId]);

  const loadDefaultLogo = useCallback(async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const response = await fetch(`${config.api.baseUrl}/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setDefaultLogoUrl(data.data.defaultQRLogo || '');
        }
      }
    } catch (error) {
      console.error('Error loading default logo:', error);
    }
  }, []);

  const loadTheaterLogo = useCallback(async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const response = await fetch(`${config.api.baseUrl}/theaters/${theaterId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const theater = data.data;
          const logoUrl = theater.media?.logo || theater.logo || theater.logoUrl || '';
          setTheaterLogoUrl(logoUrl);
        }
      }
    } catch (error) {
      console.error('Error loading theater logo:', error);
    }
  }, [theaterId]);

  const loadQRNames = useCallback(async () => {
    if (!theaterId) return;
    
    try {
      setQrNamesLoading(true);
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      
      // Fetch available QR code names
      const apiUrl = `${config.api.baseUrl}/qrcodenames?theaterId=${theaterId}&limit=100&_t=${Date.now()}`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch QR names');
      }
      
      const data = await response.json();
      
      if (data.success && data.data && data.data.qrCodeNames) {
        // Fetch existing QR codes to filter out already generated ones
        let existingQRNames = [];
        
        try {
          const existingQRsResponse = await fetch(`${config.api.baseUrl}/singleqrcodes?theaterId=${theaterId}&limit=1000`, {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (existingQRsResponse.ok) {
            const existingQRsData = await existingQRsResponse.json();
            if (existingQRsData.success && existingQRsData.data) {
              existingQRNames = [...new Set(existingQRsData.data.map(qr => qr.name))];
            }
          }
        } catch (fetchError) {
          console.warn('Could not fetch existing QR codes:', fetchError);
          existingQRNames = [];
        }
        
        // Filter out already generated QR names
        const availableQRNames = data.data.qrCodeNames.filter(
          qrName => !existingQRNames.includes(qrName.qrName)
        );
        
        setQrNames(availableQRNames);
      } else {
        setQrNames([]);
      }
    } catch (error) {
      console.error('Error loading QR names:', error);
      setQrNames([]);
    } finally {
      setQrNamesLoading(false);
    }
  }, [theaterId]);

  const handleInputChange = useCallback((e) => {
    const { name, value, type } = e.target;
    
    if (name === 'name') {
      const selectedQRName = qrNames.find(qr => qr.qrName === value);
      setFormData(prev => ({
        ...prev,
        name: value,
        seatClass: selectedQRName ? selectedQRName.seatClass : ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseInt(value) || 0 : value
      }));
    }
  }, [qrNames]);

  const handleLogoTypeChange = useCallback((logoType) => {
    let logoUrl = '';
    
    if (logoType === 'default') {
      logoUrl = defaultLogoUrl;
    } else if (logoType === 'theater') {
      logoUrl = theaterLogoUrl;
    }
    
    setFormData(prev => ({
      ...prev,
      logoType,
      logoUrl
    }));
  }, [defaultLogoUrl, theaterLogoUrl]);

  const handleQRTypeChange = useCallback((qrType) => {
    setFormData(prev => ({
      ...prev,
      qrType,
      seatStart: '',
      seatEnd: '',
      selectedSeats: []
    }));
    setShowSeatMap(false);
    setAllAvailableSeats([]);
  }, []);

  const handleGenerateSeatMap = useCallback(() => {
    if (!formData.seatStart && !formData.seatEnd) {
      setFormData(prev => ({
        ...prev,
        seatStart: 'A1',
        seatEnd: 'A20'
      }));
      setTimeout(() => {
        handleGenerateSeatMap();
      }, 100);
      return;
    }
    
    const startMatch = formData.seatStart.match(/^([A-Z]+)(\d+)$/);
    const endMatch = formData.seatEnd.match(/^([A-Z]+)(\d+)$/);
    
    if (!startMatch || !endMatch) {
      showError('Invalid seat format. Use format like A1, B20, etc.');
      return;
    }
    
    const [, startRow, startNum] = startMatch;
    const [, endRow, endNum] = endMatch;
    const startRowCode = startRow.charCodeAt(0);
    const endRowCode = endRow.charCodeAt(0);
    const startNumber = parseInt(startNum);
    const endNumber = parseInt(endNum);
    
    if (startRowCode > endRowCode || (startRowCode === endRowCode && startNumber > endNumber)) {
      showError('Start seat must come before or equal to end seat');
      return;
    }
    
    const currentRange = {
      startRow,
      endRow,
      startNumber,
      endNumber,
      startRowCode,
      endRowCode
    };
    
    setAllAvailableSeats(prev => {
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
    
    setShowSeatMap(true);
    
    // Auto-select newly generated seats
    const currentRangeSeats = [];
    for (let rowCode = startRowCode; rowCode <= endRowCode; rowCode++) {
      const currentRow = String.fromCharCode(rowCode);
      let rowStart = rowCode === startRowCode ? startNumber : 1;
      let rowEnd = rowCode === endRowCode ? endNumber : endNumber;
      
      for (let i = rowStart; i <= rowEnd; i++) {
        currentRangeSeats.push(`${currentRow}${i}`);
      }
    }
    
    setFormData(prev => ({
      ...prev,
      selectedSeats: [...new Set([...prev.selectedSeats, ...currentRangeSeats])]
    }));
  }, [formData.seatStart, formData.seatEnd, showError]);

  const toggleSeatSelection = useCallback((seatId) => {
    setFormData(prev => ({
      ...prev,
      selectedSeats: prev.selectedSeats.includes(seatId)
        ? prev.selectedSeats.filter(s => s !== seatId)
        : [...prev.selectedSeats, seatId]
    }));
  }, []);

  const validateForm = useCallback(() => {
    if (!formData.logoType) {
      showError('Please select a logo type');
      return false;
    }
    
    if (!formData.qrType) {
      showError('Please select QR code type');
      return false;
    }
    
    if (!formData.name) {
      showError('Please select QR code name');
      return false;
    }
    
    if (!formData.seatClass) {
      showError('Seat class is required');
      return false;
    }
    
    if (formData.qrType === 'screen' && (!formData.selectedSeats || formData.selectedSeats.length === 0)) {
      showError('Please select at least one seat for screen type QR codes');
      return false;
    }
    
    return true;
  }, [formData, showError]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setGenerating(true);
      
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      
      const payload = {
        theaterId: theaterId,
        type: formData.qrType,
        name: formData.name,
        logoUrl: formData.logoUrl,
        seatClass: formData.seatClass,
        ...(formData.qrType === 'screen' && {
          seats: formData.selectedSeats
        })
      };
      
      const totalSeats = formData.qrType === 'single' ? 1 : (formData.selectedSeats?.length || 0);
      
      setGeneratingProgress({
        current: 0,
        total: totalSeats,
        message: 'Starting QR code generation...'
      });
      
      const response = await fetch(`${config.api.baseUrl}/singleqrcodes/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate QR codes');
      }
      
      const data = await response.json();
      
      if (data.success) {
        const count = data.count || (data.data && data.data.count) || totalSeats;
        const message = formData.qrType === 'single' 
          ? 'Single QR code generated and saved successfully!'
          : `${count} screen QR codes generated successfully!`;
        
        setGeneratingProgress({
          current: totalSeats,
          total: totalSeats,
          message: 'QR codes generated successfully!'
        });
        
        setTimeout(() => {
          setGenerating(false);
          
          // Reload QR names
          setTimeout(() => {
            loadQRNames();
          }, 500);
          
          showSuccess(message);
          
          // Reset form
          setFormData({
            qrType: '',
            name: '',
            seatStart: '',
            seatEnd: '',
            selectedSeats: [],
            logoType: '',
            logoUrl: '',
            seatClass: ''
          });
          setShowSeatMap(false);
          setAllAvailableSeats([]);
        }, 1000);
      } else {
        throw new Error(data.message || 'Failed to generate QR codes');
      }
    } catch (error) {
      console.error('Error generating QR codes:', error);
      showError(error.message || 'Failed to generate QR codes');
      setGenerating(false);
    }
  }, [formData, theaterId, validateForm, loadQRNames, showSuccess, showError]);

  return (
    <ErrorBoundary>
      <TheaterLayout pageTitle="Generate QR Codes" currentPage="generate-qr">
        <PageContainer title="Generate QR Codes">
        
        {/* Purple Header */}
        <div className="qr-generate-header">
          <h1>Generate QR Codes</h1>
        </div>

        {/* Main Form Container */}
        <div className="qr-generate-container">
          <form onSubmit={handleSubmit} className="qr-generate-form">
            
            {/* Basic Information Section */}
            <div className="form-section">
              <div className="section-header">
                <div className="section-indicator"></div>
                <h2>Basic Information</h2>
              </div>

              <div className="form-grid">
                {/* Logo Type Selection */}
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
                      No default logo configured in settings.
                    </p>
                  )}
                  {formData.logoType === 'theater' && !theaterLogoUrl && (
                    <p className="form-help-text">
                      Theater has no logo. Please upload a logo or use default logo.
                    </p>
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
                  {qrNamesLoading ? (
                    <div className="form-control disabled-dropdown">
                      <span>Loading QR names...</span>
                    </div>
                  ) : qrNames.length === 0 ? (
                    <div className="form-control disabled-dropdown" style={{ color: '#e74c3c' }}>
                      <span>⚠️ All QR names have already been generated for this theater</span>
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
                  {!qrNamesLoading && qrNames.length > 0 && (
                    <p className="form-help-text">
                      ✅ {qrNames.length} QR name(s) available for generation
                    </p>
                  )}
                </div>

                {/* Seat Class */}
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
                  />
                </div>

                {/* Screen-specific fields */}
                {formData.qrType === 'screen' && (
                  <>
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

                    <div className="form-group" style={{gridColumn: '1 / -1'}}>
                      <button 
                        type="button" 
                        className="generate-seat-map-btn"
                        onClick={handleGenerateSeatMap}
                      >
                        {formData.selectedSeats && formData.selectedSeats.length > 0 ? 'Add More Seats' : 'Generate Seat Map'}
                      </button>
                    </div>

                    {/* Seat Map */}
                    {showSeatMap && allAvailableSeats.length > 0 && (
                      <div className="seat-map-section" style={{gridColumn: '1 / -1'}}>
                        <h3>Select Seats ({formData.selectedSeats.length} selected)</h3>
                        {allAvailableSeats.map((range, rangeIndex) => (
                          <div key={rangeIndex} className="seat-range-block">
                            <h4>Range: {range.startRow}{range.startNumber} - {range.endRow}{range.endNumber}</h4>
                            <div className="seat-grid">
                              {Array.from({ length: range.endRowCode - range.startRowCode + 1 }, (_, i) => {
                                const rowCode = range.startRowCode + i;
                                const currentRow = String.fromCharCode(rowCode);
                                let rowStart = rowCode === range.startRowCode ? range.startNumber : 1;
                                let rowEnd = rowCode === range.endRowCode ? range.endNumber : range.endNumber;
                                
                                return (
                                  <div key={currentRow} className="seat-row">
                                    <div className="row-label">{currentRow}</div>
                                    {Array.from({ length: rowEnd - rowStart + 1 }, (_, j) => {
                                      const seatNumber = rowStart + j;
                                      const seatId = `${currentRow}${seatNumber}`;
                                      const isSelected = formData.selectedSeats.includes(seatId);
                                      
                                      return (
                                        <div
                                          key={seatId}
                                          className={`seat ${isSelected ? 'selected' : ''}`}
                                          onClick={() => toggleSeatSelection(seatId)}
                                        >
                                          {seatNumber}
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="form-actions">
              <button 
                type="submit" 
                className="submit-btn"
                disabled={generating}
              >
                {generating ? `Generating... ${generatingProgress.current}/${generatingProgress.total}` : 'Generate QR Codes'}
              </button>
            </div>
          </form>

          {/* Progress Modal */}
          {generating && (
            <div className="modal-overlay">
              <div className="progress-modal">
                <h3>Generating QR Codes</h3>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{width: `${(generatingProgress.current / generatingProgress.total) * 100}%`}}
                  ></div>
                </div>
                <p>{generatingProgress.message}</p>
                <p>{generatingProgress.current} / {generatingProgress.total}</p>
              </div>
            </div>
          )}
        </div>

        </PageContainer>
      </TheaterLayout>
    </ErrorBoundary>
  );
};

export default TheaterGenerateQR;
