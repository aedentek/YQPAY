import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../config';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [theaterId, setTheaterId] = useState(null); // Add theater ID for data isolation
  const [rolePermissions, setRolePermissions] = useState([]); // Add role-based permissions
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Check if user is logged in on app start - OPTIMIZED TO PREVENT AUTO-LOGOUT
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('authToken');
      const userData = localStorage.getItem('user');
      const storedUserType = localStorage.getItem('userType');
      const storedTheaterId = localStorage.getItem('theaterId');
      const storedRolePermissions = localStorage.getItem('rolePermissions');
      
      if (token && userData) {
        try {
          // ✅ ALWAYS RESTORE SESSION FROM LOCALSTORAGE FIRST (no validation needed)
          // This prevents automatic logout on page refresh
          const parsedUser = JSON.parse(userData);
          const parsedRolePermissions = storedRolePermissions ? JSON.parse(storedRolePermissions) : [];
          
          console.log('� AUTH: Restoring session from localStorage');
          console.log('👤 User:', parsedUser.username || parsedUser.name);
          console.log('🎭 Role:', storedUserType);
          console.log('🏢 Theater ID:', storedTheaterId);
          
          setUser(parsedUser);
          setUserType(storedUserType || 'admin');
          setTheaterId(storedTheaterId);
          setRolePermissions(parsedRolePermissions);
          setIsAuthenticated(true);
          
          console.log('✅ AUTH: Session restored successfully');
          
          // Optional: Validate token in background (don't block UI or logout on failure)
          // This is fire-and-forget - if it fails, user stays logged in
          validateTokenInBackground(token);
          
        } catch (parseError) {
          console.error('❌ AUTH: Failed to parse session data:', parseError);
          // Only clear if data is corrupted
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          localStorage.removeItem('userType');
          localStorage.removeItem('theaterId');
          localStorage.removeItem('rolePermissions');
          setIsAuthenticated(false);
        }
      } else {
        console.log('ℹ️ AUTH: No saved session found');
        setIsAuthenticated(false);
      }
      
      setIsLoading(false);
    };

    // Background token validation (optional, doesn't affect login state)
    const validateTokenInBackground = async (token) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(`${config.api.baseUrl}/auth/validate`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.warn('⚠️ AUTH: Token validation failed in background (user remains logged in)');
          // Don't logout - just log the warning
          // User will be logged out when they try to make an API call
        } else {
          console.log('✅ AUTH: Token validated successfully in background');
        }
      } catch (error) {
        console.warn('⚠️ AUTH: Background token validation error:', error.message);
        // Don't logout on network errors - user stays authenticated
      }
    };

    restoreSession();
  }, []);

  const login = (userData, token, type = 'super_admin', userTheaterId = null, userRolePermissions = []) => {
    // Store authentication data in localStorage
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('userType', type);
    
    // Store theater ID for data isolation (for theater users/admins)
    if (userTheaterId) {
      localStorage.setItem('theaterId', userTheaterId);
      setTheaterId(userTheaterId);
    }
    
    // Store role permissions for theater users
    if (userRolePermissions && userRolePermissions.length > 0) {
      localStorage.setItem('rolePermissions', JSON.stringify(userRolePermissions));
      setRolePermissions(userRolePermissions);
    }
    
    setUser(userData);
    setUserType(type);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userType');
    localStorage.removeItem('theaterId'); // Clear theater ID on logout
    localStorage.removeItem('rolePermissions'); // Clear role permissions on logout
    
    // ✅ TRIGGER LOGOUT EVENT: Notify other tabs about logout
    localStorage.setItem('logout-event', Date.now().toString());
    
    setUser(null);
    setUserType(null);
    setTheaterId(null);
    setRolePermissions([]);
    setIsAuthenticated(false);
    navigate('/login');
  };

  // ✅ LISTEN FOR LOGOUT EVENTS: Handle logout from other tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'logout-event') {
        // Another tab triggered logout, sync this tab
        setUser(null);
        setUserType(null);
        setTheaterId(null);
        setRolePermissions([]);
        setIsAuthenticated(false);
        navigate('/login');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [navigate]);

  const value = {
    user,
    userType,
    theaterId,
    rolePermissions,
    isAuthenticated,
    isLoading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;