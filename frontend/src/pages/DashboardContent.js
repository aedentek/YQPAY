import React, { useState } from 'react';
import config from '../config';

// Dashboard-specific icons (icons that are used in the dashboard content)
const IconSales = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
  </svg>
);

const IconCustomers = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.54 7H17c-.8 0-1.54.37-2.01.99l-2.49 3.2A1 1 0 0 0 12.5 12h2.9l2.6 8zM12.5 11.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5S11 9.17 11 10s.67 1.5 1.5 1.5zM5.5 6c1.11 0 2-.89 2-2s-.89-2-2-2-2 .89-2 2 .89 2 2 2zm2 16v-7H9V9.5c0-.8-.67-1.5-1.5-1.5S6 8.7 6 9.5V15H4v7h3.5z"/>
  </svg>
);

const IconOrders = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 4V2C7 1.45 7.45 1 8 1h8c.55 0 1 .45 1 1v2h5c.55 0 1 .45 1 1s-.45 1-1 1h-1v14c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V6H2c-.55 0-1-.45-1-1s.45-1 1-1h5zm2-1v1h6V3H9zm-4 3v13h14V6H5z"/>
  </svg>
);

const IconTheaters = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);

const getIcon = (iconName) => {
  const icons = {
    sales: <IconSales />,
    customers: <IconCustomers />,
    orders: <IconOrders />,
    theaters: <IconTheaters />
  };
  return icons[iconName] || null;
};

const DashboardContent = () => {
  const [userProfile] = useState({
    firstName: 'Naveen',
    lastName: 'Prasath', 
    email: 'admin@yqpaynow.com',
    phone: '+91 89404 16286',
    city: 'Bengaluru',
    country: 'India'
  });

  return (
    <div className="content-header">
      <div>
        {/* <h2 className="page-title">Dashboard Overview</h2>
        <p className="page-subtitle">Welcome back, {userProfile.firstName}! Here's what's happening at your theater canteen today.</p> */}
      </div>

      <div className="dashboard-container">
        {/* Top Stats Row */}
        <div className="top-stats-grid">
          <div className="stat-card primary">
            <div className="stat-header">
              <span className="stat-label">Today's Money</span>
              <div className="stat-icon">{getIcon('sales')}</div>
            </div>
            <div className="stat-value">₹53,000</div>
            <div className="stat-change positive">+55%</div>
          </div>
          
          <div className="stat-card secondary">
            <div className="stat-header">
              <span className="stat-label">Today's Users</span>
              <div className="stat-icon">{getIcon('customers')}</div>
            </div>
            <div className="stat-value">2,300</div>
            <div className="stat-change positive">+3%</div>
          </div>
          
          <div className="stat-card accent">
            <div className="stat-header">
              <span className="stat-label">New Clients</span>
              <div className="stat-icon">{getIcon('orders')}</div>
            </div>
            <div className="stat-value">3,052</div>
            <div className="stat-change negative">-14%</div>
          </div>
          
          <div className="stat-card success">
            <div className="stat-header">
              <span className="stat-label">Total Sales</span>
              <div className="stat-icon">{getIcon('theaters')}</div>
            </div>
            <div className="stat-value">₹173,000</div>
            <div className="stat-change positive">+8%</div>
          </div>
        </div>

        {/* Dashboard Main Grid */}
        <div className="dashboard-main-grid">
          {/* Welcome Card */}
          <div className="welcome-card">
            <div className="welcome-content">
              <div className="welcome-text">
                <h3>Welcome back,</h3>
                <h2>{userProfile.firstName} Johnson</h2>
                <p>Glad to see you again!</p>
                <p>Ask me anything.</p>
                <button className="tap-record-btn">Tap to record →</button>
              </div>
              <div className="welcome-visual">
                <div className="brain-animation"></div>
              </div>
            </div>
          </div>

          {/* Satisfaction Rate */}
          <div className="metric-card">
            <h4>Satisfaction Rate</h4>
            <p className="metric-subtitle">From all projects</p>
            <div className="circular-progress">
              <div className="progress-circle">
                <span className="progress-percentage">95%</span>
              </div>
            </div>
            <p className="metric-detail">Based on likes</p>
          </div>

          {/* Referral Tracking */}
          <div className="metric-card">
            <h4>Referral Tracking</h4>
            <div className="referral-stats">
              <div className="referral-item">
                <span className="referral-label">Invited</span>
                <span className="referral-value">145 people</span>
              </div>
              <div className="referral-item">
                <span className="referral-label">Bonus</span>
                <span className="referral-value">1,465</span>
              </div>
            </div>
            <div className="safety-score">
              <div className="score-circle">
                <span className="score-value">9.3</span>
                <span className="score-label">Safety</span>
                <span className="score-sublabel">Total Score</span>
              </div>
            </div>
          </div>

          {/* Sales Overview */}
          <div className="chart-card large">
            <div className="chart-header">
              <h4>Sales overview</h4>
              <span className="chart-period">(+5) more in 2021</span>
            </div>
            <div className="chart-area">
              <div className="chart-placeholder">
                <svg viewBox="0 0 600 200" className="sales-chart">
                  <path d="M50 150 Q150 100 250 120 T450 80 T550 50" stroke="url(#gradient)" strokeWidth="3" fill="none"/>
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#8B5CF6"/>
                      <stop offset="100%" stopColor="#06B6D4"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>

          {/* Active Users */}
          <div className="chart-card">
            <div className="chart-header">
              <h4>Active Users</h4>
              <span className="chart-change">(+23) than last week</span>
            </div>
            <div className="bar-chart">
              <div className="bars">
                <div className="bar" style={{height: '60%'}}></div>
                <div className="bar" style={{height: '80%'}}></div>
                <div className="bar" style={{height: '45%'}}></div>
                <div className="bar" style={{height: '90%'}}></div>
                <div className="bar" style={{height: '70%'}}></div>
                <div className="bar" style={{height: '95%'}}></div>
                <div className="bar" style={{height: '55%'}}></div>
                <div className="bar" style={{height: '75%'}}></div>
              </div>
            </div>
            <div className="user-stats">
              <div className="user-stat">
                <div className="stat-icon-small">{getIcon('customers')}</div>
                <div>
                  <div className="stat-number">32,984</div>
                  <div className="stat-label-small">Users</div>
                </div>
              </div>
              <div className="user-stat">
                <div className="stat-icon-small">{getIcon('orders')}</div>
                <div>
                  <div className="stat-number">2.42m</div>
                  <div className="stat-label-small">Clicks</div>
                </div>
              </div>
              <div className="user-stat">
                <div className="stat-icon-small">{getIcon('sales')}</div>
                <div>
                  <div className="stat-number">2,400$</div>
                  <div className="stat-label-small">Sales</div>
                </div>
              </div>
              <div className="user-stat">
                <div className="stat-icon-small">{getIcon('theaters')}</div>
                <div>
                  <div className="stat-number">320</div>
                  <div className="stat-label-small">Items</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;
