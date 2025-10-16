import React from 'react';
import ReactDOM from 'react-dom';

/**
 * Custom Alert Dialog - Exact Mirror of Delete Confirmation Modal
 * Uses same structure as TheaterList delete modal with violet header
 */
const AlertDialog = ({
  isOpen,
  onClose,
  title = 'Alert',
  message = 'This is an alert message.',
  buttonText = 'OK',
  type = 'info', // 'info', 'success', 'warning', 'error'
  icon = null,
  autoClose = false,
  autoCloseDelay = 3000
}) => {
  // Auto close functionality
  React.useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose]);

  // Handle escape key
  React.useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleClose = () => {
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getIconForType = () => {
    if (icon) return icon;

    switch (type) {
      case 'success':
        return (
          <div className="alert-icon success">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20,6 9,17 4,12"></polyline>
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className="alert-icon warning">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="alert-icon error">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
        );
      default: // info
        return (
          <div className="alert-icon info">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </div>
        );
    }
  };

  const getButtonClass = () => {
    switch (type) {
      case 'success': return 'btn-success';
      case 'warning': return 'btn-warning';
      case 'error': return 'btn-danger';
      default: return 'btn-primary';
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="alert-modal">
        <div className="modal-header">
          <h3>{title}</h3>
        </div>
        <div className="modal-body">
          <div className="alert-content">
            {getIconForType()}
            <p>{typeof message === 'string' ? message : message}</p>
          </div>
        </div>
        <div className="modal-actions">
          <button 
            className={`${getButtonClass()}`}
            onClick={handleClose}
            autoFocus
          >
            {buttonText}
          </button>
        </div>

        {autoClose && (
          <div className="auto-close-indicator">
            <div className="auto-close-progress" style={{ animationDuration: `${autoCloseDelay}ms` }}></div>
          </div>
        )}
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(124, 58, 237, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
          padding: 20px;
        }

        .alert-modal {
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          max-width: 400px;
          width: 90%;
          overflow: hidden;
          position: relative;
        }

        .modal-header {
          padding: 24px;
          background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
          color: var(--white);
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
        }

        .modal-body {
          padding: 24px;
        }

        .alert-content {
          text-align: center;
        }

        .alert-icon {
          margin: 0 auto 16px;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .alert-icon.success {
          background: #f0fdf4;
          color: #10b981;
        }

        .alert-icon.error {
          background: #fef2f2;
          color: #ef4444;
        }

        .alert-icon.warning {
          background: #fffbeb;
          color: #f59e0b;
        }

        .alert-icon.info {
          background: var(--primary-ultra-light);
          color: var(--primary-color);
        }

        .modal-body p {
          margin: 0;
          color: #475569;
          line-height: 1.5;
          font-size: 16px;
        }

        .modal-actions {
          padding: 20px 24px;
          background: #f8fafc;
          display: flex;
          gap: 12px;
          border-top: 1px solid #e2e8f0;
          justify-content: center;
        }

        .btn-primary, .btn-danger, .btn-warning, .btn-success {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 100px;
        }

        .btn-primary {
          background: var(--primary-color);
          color: var(--white);
        }

        .btn-primary:hover {
          background: var(--primary-dark);
        }

        .btn-danger {
          background: #ef4444;
          color: white;
        }

        .btn-danger:hover {
          background: #dc2626;
        }

        .btn-warning {
          background: #f59e0b;
          color: white;
        }

        .btn-warning:hover {
          background: #d97706;
        }

        .btn-success {
          background: #10b981;
          color: white;
        }

        .btn-success:hover {
          background: #059669;
        }

        /* Auto-close indicator */
        .auto-close-indicator {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .auto-close-progress {
          height: 100%;
          background: var(--primary-color);
          animation: progress-animation linear forwards;
          width: 0;
        }

        @keyframes progress-animation {
          from { width: 0; }
          to { width: 100%; }
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .alert-modal {
            max-width: 90%;
          }
          
          .modal-header {
            padding: 20px;
          }
          
          .modal-body {
            padding: 20px;
          }
          
          .modal-actions {
            padding: 16px 20px;
          }
        }
      `}</style>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default AlertDialog;