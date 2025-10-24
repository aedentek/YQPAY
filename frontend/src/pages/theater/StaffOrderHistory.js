import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import TheaterLayout from '../../components/theater/TheaterLayout';
import PageContainer from '../../components/PageContainer';
import ErrorBoundary from '../../components/ErrorBoundary';
import { useModal } from '../../contexts/ModalContext';
import config from '../../config';
import '../../styles/QRManagementPage.css';
import '../../styles/TheaterList.css';

const StaffOrderHistory = () => {
  const { theaterId } = useParams();
  const { user, theaterId: userTheaterId } = useAuth();
  const { showError } = useModal();

  // Data state
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staffInfo, setStaffInfo] = useState(null);
  const [statistics, setStatistics] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filter state
  const [dateFilter, setDateFilter] = useState({
    year: new Date().getFullYear(),
    month: null
  });

  // Fetch staff orders
  const fetchStaffOrders = useCallback(async (page = 1) => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });

      // Add date filters if set
      if (dateFilter.year) {
        params.append('year', dateFilter.year.toString());
      }
      if (dateFilter.month) {
        params.append('month', dateFilter.month.toString());
      }

      const response = await fetch(`${config.api.baseUrl}/orders/my-orders?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          setOrders(data.data.orders);
          setStaffInfo(data.data.staffInfo);
          setStatistics(data.data.statistics);
          setCurrentPage(data.data.pagination.currentPage);
          setTotalPages(data.data.pagination.totalPages);
          setTotalItems(data.data.pagination.totalItems);
        } else {
          console.error('Failed to fetch staff orders:', data.message);
          // Removed error modal - just show empty state
        }
      } else if (response.status === 404) {
        // Handle no orders found gracefully
        console.log('ℹ️ No orders found for staff user (404)');
        setOrders([]);
        setStatistics({ totalOrders: 0, totalRevenue: 0 });
        setCurrentPage(1);
        setTotalPages(1);
        setTotalItems(0);
      } else {
        console.error('HTTP error:', response.status);
        // Removed error modal - just show empty state
      }
    } catch (error) {
      console.error('Error fetching staff orders:', error);
      // Removed error modal - just show empty state
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  // Load data on component mount and filter changes
  useEffect(() => {
    fetchStaffOrders(1);
  }, [fetchStaffOrders]);

  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchStaffOrders(newPage);
    }
  };

  // Handle date filter changes
  const handleDateFilterChange = (newFilter) => {
    setDateFilter(newFilter);
    setCurrentPage(1);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return `₹${amount.toFixed(2)}`;
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN');
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    const statusClasses = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'confirmed': 'bg-blue-100 text-blue-800',
      'preparing': 'bg-orange-100 text-orange-800',
      'ready': 'bg-green-100 text-green-800',
      'delivered': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading && orders.length === 0) {
    return (
      <TheaterLayout>
        <PageContainer>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="spinner-border text-primary mb-3" role="status">
                <span className="sr-only">Loading...</span>
              </div>
              <p>Loading your order history...</p>
            </div>
          </div>
        </PageContainer>
      </TheaterLayout>
    );
  }

  return (
    <ErrorBoundary>
      <TheaterLayout>
        <PageContainer>
          <div className="staff-order-history">
            {/* Header */}
            <div className="page-header mb-6">
              <h1 className="text-3xl font-bold text-gray-900">My Order History</h1>
              <p className="text-gray-600 mt-2">
                View and track orders you have created
              </p>
            </div>

            {/* Staff Info & Statistics */}
            {(staffInfo || statistics) && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {staffInfo && (
                  <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-900">Staff Information</h3>
                    <p className="text-gray-600">Name: {staffInfo.staffName}</p>
                    <p className="text-gray-600">Username: @{staffInfo.staffUsername}</p>
                  </div>
                )}
                
                {statistics && (
                  <>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-blue-900">Total Orders</h3>
                      <p className="text-2xl font-bold text-blue-600">{statistics.totalOrders}</p>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-green-900">Total Revenue</h3>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(statistics.totalRevenue)}</p>
                    </div>
                    
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-purple-900">Average Order</h3>
                      <p className="text-2xl font-bold text-purple-600">{formatCurrency(statistics.averageOrderValue)}</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Date Filters */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
              <h3 className="text-lg font-semibold mb-3">Filter by Date</h3>
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <select 
                    value={dateFilter.year || ''} 
                    onChange={(e) => handleDateFilterChange({
                      ...dateFilter,
                      year: e.target.value ? parseInt(e.target.value) : null
                    })}
                    className="border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="">All Years</option>
                    {[2025, 2024, 2023].map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                  <select 
                    value={dateFilter.month || ''} 
                    onChange={(e) => handleDateFilterChange({
                      ...dateFilter,
                      month: e.target.value ? parseInt(e.target.value) : null
                    })}
                    className="border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="">All Months</option>
                    {[
                      { value: 1, label: 'January' },
                      { value: 2, label: 'February' },
                      { value: 3, label: 'March' },
                      { value: 4, label: 'April' },
                      { value: 5, label: 'May' },
                      { value: 6, label: 'June' },
                      { value: 7, label: 'July' },
                      { value: 8, label: 'August' },
                      { value: 9, label: 'September' },
                      { value: 10, label: 'October' },
                      { value: 11, label: 'November' },
                      { value: 12, label: 'December' }
                    ].map(month => (
                      <option key={month.value} value={month.value}>{month.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Orders List */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Your Orders ({totalItems} total)
                </h2>
              </div>

              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📝</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Found</h3>
                  <p className="text-gray-600">You haven't created any orders yet for the selected period.</p>
                </div>
              ) : (
                <>
                  {/* Orders Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Order
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Customer
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Items
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {orders.map((order, index) => (
                          <tr key={`${order.orderNumber}-${index}`} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {order.orderNumber}
                              </div>
                              <div className="text-sm text-gray-500">
                                {order.paymentMethod.toUpperCase()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {order.customerName}
                              </div>
                              {order.customerPhone && (
                                <div className="text-sm text-gray-500">
                                  {order.customerPhone}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {order.products.length} items
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {formatCurrency(order.totalAmount)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(order.status)}`}>
                                {order.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(order.orderDate)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                          Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, totalItems)} of {totalItems} orders
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
                          >
                            Previous
                          </button>
                          
                          {[...Array(totalPages)].map((_, index) => {
                            const page = index + 1;
                            return (
                              <button
                                key={page}
                                onClick={() => handlePageChange(page)}
                                className={`px-3 py-1 text-sm rounded ${
                                  currentPage === page
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {page}
                              </button>
                            );
                          })}
                          
                          <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </PageContainer>
      </TheaterLayout>
    </ErrorBoundary>
  );
};

export default StaffOrderHistory;