import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CustomerLayout from '../../components/customer/CustomerLayout';
import '../../styles/customer/CustomerHistory.css';

const CustomerOrderHistory = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [theaterId, setTheaterId] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const id = urlParams.get('theaterid');
    setTheaterId(id);
  }, [location.search]);

  const handleGoBack = () => {
    navigate(`/customer?theaterid=${theaterId}`);
  };

  return (
    <CustomerLayout>
      <div className="customer-history">
        <div className="coming-soon-section fade-in">
          <div className="coming-soon-icon">📋</div>
          <h2>Order History</h2>
          <p>Coming Soon!</p>
          <p className="description">
            Your order history and tracking will be available here. 
            View past orders, reorder favorites, and track current orders.
          </p>
          <button className="back-button" onClick={handleGoBack}>
            ← Back to Welcome
          </button>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default CustomerOrderHistory;