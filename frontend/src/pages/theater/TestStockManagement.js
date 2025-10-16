import React from 'react';
import TheaterLayout from '../../components/theater/TheaterLayout';
import PageContainer from '../../components/PageContainer';
import '../../styles/TheaterList.css';

const TestStockManagement = () => {
  // Mock data for testing
  const mockStockEntries = [
    {
      _id: '1',
      date: new Date('2025-09-01'),
      stock: 100,
      expired: 0,
      sales: 20,
      balance: 80
    },
    {
      _id: '2', 
      date: new Date('2025-09-15'),
      stock: 50,
      expired: 5,
      sales: 15,
      balance: 110
    },
    {
      _id: '3',
      date: new Date('2025-09-28'),
      stock: 75,
      expired: 2,
      sales: 25,
      balance: 158
    }
  ];

  const mockSummary = {
    totalStock: 225,
    totalSales: 60,
    totalExpired: 7,
    currentBalance: 158
  };

  const mockProduct = {
    name: 'Test Product',
    stockQuantity: 158
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const StockEntryRow = ({ entry, index }) => {
    const globalIndex = index + 1;

    return (
      <tr className="theater-row">
        <td className="sno-cell">
          <span className="sno-number">{globalIndex}</span>
        </td>
        <td className="date-cell">
          <div className="date-info">
            <div className="entry-date">{formatDate(entry.date)}</div>
          </div>
        </td>
        <td className="stock-cell">
          <div className="stock-badge in-stock">
            <span className="stock-quantity">{entry.stock || 0}</span>
            <span className="stock-status">Added</span>
          </div>
        </td>
        <td className="expired-cell">
          <div className="stock-badge out-of-stock">
            <span className="stock-quantity">{entry.expired || 0}</span>
            <span className="stock-status">Expired</span>
          </div>
        </td>
        <td className="sales-cell">
          <div className="stock-badge low-stock">
            <span className="stock-quantity">{entry.sales || 0}</span>
            <span className="stock-status">Sold</span>
          </div>
        </td>
        <td className="balance-cell">
          <div className={`stock-badge ${entry.balance <= 0 ? 'out-of-stock' : 'in-stock'}`}>
            <span className="stock-quantity">{entry.balance || 0}</span>
            <span className="stock-status">Balance</span>
          </div>
        </td>
        <td className="actions-cell">
          <div className="action-buttons">
            <button className="action-btn edit-btn" title="Edit Stock Entry">
              <svg viewBox="0 0 24 24" fill="currentColor" style={{width: '16px', height: '16px'}}>
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </button>
            <button className="action-btn delete-btn" title="Delete Stock Entry">
              <svg viewBox="0 0 24 24" fill="currentColor" style={{width: '16px', height: '16px'}}>
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const StockStatistics = ({ summary, currentStock }) => {
    return (
      <div className="theater-content" style={{ padding: '0', margin: '0', background: 'transparent' }}>
        <div className="stat-cards-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '20px',
          padding: '24px',
          background: 'var(--white)',
          margin: '0',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <div className="stat-card" style={{ 
            background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)', 
            color: 'white', 
            padding: '24px', 
            borderRadius: '12px', 
            textAlign: 'center',
            boxShadow: '0 4px 15px rgba(139, 92, 246, 0.2)',
            transition: 'all 0.3s ease'
          }}>
            <div className="stat-value" style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '8px', lineHeight: '1' }}>
              {currentStock || 0}
            </div>
            <div className="stat-label" style={{ fontSize: '0.9rem', opacity: '0.9', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Current Stock
            </div>
          </div>
          
          <div className="stat-card" style={{ 
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', 
            color: 'white', 
            padding: '24px', 
            borderRadius: '12px', 
            textAlign: 'center',
            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.2)',
            transition: 'all 0.3s ease'
          }}>
            <div className="stat-value" style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '8px', lineHeight: '1' }}>
              {summary?.totalStock || 0}
            </div>
            <div className="stat-label" style={{ fontSize: '0.9rem', opacity: '0.9', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Added
            </div>
          </div>
          
          <div className="stat-card" style={{ 
            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', 
            color: 'white', 
            padding: '24px', 
            borderRadius: '12px', 
            textAlign: 'center',
            boxShadow: '0 4px 15px rgba(245, 158, 11, 0.2)',
            transition: 'all 0.3s ease'
          }}>
            <div className="stat-value" style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '8px', lineHeight: '1' }}>
              {summary?.totalSales || 0}
            </div>
            <div className="stat-label" style={{ fontSize: '0.9rem', opacity: '0.9', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Sales
            </div>
          </div>
          
          <div className="stat-card" style={{ 
            background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', 
            color: 'white', 
            padding: '24px', 
            borderRadius: '12px', 
            textAlign: 'center',
            boxShadow: '0 4px 15px rgba(239, 68, 68, 0.2)',
            transition: 'all 0.3s ease'
          }}>
            <div className="stat-value" style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '8px', lineHeight: '1' }}>
              {summary?.totalExpired || 0}
            </div>
            <div className="stat-label" style={{ fontSize: '0.9rem', opacity: '0.9', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Expired
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <TheaterLayout>
      <PageContainer>
        <div className="theater-list-container">
          {/* Header */}
          <div className="theater-list-header">
            <div className="header-content">
              <div className="header-title-section">
                <button className="back-button">
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '24px', height: '24px' }}>
                    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.42-1.41L7.83 13H20v-2z"/>
                  </svg>
                </button>
                <div className="title-group">
                  <h1>Stock Management (TEST)</h1>
                  <p className="header-subtitle">{mockProduct?.name || 'Test Product'}</p>
                </div>
              </div>
              <button className="add-theater-btn">
                <span className="btn-icon">+</span>
                Add Stock Entry
              </button>
            </div>
          </div>

          <div className="theater-content">
            {/* Statistics */}
            <StockStatistics 
              summary={mockSummary} 
              currentStock={mockProduct?.stockQuantity}
            />

            {/* Filters */}
            <div className="theater-filters">
              <div className="filter-controls">
                <select className="status-filter">
                  <option value={2025}>2025</option>
                </select>
                <select className="status-filter">
                  <option value={9}>September</option>
                </select>
                <select className="status-filter">
                  <option value={10}>10 per page</option>
                </select>
              </div>
              <div className="results-count">
                3 entries
              </div>
            </div>

            {/* Stock Entries Table */}
            <div className="table-container">
              <div className="table-wrapper">
                <table className="theater-table">
                  <thead>
                    <tr>
                      <th className="sno-col">S.NO</th>
                      <th className="date-col">Date</th>
                      <th className="stock-col">Stock Added</th>
                      <th className="expired-col">Expired</th>
                      <th className="sales-col">Sales</th>
                      <th className="balance-col">Balance</th>
                      <th className="actions-col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockStockEntries.map((entry, index) => (
                      <StockEntryRow
                        key={entry._id}
                        entry={entry}
                        index={index}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </TheaterLayout>
  );
};

export default TestStockManagement;