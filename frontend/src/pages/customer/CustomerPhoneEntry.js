import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../../styles/customer/CustomerPhoneEntry.css';

const CustomerPhoneEntry = () => {
  const navigate = useNavigate();
  const { theaterId, qrName, seat } = useParams();
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleContinue = () => {
    if (phoneNumber.length === 10) {
      // Navigate to OTP verification page
      navigate(`/customer/${theaterId}/${qrName}/${seat}/otp-verification`, {
        state: { phoneNumber: `+91${phoneNumber}` }
      });
    }
  };

  const handleSkip = () => {
    // Navigate back to cart or proceed without phone verification
    navigate(`/customer/${theaterId}/${qrName}/${seat}/cart`);
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Only digits
    if (value.length <= 10) {
      setPhoneNumber(value);
    }
  };

  return (
    <div className="customer-phone-entry">

      {/* Welcome Section - Similar to Landing Page */}
      <div className="welcome-section">
        <h1 className="page-title">PHONE VERIFICATION</h1>
        <p className="page-subtitle">Enter your phone number to continue</p>
      </div>

      {/* Phone Form Section */}
      <div className="phone-form-section">
        <div className="phone-input-container">
          <span className="country-code">+91</span>
          <input
            type="tel"
            className="phone-input"
            placeholder="Enter Phone Number"
            value={phoneNumber}
            onChange={handlePhoneChange}
            maxLength="10"
          />
        </div>

        <button
          className="continue-btn primary-button"
          onClick={handleContinue}
          disabled={phoneNumber.length !== 10}
        >
          <span className="button-arrows">»</span>
          CONTINUE
          <span className="button-arrows">«</span>
        </button>
      </div>

      {/* Terms Section */}
      <div className="terms-section">
        <p>By continuing, you agree to our</p>
        <p>
          <a href="#" className="terms-link">Terms of Use</a> &amp; <a href="#" className="terms-link">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
};

export default CustomerPhoneEntry;
