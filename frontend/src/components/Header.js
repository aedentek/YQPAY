import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import config from '../config';

// Header-specific icons
const IconMenu = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
  </svg>
);

const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
  </svg>
);

const IconNotification = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
  </svg>
);

const IconEmail = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
  </svg>
);

const IconSettings = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
  </svg>
);

const getIcon = (iconName) => {
  const icons = {
    hamburger: <IconMenu />,
    search: <IconSearch />,
    notification: <IconNotification />,
    email: <IconEmail />,
    settings: <IconSettings />
  };
  return icons[iconName] || null;
};

const Header = ({ sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed, pageTitle = 'Dashboard', userProfile = null }) => {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const { user: authUser, logout } = useAuth();
  
  const defaultUserProfile = {
    firstName: 'Admin',
    lastName: 'User', 
    email: `admin@${config.branding.companyName.toLowerCase()}.com`,
    phone: '+91 89404 16286',
    city: 'Bengaluru',
    country: 'India'
  };

  // Use authenticated user data if available, otherwise use provided userProfile or default
  const user = authUser || userProfile || defaultUserProfile;
  const userInitials = `${user.name?.charAt(0) || user.firstName?.charAt(0) || 'A'}${user.name?.charAt(1) || user.lastName?.charAt(0) || 'U'}`;

  const handleLogout = () => {
    logout();
    setShowProfileDropdown(false);
  };

  const toggleProfileDropdown = () => {
    setShowProfileDropdown(!showProfileDropdown);
  };

  return (
    <header className="dashboard-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          className="mobile-menu-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {getIcon('hamburger')}
        </button>
        
        <button 
          className={`desktop-menu-btn ${sidebarCollapsed ? 'collapsed' : ''}`}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {getIcon('hamburger')}
        </button>
        
        <h1 className="header-title">{pageTitle}</h1>
      </div>
      
      <div className="header-actions">
      
        
        <div className="header-icons">
          <button className="icon-btn">{getIcon('notification')}</button>
          <button className="icon-btn">{getIcon('email')}</button>
          <button className="icon-btn">{getIcon('settings')}</button>
          <div className="user-profile-container">
            <div 
              className="user-avatar clickable" 
              onClick={toggleProfileDropdown}
              title="Profile Menu"
            >
              {userInitials}
            </div>
            {showProfileDropdown && (
              <div className="profile-dropdown">
                <div className="profile-info">
                  <div className="profile-name">{user.name || `${user.firstName} ${user.lastName}`}</div>
                  <div className="profile-email">{user.email}</div>
                  {user.role && (
                    <div className="profile-role">
                      {typeof user.role === 'object' ? user.role.name : user.role.replace('_', ' ').toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="profile-divider"></div>
                <div className="profile-actions">
                  <button className="profile-action-btn" onClick={() => setShowProfileDropdown(false)}>
                    <span>👤</span>
                    Profile Settings
                  </button>
                  <button className="profile-action-btn" onClick={() => setShowProfileDropdown(false)}>
                    <span>⚙️</span>
                    Account Settings
                  </button>
                  <button className="profile-action-btn logout-btn" onClick={handleLogout}>
                    <span>🚪</span>
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;