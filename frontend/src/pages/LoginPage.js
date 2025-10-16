import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import config from '../config';
import '../styles/AddTheater.css'; // Import for submit-btn styling

const LoginPage = () => {
  const [formData, setFormData] = useState({
    username: '', // Changed from email to support both email and username
    password: '',
    rememberMe: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false); // Add password visibility state
  const navigate = useNavigate();
  const { login, isAuthenticated, userType, theaterId, isLoading: authLoading } = useAuth();

  // ✅ REDIRECT LOGIC: Check if user is already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      console.log('🔄 User already authenticated, redirecting...');
      
      // Redirect based on user type
      if (userType === 'theater_user' || userType === 'theater_admin') {
        if (theaterId) {
          navigate(`/theater-dashboard/${theaterId}`, { replace: true });
        } else {
          // Fallback if theaterId is missing
          navigate('/dashboard', { replace: true });
        }
      } else {
        // Super admin users go to admin dashboard
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, userType, theaterId, authLoading, navigate]);

  // Show loading while checking authentication status
  if (authLoading) {
    return (
      <div className="page-loader">
        <div className="loader-container">
          <div className="loader-spinner"></div>
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    // Validation
    const newErrors = {};
    if (!formData.username) newErrors.username = 'Username/Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }

    try {
      // Real API call to backend authentication
      console.log('🔍 Attempting login to:', `${config.api.baseUrl}/auth/login`);
      console.log('📤 Request body:', {
        ...(formData.username.includes('@') 
          ? { email: formData.username }
          : { username: formData.username }
        ),
        password: '***hidden***'
      });
      
      const response = await fetch(`${config.api.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // ✅ FIX: Send both email and username fields
          // Backend checks: email (for admins) || username (for theater users)
          ...(formData.username.includes('@') 
            ? { email: formData.username }
            : { username: formData.username }
          ),
          password: formData.password
        }),
      });

      console.log('📥 Response status:', response.status);
      const data = await response.json();
      console.log('📥 Response data:', data);

      if (response.ok && data.success) {

        const userData = data.user;
        const userType = data.user.userType; // Fix: get userType from data.user.userType
        const theaterId = data.user.theaterId || data.theaterId;
        const rolePermissions = data.rolePermissions; // Role-based permissions for theater users
        
        // Use AuthContext login method with theater data and permissions
        login(userData, data.token, userType, theaterId, rolePermissions);
        
        // Role-based redirect
        if (userType === 'theater_user') {
          // Theater users go to theater dashboard with theater ID
          const userTheaterId = userData.theater?._id || theaterId;
          navigate(`/theater-dashboard/${userTheaterId}`);
        } else if (userType === 'theater-admin') {
          // Theater admins go to theater dashboard with their assigned theater ID  
          navigate(`/theater-dashboard/${theaterId}`);
        } else {
          // Super admin users go to admin dashboard
          navigate('/dashboard');
        }
      } else {
        // Handle login failure - show error message
        setErrors({ 
          general: data.message || 'Invalid email or password. Please try again.' 
        });
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      setErrors({ 
        general: 'Unable to connect to server. Please check your connection and try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Theater Curtain Background */}
      <div className="theater-background">
        <div className="curtain-left"></div>
        <div className="curtain-right"></div>
        <div className="theater-lights"></div>
      </div>

      {/* Theater Masks - Decorative Elements */}
      <div className="theater-masks">
        <div className="mask comedy-mask">
          <div className="mask-face">
            <div className="eye left-eye"></div>
            <div className="eye right-eye"></div>
            <div className="mouth comedy-mouth"></div>
          </div>
        </div>
        <div className="mask tragedy-mask">
          <div className="mask-face">
            <div className="eye left-eye"></div>
            <div className="eye right-eye"></div>
            <div className="mouth tragedy-mouth"></div>
          </div>
        </div>
      </div>

      {/* Main Login Content */}
      <div className="login-container">
        <div className="login-card">
          {/* Header */}
          <div className="login-header">
            <div className="brand-logo">
              <h1 className="brand-name">YQPayNow</h1>
            </div>
                  </div>

          {/* Error Message */}
          {errors.general && (
            <div className="error-banner">
              <span className="error-icon">!</span>
              {errors.general}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username" className="form-label">Username / Email</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className={`form-input ${errors.username ? 'error' : ''}`}
                  placeholder="Enter username or email"
                />
                <span className="input-icon">👤</span>
              </div>
              {errors.username && <span className="error-text">{errors.username}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <div className="input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  placeholder="Enter your password"
                />
                <span 
                  className="input-icon password-toggle" 
                  onClick={togglePasswordVisibility}
                  title={showPassword ? "Hide password" : "Show password"}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" stroke="currentColor" strokeWidth="2"/>
                      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
              </div>
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>

            <div className="form-options">
              <label className="checkbox-wrapper">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                />
                <span className="checkbox-custom"></span>
                <span className="checkbox-label">Remember me</span>
              </label>
            </div>

            <button 
              type="submit" 
              className={`submit-btn ${isLoading ? 'loading' : ''}`}
            >
              {isLoading ? (
                <>
                  <span className="loading-spinner"></span>
                  Signing In...
                </>
              ) : (
                'Sign In to Dashboard'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="login-footer">
          </div>
        </div>
      </div>


    </div>
  );
};

export default LoginPage;
