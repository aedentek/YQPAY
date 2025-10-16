import React from 'react';
import AdminLayout from '../components/AdminLayout';
import config from '../config';

const Dashboard = () => {
  return (
    <AdminLayout pageTitle="Dashboard" currentPage="dashboard">
      <div className="content-header">
        <div>
          <h2 className="page-title">Dashboard Overview</h2>
          <p className="page-subtitle">Welcome to your {config.app.name} dashboard</p>
        </div>
      </div>
      
      <div className="dashboard-container">
        <div className="welcome-card">
          <div className="welcome-content">
            <div className="welcome-text">
              <h3>Dashboard</h3>
              <h2>Welcome Back!</h2>
              <p>Monitor your {config.app.name} operations.</p>
              <p>All systems are running smoothly.</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
