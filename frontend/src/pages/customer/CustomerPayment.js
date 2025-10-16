import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import '../../styles/customer/CustomerPayment.css';

const CustomerPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theaterId, qrName, seat } = useParams();
  const { cart, clearCart } = useCart();
  const phoneNumber = location.state?.phoneNumber || '';
  
  const [selectedPayment, setSelectedPayment] = useState('');
  const [loading, setLoading] = useState(false);

  // Calculate totals
  const subtotal = cart.items?.reduce((sum, item) => {
    const price = parseFloat(item.price) || 0;
    return sum + (price * item.quantity);
  }, 0) || 0;
  
  const tax = subtotal * 0.05; // 5% tax
  const total = subtotal + tax;

  const paymentMethods = [
    { id: 'upi', name: 'UPI', icon: '📱' },
    { id: 'card', name: 'Credit/Debit Card', icon: '💳' },
    { id: 'wallet', name: 'Wallet', icon: '👛' },
    { id: 'cod', name: 'Cash on Delivery', icon: '💵' }
  ];

  const handlePayment = async () => {
    if (!selectedPayment) {
      alert('Please select a payment method');
      return;
    }

    setLoading(true);

    // Simulate payment processing
    setTimeout(() => {
      setLoading(false);
      // Navigate to success page
      navigate(`/customer/${theaterId}/${qrName}/${seat}/order-success`, {
        state: {
          orderDetails: {
            items: cart.items,
            subtotal,
            tax,
            total,
            paymentMethod: selectedPayment,
            phoneNumber
          }
        }
      });
      // Clear cart after successful payment
      clearCart();
    }, 2000);
  };

  return (
    <div className="customer-payment">
      {/* Header */}
      <div className="payment-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>

      {/* Welcome Section */}
      <div className="welcome-section">
        <h1 className="page-title">PAYMENT</h1>
        <p className="page-subtitle">Choose your payment method</p>
      </div>

      {/* Payment Methods */}
      <div className="payment-content">
        <div className="payment-methods">
          {paymentMethods.map((method) => (
            <button
              key={method.id}
              className={`payment-method ${selectedPayment === method.id ? 'selected' : ''}`}
              onClick={() => setSelectedPayment(method.id)}
            >
              <span className="payment-icon">{method.icon}</span>
              <span className="payment-name">{method.name}</span>
              <span className="payment-radio">
                {selectedPayment === method.id ? '●' : '○'}
              </span>
            </button>
          ))}
        </div>

        {/* Order Summary */}
        <div className="order-summary">
          <h3 className="summary-title">Order Summary</h3>
          <div className="summary-item">
            <span>Subtotal</span>
            <span>₹ {subtotal.toFixed(2)}</span>
          </div>
          <div className="summary-item">
            <span>Tax (5%)</span>
            <span>₹ {tax.toFixed(2)}</span>
          </div>
          <div className="summary-item total">
            <span>Total</span>
            <span>₹ {total.toFixed(2)}</span>
          </div>
        </div>

        {/* Pay Button */}
        <button
          className="pay-btn primary-button"
          onClick={handlePayment}
          disabled={!selectedPayment || loading}
        >
          {loading ? (
            <span>Processing...</span>
          ) : (
            <>
              <span className="button-arrows">»</span>
              PAY ₹ {total.toFixed(2)}
              <span className="button-arrows">«</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default CustomerPayment;
