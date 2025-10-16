import React, { useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import '../../styles/customer/CustomerOrderSuccess.css';

const CustomerOrderSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theaterId, qrName, seat } = useParams();
  const orderDetails = location.state?.orderDetails || {};

  useEffect(() => {
    // Confetti or celebration animation could be triggered here
  }, []);

  const handleBackToMenu = () => {
    navigate(`/customer/${theaterId}/${qrName}/${seat}/home`);
  };

  const handleViewOrders = () => {
    navigate(`/customer/history?theaterid=${theaterId}&qrname=${qrName}&seat=${seat}`);
  };

  return (
    <div className="customer-order-success">
      {/* Success Animation Section */}
      <div className="success-content">
        {/* Success Icon */}
        <div className="success-icon-container">
          <div className="success-checkmark">
            <svg viewBox="0 0 52 52" className="checkmark">
              <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
              <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
            </svg>
          </div>
        </div>

        {/* Success Message */}
        <div className="success-message">
          <h1 className="success-title">CONGRATULATIONS!</h1>
          <p className="success-subtitle">Your order has been placed successfully</p>
        </div>

        {/* Order Details */}
        {orderDetails.total && (
          <div className="order-details">
            <div className="detail-item">
              <span className="detail-label">Order Total</span>
              <span className="detail-value">₹ {orderDetails.total.toFixed(2)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Payment Method</span>
              <span className="detail-value">{orderDetails.paymentMethod?.toUpperCase()}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Seat</span>
              <span className="detail-value">{seat}</span>
            </div>
            {orderDetails.phoneNumber && (
              <div className="detail-item">
                <span className="detail-label">Phone</span>
                <span className="detail-value">{orderDetails.phoneNumber}</span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="success-actions">
          <button className="primary-button" onClick={handleBackToMenu}>
            <span className="button-arrows">»</span>
            BACK TO MENU
            <span className="button-arrows">«</span>
          </button>
          
          <button className="secondary-button" onClick={handleViewOrders}>
            VIEW ORDER HISTORY
          </button>
        </div>

        {/* Footer Message */}
        <div className="success-footer">
          <p>Your order will be delivered to your seat shortly</p>
          <p className="footer-note">Thank you for ordering with us! 🎬</p>
        </div>
      </div>
    </div>
  );
};

export default CustomerOrderSuccess;
