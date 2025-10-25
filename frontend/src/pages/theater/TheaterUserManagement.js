import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TheaterLayout from '../../components/theater/TheaterLayout';
import ErrorBoundary from '../../components/ErrorBoundary';
import PageContainer from '../../components/PageContainer';
import VerticalPageHeader from '../../components/VerticalPageHeader';
import { ActionButton, ActionButtons } from '../../components/ActionButton';
import config from '../../config';
import '../../styles/TheaterGlobalModals.css'; // Global theater modal styles
import '../../styles/TheaterUserDetails.css';
import '../../styles/TheaterList.css';
import '../../styles/QRManagementPage.css';
import '../../styles/AddTheater.css';

const TheaterUserManagement = () => {
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

  // Dynamic roles for tabs
  const [tabRoles, setTabRoles] = useState([]);
  const [users, setUsers] = useState([]);
  
  // Modal states
  const [crudModal, setCrudModal] = useState({ isOpen: false, mode: 'view', user: null });
  const [deleteModal, setDeleteModal] = useState({ show: false, userId: null, userName: '' });
  const [successModal, setSuccessModal] = useState({ show: false, message: '' });
  
  // Form data
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phoneNumber: '',
    role: ''
  });
  const [formErrors, setFormErrors] = useState({});
  
  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Available roles
  const [availableRoles, setAvailableRoles] = useState([]);

  // Get auth headers
  const getAuthHeaders = () => {
    const authToken = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    };
  };

  // Fetch theater details
  const fetchTheaterDetails = useCallback(async () => {
    try {
      console.log('🏛️ Fetching theater details for:', theaterId);
      const response = await fetch(`${config.api.baseUrl}/theaters/${theaterId}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const result = await response.json();
        console.log('📦 Raw theater response:', result);
        const theaterData = result.data || result.theater || result;
        console.log('✅ Theater loaded:', theaterData);
        setTheater(theaterData);
      } else {
        console.error('❌ Failed to fetch theater, status:', response.status);
        setError('Failed to load theater details');
      }
    } catch (err) {
      console.error('❌ Error fetching theater:', err);
      setError('Error loading theater details');
    }
  }, [theaterId]);

  // Fetch available roles
  const fetchAvailableRoles = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        theaterId: theaterId,
        isActive: 'true'
      });

      console.log('🎭 Fetching roles for theater:', theaterId);
      const response = await fetch(`${config.api.baseUrl}/roles?${params.toString()}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const result = await response.json();
        console.log('📦 Raw roles response:', result);
        
        // Handle multiple possible response structures
        let rolesArray = [];
        if (result.success && result.data) {
          rolesArray = result.data.roles || result.data || [];
        } else if (result.roles) {
          rolesArray = result.roles;
        } else if (Array.isArray(result)) {
          rolesArray = result;
        }
        
        console.log('📋 Extracted roles:', rolesArray);
        const validRoles = rolesArray
          .filter(role => role && role._id && role.name && role.isActive !== false)
          .sort((a, b) => a._id.localeCompare(b._id));
        
        console.log('✅ Valid roles loaded:', validRoles);
        setAvailableRoles(validRoles);
        
        const mappedRoles = validRoles.map(role => ({
          id: role._id,
          name: role.name,
          icon: roleIconsMap[role.name.toLowerCase().replace(/\s+/g, '_')] || '👤'
        }));
        
        console.log('🎯 Mapped tab roles:', mappedRoles);
        setTabRoles(mappedRoles);

        // Auto-select first role
        if (mappedRoles.length > 0 && !selectedRole) {
          console.log('🎯 Auto-selecting first role:', mappedRoles[0]);
          setSelectedRole(mappedRoles[0]);
        }
      } else {
        console.error('❌ Failed to fetch roles, status:', response.status);
        setTabRoles([]);
      }
    } catch (err) {
      console.error('❌ Error fetching roles:', err);
      setTabRoles([]);
    }
  }, [theaterId, selectedRole]);

  // Fetch users for the theater
  const fetchUsers = useCallback(async () => {
    if (!theaterId) return;

    try {
      setLoadingUsers(true);
      
      const params = new URLSearchParams({
        theaterId: theaterId,
        page: '1',
        limit: '100',
        isActive: 'true'
      });

      console.log('🔍 Fetching users from:', `${config.api.baseUrl}/theater-users?${params.toString()}`);
      
      const response = await fetch(`${config.api.baseUrl}/theater-users?${params.toString()}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const result = await response.json();
        console.log('📦 Raw users response:', result);
        
        // Handle multiple possible response structures
        let usersList = [];
        if (result.success && result.data) {
          usersList = result.data.users || result.data || [];
        } else if (result.users) {
          usersList = result.users;
        } else if (Array.isArray(result)) {
          usersList = result;
        }
        
        console.log('✅ Users loaded:', usersList);
        // Ensure we always set an array
        setUsers(Array.isArray(usersList) ? usersList : []);
      } else {
        console.error('❌ Failed to fetch users, status:', response.status);
        setUsers([]);
      }
    } catch (err) {
      console.error('❌ Error fetching users:', err);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [theaterId]);

  // Filtered users for selected role
  const roleUsers = Array.isArray(users) ? users.filter(user => {
    if (!user.role) return false;
    const userRoleId = typeof user.role === 'object' ? user.role._id : user.role;
    return userRoleId === selectedRole?.id;
  }) : [];

  // Initialize
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchTheaterDetails();
      await fetchAvailableRoles();
      setLoading(false);
    };
    init();
  }, [fetchTheaterDetails, fetchAvailableRoles]);

  // Fetch users when component mounts or when selected role changes
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Open CRUD modal
  const openCrudModal = (user = null, mode = 'view') => {
    if (user) {
      setFormData({
        userId: user._id,
        username: user.username || '',
        email: user.email || '',
        fullName: user.fullName || '',
        phoneNumber: user.phoneNumber || '',
        role: typeof user.role === 'object' ? user.role._id : user.role,
        password: '',
        confirmPassword: ''
      });
    } else {
      setFormData({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        phoneNumber: '',
        role: selectedRole?.id || ''
      });
    }
    setFormErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
    setCrudModal({ isOpen: true, mode, user });
  };

  // Close CRUD modal
  const closeCrudModal = () => {
    setCrudModal({ isOpen: false, mode: 'view', user: null });
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      phoneNumber: '',
      role: ''
    });
    setFormErrors({});
  };

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    if (!formData.username?.trim()) errors.username = 'Username is required';
    if (!formData.email?.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Invalid email format';
    
    if (crudModal.mode === 'create') {
      if (!formData.password) errors.password = 'Password is required';
      else if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters';
      if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    } else if (crudModal.mode === 'edit' && formData.password) {
      if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters';
      if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.fullName?.trim()) errors.fullName = 'Full name is required';
    if (!formData.role) errors.role = 'Role is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle create user
  const handleCreateUser = async () => {
    if (!validateForm()) return;

    try {
      const payload = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        role: formData.role,
        theater: theaterId
      };

      const response = await fetch(`${config.api.baseUrl}/theater-users`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setSuccessModal({ show: true, message: 'User created successfully!' });
        closeCrudModal();
        fetchUsers();
      } else {
        const errorData = await response.json();
        setFormErrors({ submit: errorData.error || 'Failed to create user' });
      }
    } catch (err) {
      console.error('Error creating user:', err);
      setFormErrors({ submit: 'Error creating user' });
    }
  };

  // Handle update user
  const handleUpdateUser = async () => {
    if (!validateForm()) return;

    try {
      const payload = {
        username: formData.username,
        email: formData.email,
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        role: formData.role
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      const response = await fetch(`${config.api.baseUrl}/theater-users/${formData.userId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setSuccessModal({ show: true, message: 'User updated successfully!' });
        closeCrudModal();
        fetchUsers();
      } else {
        const errorData = await response.json();
        setFormErrors({ submit: errorData.error || 'Failed to update user' });
      }
    } catch (err) {
      console.error('Error updating user:', err);
      setFormErrors({ submit: 'Error updating user' });
    }
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    try {
      const response = await fetch(`${config.api.baseUrl}/theater-users/${deleteModal.userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setSuccessModal({ show: true, message: 'User deleted successfully!' });
        setDeleteModal({ show: false, userId: null, userName: '' });
        fetchUsers();
      }
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  // Handle form submit
  const handleSubmit = (e) => {
    e.preventDefault();
    if (crudModal.mode === 'create') {
      handleCreateUser();
    } else if (crudModal.mode === 'edit') {
      handleUpdateUser();
    }
  };

  if (loading) {
    return (
      <ErrorBoundary>
        <TheaterLayout pageTitle="Theater Users">
          <div className="theater-details-container">
            <div className="loading-state">Loading...</div>
          </div>
        </TheaterLayout>
      </ErrorBoundary>
    );
  }

  if (error) {
    return (
      <ErrorBoundary>
        <TheaterLayout pageTitle="Theater Users">
          <div className="theater-details-container">
            <div className="error-state">{error}</div>
          </div>
        </TheaterLayout>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <TheaterLayout pageTitle="Theater Users">
        <div className="theater-user-details-page">
          <PageContainer hasHeader={false} className="theater-user-management-vertical">
            {/* Debug info */}
            {console.log('🖥️ RENDER - Theater:', theater?.name)}
            {console.log('🖥️ RENDER - Tab Roles:', tabRoles)}
            {console.log('🖥️ RENDER - Selected Role:', selectedRole)}
            {console.log('🖥️ RENDER - Users:', users)}
            {console.log('🖥️ RENDER - Role Users:', roleUsers)}
            
            {/* Vertical Page Header */}
            <VerticalPageHeader
              title={theater?.name || 'Theater User Management'}
              backButtonText="← Back"
              backButtonPath={`/theater-dashboard/${theaterId}`}
              actionButton={
                <button className="header-btn" onClick={() => openCrudModal(null, 'create')}>
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
              {/* Role Tabs */}
              <div className="theater-user-settings-tabs">
                {tabRoles.length > 0 && tabRoles.map((role) => (
                  <button
                    key={role.id}
                    className={`theater-user-settings-tab ${selectedRole?.id === role.id ? 'active' : ''}`}
                    onClick={() => setSelectedRole(role)}
                  >
                    <span className="theater-user-tab-icon">{role.icon || '👤'}</span>
                    {role.name}
                  </button>
                ))}
              </div>

              {/* Settings Content */}
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
                                  <td className="status-cell">
                                    <span className={`status-badge ${user.isActive !== false ? 'active' : 'inactive'}`}>
                                      {user.isActive !== false ? 'Active' : 'Inactive'}
                                    </span>
                                  </td>
                                  <td className="actions-cell">
                                    <ActionButtons>
                                      <ActionButton
                                        type="view"
                                        onClick={() => openCrudModal(user, 'view')}
                                        title="View User"
                                      />
                                      <ActionButton
                                        type="edit"
                                        onClick={() => openCrudModal(user, 'edit')}
                                        title="Edit User"
                                      />
                                      <ActionButton
                                        type="delete"
                                        onClick={() => setDeleteModal({ show: true, userId: user._id, userName: user.username })}
                                        title="Delete User"
                                      />
                                    </ActionButtons>
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
          </PageContainer>
        </div>

        {/* CRUD Modal */}
        {crudModal.isOpen && (
          <div className="modal-overlay" onClick={closeCrudModal}>
            <div className="modal-content theater-edit-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-nav-left"></div>
                <div className="modal-title-section">
                  <h2>
                    {crudModal.mode === 'view' ? 'View User' : crudModal.mode === 'edit' ? 'Edit User' : 'Create User'}
                  </h2>
                </div>
                <div className="modal-nav-right">
                  <button className="close-btn" onClick={closeCrudModal}>
                    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '20px', height: '20px' }}>
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div className="modal-body">
                <div className="edit-form">
                  <form onSubmit={handleSubmit}>
                    {/* Username */}
                    <div className="form-group">
                      <label>Username *</label>
                      <input
                        type="text"
                        name="username"
                        className="form-control"
                        value={formData.username}
                        onChange={handleInputChange}
                        disabled={crudModal.mode === 'view'}
                        placeholder="Enter username"
                      />
                      {formErrors.username && <span className="error-message">{formErrors.username}</span>}
                    </div>

                    {/* Email */}
                    <div className="form-group">
                      <label>Email *</label>
                      <input
                        type="email"
                        name="email"
                        className="form-control"
                        value={formData.email}
                        onChange={handleInputChange}
                        disabled={crudModal.mode === 'view'}
                        placeholder="Enter email"
                      />
                      {formErrors.email && <span className="error-message">{formErrors.email}</span>}
                    </div>

                    {/* Full Name */}
                    <div className="form-group">
                      <label>Full Name *</label>
                      <input
                        type="text"
                        name="fullName"
                        className="form-control"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        disabled={crudModal.mode === 'view'}
                        placeholder="Enter full name"
                      />
                      {formErrors.fullName && <span className="error-message">{formErrors.fullName}</span>}
                    </div>

                    {/* Phone Number */}
                    <div className="form-group">
                      <label>Phone Number</label>
                      <input
                        type="tel"
                        name="phoneNumber"
                        className="form-control"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        disabled={crudModal.mode === 'view'}
                        placeholder="Enter phone number"
                      />
                    </div>

                    {/* Role */}
                    <div className="form-group">
                      <label>Role *</label>
                      <select
                        name="role"
                        className="form-control"
                        value={formData.role}
                        onChange={handleInputChange}
                        disabled={crudModal.mode === 'view'}
                      >
                        <option value="">Select Role</option>
                        {availableRoles.map(role => (
                          <option key={role._id} value={role._id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                      {formErrors.role && <span className="error-message">{formErrors.role}</span>}
                    </div>

                    {/* Password (Create/Edit) */}
                    {crudModal.mode !== 'view' && (
                      <>
                        <div className="form-group">
                          <label>Password {crudModal.mode === 'create' ? '*' : '(Leave blank to keep current)'}</label>
                          <div className="password-input-wrapper">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              name="password"
                              className="form-control"
                              value={formData.password}
                              onChange={handleInputChange}
                              placeholder={crudModal.mode === 'create' ? 'Enter password' : 'Enter new password'}
                            />
                            <button
                              type="button"
                              className="password-toggle"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                          </div>
                          {formErrors.password && <span className="error-message">{formErrors.password}</span>}
                        </div>

                        <div className="form-group">
                          <label>Confirm Password {crudModal.mode === 'create' ? '*' : ''}</label>
                          <div className="password-input-wrapper">
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              name="confirmPassword"
                              className="form-control"
                              value={formData.confirmPassword}
                              onChange={handleInputChange}
                              placeholder="Confirm password"
                            />
                            <button
                              type="button"
                              className="password-toggle"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                          </div>
                          {formErrors.confirmPassword && <span className="error-message">{formErrors.confirmPassword}</span>}
                        </div>
                      </>
                    )}

                    {formErrors.submit && (
                      <div className="form-error-message">{formErrors.submit}</div>
                    )}
                  </form>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-actions">
                {crudModal.mode === 'view' && (
                  <>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => setCrudModal(prev => ({ ...prev, mode: 'edit' }))}
                    >
                      EDIT
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setDeleteModal({ show: true, userId: crudModal.user._id, userName: crudModal.user.username });
                        closeCrudModal();
                      }}
                    >
                      DELETE
                    </button>
                  </>
                )}
                {crudModal.mode === 'edit' && (
                  <button type="button" className="btn-primary" onClick={handleUpdateUser}>
                    SAVE CHANGES
                  </button>
                )}
                {crudModal.mode === 'create' && (
                  <button type="button" className="btn-primary" onClick={handleCreateUser}>
                    CREATE USER
                  </button>
                )}
                <button type="button" className="cancel-btn" onClick={closeCrudModal}>
                  Close
                </button>
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
                <p>Are you sure you want to delete user <strong>{deleteModal.userName}</strong>?</p>
                <p className="warning-text">This action cannot be undone.</p>
              </div>
              <div className="modal-actions">
                <button
                  onClick={() => setDeleteModal({ show: false, userId: null, userName: '' })}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  className="confirm-delete-btn"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Modal */}
        {successModal.show && (
          <div className="modal-overlay" onClick={() => setSuccessModal({ show: false, message: '' })}>
            <div className="success-modal" onClick={(e) => e.stopPropagation()}>
              <div className="success-icon">✓</div>
              <h3>Success!</h3>
              <p>{successModal.message}</p>
              <button
                className="btn-primary"
                onClick={() => setSuccessModal({ show: false, message: '' })}
              >
                OK
              </button>
            </div>
          </div>
        )}
      </TheaterLayout>
    </ErrorBoundary>
  );
};

export default TheaterUserManagement;
