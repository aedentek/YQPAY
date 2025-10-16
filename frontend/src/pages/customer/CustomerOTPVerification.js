import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import '../../styles/customer/CustomerOTPVerification.css';

const CustomerOTPVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theaterId, qrName, seat } = useParams();
  const phoneNumber = location.state?.phoneNumber || '+91 XXXXXXXXXX';
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const inputRefs = useRef([]);

  // Timer countdown
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      value = value.slice(-1);
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all 6 digits are entered
    if (newOtp.every(digit => digit !== '') && index === 5) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = (otpCode) => {
    // Simulate OTP verification
    console.log('Verifying OTP:', otpCode);
    
    // Navigate to payment page after successful OTP verification
    setTimeout(() => {
      navigate(`/customer/${theaterId}/${qrName}/${seat}/payment`, {
        state: { phoneNumber }
      });
    }, 500);
  };

  const handleResendOTP = () => {
    setTimer(30);
    setOtp(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
    // TODO: Call API to resend OTP
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="customer-otp-verification">
      {/* Header with Back Button */}
      <div className="otp-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>

      {/* Welcome Section - Similar to Landing Page */}
      <div className="welcome-section">
        <h1 className="page-title">OTP VERIFICATION</h1>
        <p className="page-subtitle">OTP has been sent to {phoneNumber}</p>
      </div>

      {/* OTP Input Section */}
      <div className="otp-form-section">
        <div className="otp-inputs">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="tel"
              maxLength="1"
              className={`otp-digit ${digit ? 'filled' : ''}`}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              autoFocus={index === 0}
            />
          ))}
        </div>

        <div className="timer">
          {formatTime(timer)}
        </div>

        <div className="resend-section">
          <span>Didn't get it?</span>
          {timer === 0 ? (
            <button className="resend-btn" onClick={handleResendOTP}>
              Resend OTP
            </button>
          ) : (
            <span className="resend-btn disabled">Send OTP (SMS)</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerOTPVerification;
