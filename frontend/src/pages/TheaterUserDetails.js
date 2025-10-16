import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import ErrorBoundary from '../components/ErrorBoundary';
import PageContainer from '../components/PageContainer';
import VerticalPageHeader from '../components/VerticalPageHeader';
import { Button } from '../components/GlobalDesignSystem';
import config from '../config';
import '../styles/TheaterUserDetails.css';
import '../styles/TheaterList.css'; // Import TheaterList styles for table
import '../styles/QRManagementPage.css'; // Import global modal styles
import '../styles/AddTheater.css'; // Import error message styles

const TheaterUserDetails = () => {
  // ✅ FIXED: Using same pattern as RoleAccessManagement.js
  const { theaterId } = useParams();
  const navigate = useNavigate();

  // State management
  const [theater, setTheater] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState(null);
  
  // Role icons mapping
  const roleIconsMap = {
    'theater_admin': '👨‍💼',
    'theater_manager': '👩‍💼', 
    'theater_staff': '👥',
    'admin': '🔧',
    'manager': '📊',
    'staff': '👤',
    'supervisor': '👔'
  };

  // Dynamic roles for tabs (will be populated ONLY from Role Management API)
  const [tabRoles, setTabRoles] = useState([]);
  const [forceRender, setForceRender] = useState(0);
  
  const [users, setUsers] = useState([]);
  
  // Create user form state
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [createUserData, setCreateUserData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phoneNumber: '',
    role: ''
  });
  const [createUserErrors, setCreateUserErrors] = useState({});
  
  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Dynamic roles state with caching
  const [availableRoles, setAvailableRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  
  // Cache roles in sessionStorage for faster subsequent loads (theater-specific)
  const getCachedRoles = () => {
    try {
      const cacheKey = `theater-roles-cache-${theaterId}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const { roles, timestamp } = JSON.parse(cached);
        // Cache expires after 5 minutes
        if (Date.now() - timestamp < 300000) {
          return roles;
        }
      }
    } catch (error) {
      console.log('Cache read error:', error);
    }
    return null;
  };
  
  const setCachedRoles = (roles) => {
    try {
      const cacheKey = `theater-roles-cache-${theaterId}`;
      sessionStorage.setItem(cacheKey, JSON.stringify({
        roles,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.log('Cache write error:', error);
    }
  };

  // Helper function to close modal and reset states
  const closeCreateUserModal = () => {
    setShowCreateUserForm(false);
    setCreateUserData({ username: '', email: '', password: '', confirmPassword: '', fullName: '', phoneNumber: '', role: '' });
    setCreateUserErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  // Filtered users for selected role
  const roleUsers = users.filter(user => {
    // ✅ SAFETY: Handle null/undefined role (orphaned references)
    if (!user.role) {
      console.warn('⚠️ User has no role:', user.username || user._id);
      return false;
    }
    
    // Handle both object (populated) and string (ID) role formats
    const userRoleId = typeof user.role === 'object' ? user.role._id : user.role;
    return userRoleId === selectedRole?.id;
  });

  // Fetch available roles from Role Management with timeout and caching
  const fetchAvailableRoles = useCallback(async () => {
    if (!theaterId) {
      console.warn('⚠️ No theater ID provided, cannot fetch roles');
      return;
    }
    
    try {
      setRolesLoading(true);
      
      console.log('🎭 Starting role fetch for theater:', theaterId);
      
      // Check cache first for instant loading
      const cachedRoles = getCachedRoles();
      if (cachedRoles && cachedRoles.length > 0) {
        console.log('🚀 Using cached roles for instant loading');
        // ✅ CRITICAL FIX: Filter cached roles for safety
        const validCachedRoles = cachedRoles.filter(role => role && role._id && role.name);
        if (validCachedRoles.length > 0) {
          setAvailableRoles(validCachedRoles);
          setTabRoles(validCachedRoles.map(role => ({
            id: role._id,
            name: role.name,
            icon: '👤'
          })));
          setRolesLoading(false);
          return;
        } else {
          console.warn('⚠️ Cached roles were invalid, fetching fresh data');
        }
      }
      
      // Add timeout for faster response
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      // ✅ Fetch theater-specific roles from the roles database
      const apiUrl = `${config.api.baseUrl}/roles?theaterId=${theaterId}&isActive=true`;
      console.log('🎭 Fetching theater-specific roles for theaterId:', theaterId);
      console.log('🔗 Full API URL:', apiUrl);
      console.log('💾 Cache key will be:', `theater-roles-cache-${theaterId}`);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch roles: ${response.status}`);
      }

      const result = await response.json();
      console.log('🔍 Raw API response from Role Management (Theater-Specific):', result);
      console.log('🎭 Loaded roles for theater ID:', theaterId);
      
      if (result.success) {
        // ✅ FIXED: Use same pattern as RoleAccessManagement.js with fallback
        const rolesArray = result.data?.roles || [];
        
        console.log('📋 Extracted roles array from Role Management API:', rolesArray);
        console.log('📋 Number of roles found:', rolesArray.length);
        
        // Filter only active roles and map to consistent structure with safety checks
        const activeRoles = rolesArray
          .filter(role => {
            // ✅ Enhanced filtering with detailed logging
            if (!role) {
              console.warn('⚠️ Null/undefined role found');
              return false;
            }
            if (!role._id) {
              console.warn('⚠️ Role without _id:', role);
              return false;
            }
            if (!role.name) {
              console.warn('⚠️ Role without name:', role);
              return false;
            }
            if (!role.isActive) {
              console.log('ℹ️ Inactive role filtered out:', role.name);
              return false;
            }
            return true;
          })
          .map(role => ({
            _id: role._id,
            roleName: role.name, // Role model uses 'name' field
            name: role.name,
            isActive: role.isActive,
            isDefault: role.isDefault || false // ✅ Include isDefault flag
          }));
          
        console.log('✅ Active theater-specific roles loaded:', activeRoles);
        console.log('🏢 Theater Context:', theaterId);
        
        // ✅ Additional validation
        if (activeRoles.length === 0) {
          console.warn('⚠️ No valid active roles found for this theater');
        }
        
        setAvailableRoles(activeRoles);
        
        // Cache the roles for faster subsequent loads
        setCachedRoles(activeRoles);
        
        // Auto-select first role in create user form if no role selected
        if (activeRoles.length > 0 && !createUserData.role) {
          setCreateUserData(prev => ({ 
            ...prev, 
            role: activeRoles[0]._id 
          }));
          console.log('🎭 Auto-selected first role for form:', activeRoles[0]);
        }
        
        // Update tab roles for consistent display with safety checks
        const tabRolesData = activeRoles
          .filter(role => {
            // ✅ CRITICAL: Multi-step validation to prevent null/undefined
            if (!role) {
              console.error('❌ NULL/UNDEFINED role found in activeRoles!');
              return false;
            }
            if (!role._id) {
              console.error('❌ Role without _id:', JSON.stringify(role));
              return false;
            }
            if (!role.name) {
              console.error('❌ Role without name:', JSON.stringify(role));
              return false;
            }
            return true;
          })
          .map(role => {
            const roleObj = {
              id: role._id,
              name: role.name,
              icon: roleIconsMap[role._id] || roleIconsMap[role.name?.toLowerCase().replace(/\s+/g, '_')] || '👤'
            };
            console.log('✅ Created tab role object:', JSON.stringify(roleObj));
            return roleObj;
          });
        
        console.log('🎭 Setting tab roles:', tabRolesData);
        console.log('📊 Tab roles count:', tabRolesData.length);
        console.log('🔍 Individual tabs:', tabRolesData.filter(r => r && r.name).map((r, i) => `${i+1}. ${r.name}`));
        
        // ✅ Final validation before setting state
        if (tabRolesData.length === 0) {
          console.error('❌ No valid tab roles created! activeRoles:', JSON.stringify(activeRoles));
        }
        
        setTabRoles(tabRolesData);
        setForceRender(prev => prev + 1); // Force re-render
        
        // Set first role as default selected
        if (tabRolesData.length > 0 && !selectedRole) {
          setSelectedRole(tabRolesData[0]);
        }
      } else {
        throw new Error(result.message || 'Failed to fetch roles');
      }
    } catch (error) {
      console.error('❌ Error fetching roles:', error);
      
      if (error.name === 'AbortError') {
        console.log('⏱️ Role API request timed out');
        alert('Role loading timed out. Using basic roles for now. Please check your network connection.');
      }
      
      // Provide minimal fallback for immediate functionality
      const minimalRoles = [
        { _id: 'admin', name: 'Admin', isActive: true },
        { _id: 'manager', name: 'Manager', isActive: true },
        { _id: 'staff', name: 'Staff', isActive: true }
      ];
      
      setAvailableRoles(minimalRoles);
      setTabRoles(minimalRoles.map(role => ({
        id: role._id,
        name: role.name,
        icon: '👤'
      })));
    } finally {
      setRolesLoading(false);
    }
  }, [theaterId, createUserData.role]); // ✅ Added theaterId dependency

  // Fetch theater details
  const fetchTheater = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${config.api.baseUrl}/theaters/${theaterId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch theater: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        // ✅ FIX: Backend returns theater data under 'data' key (not 'theater')
        const theaterData = result.data || result.theater;
        console.log('✅ Theater loaded successfully:', theaterData);
        console.log('🎭 Theater name:', theaterData?.name);
        setTheater(theaterData);
      } else {
        throw new Error(result.message || 'Failed to fetch theater details');
      }
    } catch (error) {
      console.error('Error fetching theater:', error);
      setError('Failed to load theater details');
    } finally {
      setLoading(false);
    }
  }, [theaterId]);

  // Fetch users by theater
  const fetchUsers = useCallback(async () => {
    if (!theaterId) return;
    
    try {
      setLoadingUsers(true);
      const response = await fetch(`${config.api.baseUrl}/theater-users/by-theater/${theaterId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setUsers(result.data || []);
      } else {
        throw new Error(result.message || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  }, [theaterId]);

  // Handle create user
  const handleCreateUser = async (e) => {
    if (e) e.preventDefault();
    
    // Reset errors
    setCreateUserErrors({});
    
    // Enhanced validation
    const errors = {};
    if (!createUserData.username?.trim()) errors.username = 'Username is required';
    if (createUserData.username && createUserData.username.length < 3) errors.username = 'Username must be at least 3 characters';
    if (!createUserData.email?.trim()) errors.email = 'Email is required';
    if (!createUserData.password) errors.password = 'Password is required';
    if (createUserData.password && createUserData.password.length < 6) errors.password = 'Password must be at least 6 characters';
    if (!createUserData.confirmPassword) errors.confirmPassword = 'Confirm password is required';
    if (createUserData.password && createUserData.confirmPassword && createUserData.password !== createUserData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    if (!createUserData.fullName?.trim()) errors.fullName = 'Full name is required';
    if (!createUserData.phoneNumber?.trim()) errors.phoneNumber = 'Phone number is required';
    if (createUserData.phoneNumber && createUserData.phoneNumber.length < 5) errors.phoneNumber = 'Phone number must be at least 5 characters';
    if (!createUserData.role) errors.role = 'Role is required';
    if (!theaterId) errors.theater = 'Theater ID is missing';
    if (theaterId && theaterId.length !== 24 && theaterId.length !== 25) errors.theater = 'Invalid theater ID format';
    if (availableRoles.length === 0) errors.role = 'No roles available. Please create roles in Role Management first.';
    
    if (Object.keys(errors).length > 0) {
      setCreateUserErrors(errors);
      return;
    }

    try {
      setLoadingUsers(true);
      
      // Ensure all required fields are present and correctly formatted
      // Fix theater ID - MongoDB ObjectId must be exactly 24 characters
      const fixedTheaterId = theaterId && theaterId.length > 24 ? theaterId.substring(0, 24) : theaterId;
      
      const payload = {
        theater: fixedTheaterId, // MongoDB ObjectId (exactly 24 chars)
        username: createUserData.username?.trim() || '',
        email: createUserData.email?.trim().toLowerCase() || '',
        password: createUserData.password || '',
        fullName: createUserData.fullName?.trim() || '',
        phoneNumber: createUserData.phoneNumber?.trim() || '+1234567890', // Ensure phone number format
        role: createUserData.role || availableRoles[0]?._id, // Use first available role as fallback
        createdBy: '68ce7371afdea77ebde0eade'
      };
      
      // Ensure we have a role selected
      if (!payload.role && availableRoles.length > 0) {
        payload.role = availableRoles[0]._id;
        console.log('🎭 Auto-selected first available role:', availableRoles[0]);
      }
      
      // Additional validation
      if (!payload.theater) {
        setCreateUserErrors({ submit: 'Theater ID is missing' });
        return;
      }
      
      if (payload.theater.length !== 24) {
        setCreateUserErrors({ submit: `Theater ID must be 24 characters (current: ${payload.theater.length})` });
        return;
      }
      
      if (!payload.role) {
        setCreateUserErrors({ submit: 'Please select a role' });
        return;
      }
      
      console.log('🚀 Creating theater user with payload:', payload);
      console.log('🎭 Theater ID:', theaterId);
      console.log('🎭 Role selected:', createUserData.role);
      console.log('🎭 Available roles:', availableRoles.map(r => ({ id: r._id, name: r.name })));
      console.log('🔍 Full createUserData:', createUserData);
      console.log('🔍 Payload validation:');
      console.log('  - theater (original):', theaterId, 'length:', theaterId?.length);
      console.log('  - theater (fixed):', payload.theater, 'length:', payload.theater?.length, typeof payload.theater);
      console.log('  - username:', payload.username, typeof payload.username);
      console.log('  - email:', payload.email, typeof payload.email);
      console.log('  - password length:', payload.password?.length);
      console.log('  - fullName:', payload.fullName, typeof payload.fullName);
      console.log('  - phoneNumber:', payload.phoneNumber, typeof payload.phoneNumber);
      console.log('  - role:', payload.role, typeof payload.role);
      
      const response = await fetch(`${config.api.baseUrl}/theater-users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(payload)
      });

      console.log('📡 Response status:', response.status);
      const result = await response.json();
      console.log('📥 Response result:', result);
      
      if (result.success) {
        console.log('✅ User created successfully!', result.data);
        closeCreateUserModal();
        await fetchUsers(); // Refresh users list
      } else {
        console.error('❌ Failed to create user:', result.message);
        console.error('❌ Validation errors:', result.errors);
        
        // Handle validation errors specifically
        if (result.errors && Array.isArray(result.errors)) {
          console.log('🔍 Detailed validation errors:', result.errors);
          const fieldErrors = {};
          result.errors.forEach((error, index) => {
            console.log(`🔍 Processing error ${index}:`, {
              path: error.path,
              param: error.param,
              msg: error.msg,
              message: error.message,
              value: error.value,
              location: error.location,
              fullError: error
            });
            if (error.path || error.param) {
              fieldErrors[error.path || error.param] = error.msg || error.message;
            }
          });
          console.log('🔍 Mapped field errors:', fieldErrors);
          
          // If no field errors were mapped, show general error
          if (Object.keys(fieldErrors).length === 0) {
            setCreateUserErrors({ submit: 'Validation failed. Please check all fields.' });
          } else {
            setCreateUserErrors(fieldErrors);
          }
        } else {
          setCreateUserErrors({ submit: result.message || 'Failed to create user' });
        }
      }
    } catch (error) {
      console.error('Error creating user:', error);
      setCreateUserErrors({ submit: 'Network error. Please try again.' });
    } finally {
      setLoadingUsers(false);
    }
  };

  // Handle view user details
  const handleViewUser = (user) => {
    // Navigate to user detail view page
    navigate(`/theater-user-view/${user._id}`, { 
      state: { 
        user: user, 
        theater: theater,
        returnPath: `/theater-users/${theaterId}`
      } 
    });
  };

  // Handle edit user
  const handleEditUser = (user) => {
    // Navigate to user edit page or open edit modal
    navigate(`/theater-user-edit/${user._id}`, { 
      state: { 
        user: user, 
        theater: theater,
        returnPath: `/theater-users/${theaterId}`
      } 
    });
  };

  // Handle delete user
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const response = await fetch(`${config.api.baseUrl}/theater-users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      const result = await response.json();
      if (result.success) {
        // Refresh users list
        await fetchUsers();
      } else {
        alert('Failed to delete user: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user. Please try again.');
    }
  };

  // Load data on component mount - PARALLEL loading for speed
  useEffect(() => {
    console.log('🎬 Component mounted with theaterId:', theaterId);
    
    // Clear any old generic cache that might interfere
    try {
      sessionStorage.removeItem('theater-roles-cache'); // Remove old generic cache
      console.log('🗑️ Cleared old generic role cache');
    } catch (error) {
      console.log('Cache clear error:', error);
    }
    
    // Load all data in parallel for faster loading
    Promise.allSettled([
      fetchTheater(),
      fetchUsers(),
      fetchAvailableRoles()
    ]).then(() => {
      console.log('✅ All initial data loaded');
    });
    
    // Set first role as default selected (will be updated when roles are fetched)
    if (tabRoles.length > 0) {
      setSelectedRole(tabRoles[0]);
    }
  }, [fetchTheater, fetchUsers, fetchAvailableRoles, theaterId]);

  // Error state
  if (error) {
    return (
      <ErrorBoundary>
        <AdminLayout pageTitle="Theater User Management" currentPage="theater-users">
          <div className="theater-user-details-page">
          <PageContainer title="Error">
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: '#dc2626', marginBottom: '20px' }}>{error}</p>
              <Button variant="primary" onClick={() => navigate('/theater-users')}>
                ← Back to Theaters
              </Button>
            </div>
          </PageContainer>
          </div>
        </AdminLayout>
      </ErrorBoundary>
    );
  }

  // Loading state with progress indicator
  if (loading) {
    return (
      <ErrorBoundary>
        <AdminLayout pageTitle="Theater User Management" currentPage="theater-users">
          <div className="theater-user-details-page">
          <PageContainer title="Loading Theater...">
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
              <p style={{ fontSize: '18px', marginBottom: '10px' }}>Loading theater details...</p>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>This should only take a few seconds</p>
              {rolesLoading && (
                <p style={{ color: '#8b5cf6', fontSize: '14px', marginTop: '10px' }}>
                  🔄 Loading roles from Role Management...
                </p>
              )}
            </div>
          </PageContainer>
          </div>
        </AdminLayout>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <AdminLayout pageTitle="Theater User Management" currentPage="theater-users">
        <div className="theater-user-details-page">
        <PageContainer
          hasHeader={false}
          className="theater-user-management-vertical"
        >
          {/* Global Vertical Header Component */}
          <VerticalPageHeader
            title={theater?.name || 'Theater Management'}
            backButtonText="Back to Theater List"
            backButtonPath="/theater-users"
            actionButton={
              <button 
                className="header-btn"
                onClick={() => setShowCreateUserForm(true)}
              >
                <span className="btn-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{width: '20px', height: '20px'}}>
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                </span>
                Add User
              </button>
            }
          />
          <div className="theater-user-settings-container">
            {/* Settings Tabs - EXACTLY like Settings page */}
            <div className="theater-user-settings-tabs" key={`tabs-${forceRender}`}>
              {console.log('🖥️ Rendering tabs, tabRoles length:', tabRoles.length, 'Force render:', forceRender)}
              {console.log('🖥️ tabRoles content:', JSON.stringify(tabRoles))}
              {tabRoles.length > 0 && tabRoles
                .filter(role => {
                  // ✅ CRITICAL: Check role exists first before accessing properties
                  if (!role) {
                    console.warn('⚠️ Found null/undefined role in tabRoles array');
                    return false;
                  }
                  if (!role.id) {
                    console.warn('⚠️ Found role without id:', role);
                    return false;
                  }
                  if (!role.name) {
                    console.warn('⚠️ Found role without name:', role);
                    return false;
                  }
                  return true;
                })
                .map((role, index) => (
                <button
                  key={`${role.id}-${forceRender}`}
                  className={`theater-user-settings-tab ${selectedRole?.id === role.id ? 'active' : ''}`}
                  onClick={() => setSelectedRole(role)}
                >
                  <span className="theater-user-tab-icon">{role.icon || '👤'}</span>
                  {role.name}
                  <span style={{fontSize: '10px', opacity: 0.5}}>({index + 1})</span>
                </button>
              ))}
            </div>

            {/* Settings Content - EXACTLY like Settings page */}
            <div className="theater-user-settings-content">
              {selectedRole ? (
                <div className="theater-user-settings-section">
                  <div className="theater-user-section-header">
                    <h3>Users with {selectedRole.name} Role</h3>
                  </div>
                  
                  {/* User Management Content */}
                  {loadingUsers ? (
                    <div className="theater-user-empty-state">
                      <div className="theater-user-empty-state-icon">⏳</div>
                      <h4>Loading users...</h4>
                      <p>Please wait while we fetch the user data.</p>
                    </div>
                  ) : roleUsers.length > 0 ? (
                    <div className="table-container">
                      <div className="table-wrapper">
                        <table className="theater-table">
                          <thead>
                            <tr>
                              <th className="sno-col">S.No</th>
                              <th className="name-col">Username</th>
                              <th className="contact-col">Email</th>
                              <th className="location-col">Theater</th>
                              <th className="agreement-col">Created Date</th>
                              <th className="status-col">Status</th>
                              <th className="actions-col">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {roleUsers.map((user, index) => (
                              <tr key={user._id}>
                                <td className="sno-cell">
                                  <span className="sno-number">{index + 1}</span>
                                </td>
                                <td className="name-cell">
                                  <span className="username-text">{user.username}</span>
                                </td>
                                <td className="contact-cell">
                                  <span className="email-text">{user.email}</span>
                                </td>
                                <td className="location-cell">
                                  <span className="theater-text">{user.theater?.name || 'N/A'}</span>
                                </td>
                                <td className="agreement-cell">
                                  <span className="date-text">{new Date(user.createdAt).toLocaleDateString()}</span>
                                </td>
                                <td className="status-cell">
                                  <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                                    {user.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="actions-cell">
                                  <div className="action-buttons">
                                    <button 
                                      className="btn btn-view" 
                                      data-tooltip="View Details"
                                      onClick={() => handleViewUser(user)}
                                    >
                                      <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                                      </svg>
                                    </button>
                                    <button 
                                      className="btn btn-edit" 
                                      data-tooltip="Edit User"
                                      onClick={() => handleEditUser(user)}
                                    >
                                      <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                                      </svg>
                                    </button>
                                    <button 
                                      className="btn btn-delete" 
                                      data-tooltip="Delete User"
                                      onClick={() => handleDeleteUser(user._id)}
                                    >
                                      <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                      </svg>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="theater-user-empty-state">
                      <div className="theater-user-empty-state-icon">👤</div>
                      <h4>No users found</h4>
                      <p>No users found with {selectedRole.name} role for this theater.</p>
                      <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem', marginTop: '8px' }}>
                        Use the "Add User" button in the top right to add a new user.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="theater-user-empty-state">
                  <div className="theater-user-empty-state-icon">🔧</div>
                  <h4>Select a Role</h4>
                  <p>Choose a role from the tabs above to view and manage users.</p>
                </div>
              )}
            </div>
          </div>

          {/* Create User Modal - Using Global Design System */}
          {showCreateUserForm && (
            <div className="modal-overlay" onClick={closeCreateUserModal}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>Create New User</h2>
                  <button 
                    className="close-btn"
                    onClick={closeCreateUserModal}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" style={{width: '20px', height: '20px'}}>
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </button>
                </div>
                
                <div className="modal-body">
                  <div className="edit-form">
                    <div className="form-group">
                      <label>Theater</label>
                      <input 
                        type="text"
                        value={theater?.name || (loading ? 'Loading theater...' : 'Theater information unavailable')}
                        readOnly
                        className="form-control"
                        style={{ 
                          backgroundColor: '#f8fafc', 
                          cursor: 'not-allowed',
                          fontWeight: theater?.name ? '600' : '400',
                          color: theater?.name ? '#1f2937' : '#6b7280'
                        }}
                      />
                      {theater?.name && theater?.address && (
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>
                          📍 {theater.address?.city || 'Unknown City'}, {theater.address?.state || 'Unknown State'}
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Username *</label>
                      <input
                        type="text"
                        value={createUserData.username}
                        onChange={(e) => setCreateUserData(prev => ({ ...prev, username: e.target.value }))}
                        placeholder="Enter username"
                        className="form-control"
                      />
                      {createUserErrors.username && (
                        <div className="error-message">{createUserErrors.username}</div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Full Name *</label>
                      <input
                        type="text"
                        value={createUserData.fullName}
                        onChange={(e) => setCreateUserData(prev => ({ ...prev, fullName: e.target.value }))}
                        placeholder="Enter full name"
                        className="form-control"
                      />
                      {createUserErrors.fullName && (
                        <div className="error-message">{createUserErrors.fullName}</div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Email Address *</label>
                      <input
                        type="email"
                        value={createUserData.email}
                        onChange={(e) => setCreateUserData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter email address"
                        className="form-control"
                      />
                      {createUserErrors.email && (
                        <div className="error-message">{createUserErrors.email}</div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Phone Number *</label>
                      <input
                        type="tel"
                        value={createUserData.phoneNumber}
                        onChange={(e) => setCreateUserData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                        placeholder="Enter phone number"
                        className="form-control"
                      />
                      {createUserErrors.phoneNumber && (
                        <div className="error-message">{createUserErrors.phoneNumber}</div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Password *</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={createUserData.password}
                          onChange={(e) => setCreateUserData(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="Enter password"
                          className="form-control"
                          style={{ paddingRight: '45px' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#6b7280',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {showPassword ? (
                            <svg viewBox="0 0 24 24" fill="currentColor" style={{width: '18px', height: '18px'}}>
                              <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="currentColor" style={{width: '18px', height: '18px'}}>
                              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                            </svg>
                          )}
                        </button>
                      </div>
                      {createUserErrors.password && (
                        <div className="error-message">{createUserErrors.password}</div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Confirm Password *</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={createUserData.confirmPassword}
                          onChange={(e) => setCreateUserData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          placeholder="Confirm password"
                          className="form-control"
                          style={{ paddingRight: '45px' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#6b7280',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {showConfirmPassword ? (
                            <svg viewBox="0 0 24 24" fill="currentColor" style={{width: '18px', height: '18px'}}>
                              <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="currentColor" style={{width: '18px', height: '18px'}}>
                              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                            </svg>
                          )}
                        </button>
                      </div>
                      {createUserErrors.confirmPassword && (
                        <div className="error-message">{createUserErrors.confirmPassword}</div>
                      )}
                      {!createUserErrors.confirmPassword && createUserData.password && createUserData.confirmPassword && createUserData.password === createUserData.confirmPassword && (
                        <div style={{ color: '#10b981', fontSize: '0.8rem', marginTop: '6px', fontWeight: '500', display: 'flex', alignItems: 'center' }}>
                          <span style={{ marginRight: '6px' }}>✓</span>
                          Passwords match
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Role *</label>
                      {/* Debug info */}
                      {console.log('🎯 Current availableRoles in render:', availableRoles)}
                      <select
                        value={createUserData.role}
                        onChange={(e) => {
                          console.log('🎭 Role selected:', e.target.value);
                          setCreateUserData(prev => ({ ...prev, role: e.target.value }));
                        }}
                        className="form-control"
                        disabled={rolesLoading}
                      >
                        <option value="">
                          {rolesLoading ? 'Loading roles...' : 'Select Role'}
                        </option>
                        {availableRoles.map((role, index) => {
                          console.log(`🎭 Rendering dynamic role ${index}:`, role);
                          
                          return (
                            <option key={role._id || role.id || index} value={role._id || role.id}>
                              {role.name || role.roleName || 'Unknown Role'}
                            </option>
                          );
                        })}
                      </select>
                      {createUserErrors.role && (
                        <div className="error-message">{createUserErrors.role}</div>
                      )}
                      {rolesLoading && (
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>
                          🔄 Loading dynamic roles from Role Management API...
                        </div>
                      )}
                      {!rolesLoading && availableRoles.length > 0 && (
                        <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '4px' }}>
                          ✅ {availableRoles.length} dynamic role(s) loaded from Role Management API
                        </div>
                      )}
                      {!rolesLoading && availableRoles.length === 0 && (
                        <div style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '4px' }}>
                          ❌ No roles found. Please create roles in Role Management first.
                        </div>
                      )}
                    </div>
                  </div>

                  {createUserErrors.submit && (
                    <div className="error-message" style={{ marginTop: '16px', textAlign: 'center' }}>
                      {createUserErrors.submit}
                    </div>
                  )}
                  
                  <div className="modal-actions">
                    <button 
                      className="cancel-btn" 
                      onClick={closeCreateUserModal}
                    >
                      Cancel
                    </button>
                    <button 
                      className="btn-primary"
                      onClick={handleCreateUser}
                      disabled={loadingUsers}
                    >
                      {loadingUsers ? 'Creating...' : 'Create User'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </PageContainer>
        </div>
      </AdminLayout>
    </ErrorBoundary>
  );
}

export default TheaterUserDetails;