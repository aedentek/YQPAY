import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import TheaterLayout from '../../components/theater/TheaterLayout';
import PageContainer from '../../components/PageContainer';
import { FilterControls, FilterGroup, Button } from '../../components/GlobalDesignSystem';
import ErrorBoundary from '../../components/ErrorBoundary';
import config from '../../config';

function TheaterDashboard() {
  const { theaterId } = useParams();
  const navigate = useNavigate();
  const { user, theaterId: userTheaterId, userType } = useAuth();
  
  const [stats, setStats] = useState({
    totalOrders: 0,
    todayRevenue: 0,
    activeProducts: 0,
    totalCustomers: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [theaterInfo, setTheaterInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    
    // TEMPORARY: For existing sessions without theater ID, try to get it from user data
    let effectiveTheaterId = theaterId || userTheaterId;
    
    // If still no theater ID, try to extract from user data
    if (!effectiveTheaterId && user) {
      if (user.assignedTheater) {
        effectiveTheaterId = user.assignedTheater._id || user.assignedTheater;
      } else if (user.theater) {
        effectiveTheaterId = user.theater._id || user.theater;
      }
    }
    
    
    // Security check: Ensure user can only access their assigned theater
    if (userType === 'theater-admin' && userTheaterId && theaterId !== userTheaterId) {
      // Redirect to their own theater dashboard if trying to access another theater
      navigate(`/theater/dashboard/${userTheaterId}`);
      return;
    }

    // If no theaterId in URL but we found one, redirect to proper URL
    if (!theaterId && effectiveTheaterId) {
      navigate(`/theater/dashboard/${effectiveTheaterId}`);
      return;
    }

    // If theaterId exists, fetch that theater's data
    if (effectiveTheaterId) {
      fetchDashboardData(effectiveTheaterId);
    } else {
      setError('Theater ID not found. Please login again.');
      setLoading(false);
    }
  }, [theaterId, userTheaterId, userType, navigate, user]);

  const fetchDashboardData = async (theaterIdToFetch) => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('authToken');
      
      // Fetch theater-specific dashboard data
      const response = await fetch(`${config.api.baseUrl}/theater-dashboard/${theaterIdToFetch}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
        setRecentOrders(data.recentOrders);
        setTheaterInfo(data.theater);
      } else {
        setError(data.message || 'Failed to load dashboard data');
      }
    } catch (error) {
      setError('Unable to load dashboard data. Please try again.');
      // Fallback to mock data for development
      setStats({
        totalOrders: 156,
        todayRevenue: 12450,
        activeProducts: 25,
        totalCustomers: 89
      });
      setRecentOrders([
        { id: 1, customerName: 'John Doe', amount: 150, status: 'completed' },
        { id: 2, customerName: 'Jane Smith', amount: 89, status: 'pending' }
      ]);
      setTheaterInfo({
        name: 'Demo Theater',
        id: theaterIdToFetch
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ErrorBoundary>
      <TheaterLayout pageTitle="Theater Dashboard" currentPage="dashboard">
        <PageContainer
          title={theaterInfo.name ? `${theaterInfo.name} Dashboard` : "Theater Dashboard"}
          subtitle={`Overview of your theater operations${theaterId ? ` (ID: ${theaterId})` : ''}`}
        >
          {error && (
            <div style={{ 
              backgroundColor: '#fee', 
              color: '#c33', 
              padding: '15px', 
              borderRadius: '5px', 
              marginBottom: '20px' 
            }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <div>Loading theater dashboard...</div>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '20px', 
            marginBottom: '30px' 
          }}>
            <div className="stats-card">
              <div className="stats-icon">📊</div>
              <div className="stats-content">
                <h3>{stats.totalOrders}</h3>
                <p>Total Orders</p>
              </div>
            </div>
            <div className="stats-card">
              <div className="stats-icon">💰</div>
              <div className="stats-content">
                <h3>₹{stats.todayRevenue}</h3>
                <p>Today's Revenue</p>
              </div>
            </div>
            <div className="stats-card">
              <div className="stats-icon">🍿</div>
              <div className="stats-content">
                <h3>{stats.activeProducts}</h3>
                <p>Active Products</p>
              </div>
            </div>
            <div className="stats-card">
              <div className="stats-icon">👥</div>
              <div className="stats-content">
                <h3>{stats.totalCustomers}</h3>
                <p>Total Customers</p>
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div style={{ marginBottom: '30px' }}>
            <FilterControls title="Recent Orders">
              <Button variant="primary">View All Orders</Button>
            </FilterControls>
            
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                Loading dashboard data...
              </div>
            ) : (
              <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Order ID</th>
                      <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Customer</th>
                      <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Amount</th>
                      <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td style={{ padding: '12px', borderBottom: '1px solid #f3f4f6' }}>#{order.id}</td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #f3f4f6' }}>{order.customerName}</td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #f3f4f6' }}>₹{order.amount}</td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #f3f4f6' }}>
                          <span className={`status-badge ${order.status}`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
            </>
          )}
        </PageContainer>
      </TheaterLayout>
    </ErrorBoundary>
  );
}

export default TheaterDashboard;