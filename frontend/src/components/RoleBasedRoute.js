import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Role-based route protection component
const RoleBasedRoute = ({ children, allowedRoles, requiredPermissions = [] }) => {
  const { isAuthenticated, isLoading, user, userType, rolePermissions, theaterId } = useAuth();
  const location = useLocation();

  console.log('🛡️ ROLE DEBUG: RoleBasedRoute called for path:', location.pathname);
  console.log('🛡️ ROLE DEBUG: Auth state - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);
  console.log('🛡️ ROLE DEBUG: User info - userType:', userType, 'theaterId:', theaterId);
  console.log('🛡️ ROLE DEBUG: Allowed roles:', allowedRoles);

  // Show loading spinner while checking authentication
  if (isLoading) {
    console.log('🛡️ ROLE DEBUG: Still loading, showing spinner');
    return (
      <div className="page-loader">
        <div className="loader-container">
          <div className="loader-spinner"></div>
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    console.log('🛡️ ROLE DEBUG: Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has required role
  if (allowedRoles && allowedRoles.length > 0) {
    const hasValidRole = allowedRoles.includes(userType);
    console.log('🛡️ ROLE DEBUG: Role check - hasValidRole:', hasValidRole, 'for userType:', userType);
    
    if (!hasValidRole) {
      console.log('🛡️ ROLE DEBUG: Invalid role, redirecting based on userType:', userType);
      // Redirect theater users to their theater dashboard if they try to access unauthorized pages
      if (userType === 'theater_user' && theaterId) {
        console.log('🛡️ ROLE DEBUG: Redirecting theater_user to theater dashboard');
        return <Navigate to={`/theater-dashboard/${theaterId}`} replace />;
      }
      // Redirect theater admin to their theater dashboard
      if (userType === 'theater_admin' && theaterId) {
        console.log('🛡️ ROLE DEBUG: Redirecting theater_admin to theater dashboard');
        return <Navigate to={`/theater-dashboard/${theaterId}`} replace />;
      }
      // Redirect super admin to admin dashboard for unauthorized access
      console.log('🛡️ ROLE DEBUG: Redirecting to admin dashboard');
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Check for specific permissions if required (for theater users with role-based permissions)
  if (requiredPermissions.length > 0) {
    let hasRequiredPermissions = false;
    
    // For super admin, grant all permissions
    if (userType === 'super_admin') {
      hasRequiredPermissions = true;
    }
    // For theater users, check role-based permissions from rolePermissions array
    else if (userType === 'theater_user' && rolePermissions) {
      hasRequiredPermissions = requiredPermissions.every(permission => 
        rolePermissions.some(rp => rp.page === permission && rp.hasAccess === true)
      );
    }
    // For theater admins, use user.permissions (legacy)
    else if (user?.permissions) {
      hasRequiredPermissions = requiredPermissions.every(permission => 
        user.permissions.includes(permission)
      );
    }
    
    if (!hasRequiredPermissions) {
      // Redirect to appropriate dashboard based on user type
      if (userType === 'theater_user' && theaterId) {
        return <Navigate to={`/theater-dashboard/${theaterId}`} replace />;
      }
      if (userType === 'theater_admin' && theaterId) {
        return <Navigate to={`/theater-dashboard/${theaterId}`} replace />;
      }
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Render the protected component
  console.log('🛡️ ROLE DEBUG: All checks passed, rendering protected component');
  return children;
};

export default RoleBasedRoute;