import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import config from '../../config';
import './SimpleProductList.css';

const SimpleProductList = () => {
  const { theaterId } = useParams(); // Get theater ID from URL
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        
        const token = localStorage.getItem('authToken');
        if (!token) {
          setError('No authentication token found');
          setLoading(false);
          return;
        }

        const response = await fetch(config.helpers.getApiUrl(`/theater-products/${theaterId}`), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });


        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.success && data.data && data.data.products) {
          setProducts(data.data.products);
        } else {
          setError('No products found in response');
        }

      } catch (err) {
        setError(`Failed to load products: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className="simple-container">
        <h1>Simple Product List Test</h1>
        <div className="loading">Loading products...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="simple-container">
        <h1>Simple Product List Test</h1>
        <div className="error">❌ {error}</div>
      </div>
    );
  }

  return (
    <div className="simple-container">
      <h1>Simple Product List Test</h1>
      <div className="success">✅ Successfully loaded {products.length} products!</div>
      
      <div className="products-grid">
        {products.map((product, index) => (
          <div key={product._id} className="product-card">
            <div className="product-number">#{index + 1}</div>
            <div className="product-name">{product.name}</div>
            <div className="product-price">₹{product.sellingPrice}</div>
            <div className="product-stock">Stock: {product.stockQuantity}</div>
            <div className="product-status">
              {product.isActive ? '✅ Active' : '❌ Inactive'}
            </div>
          </div>
        ))}
      </div>

      <div className="debug-info">
        <h3>Debug Information:</h3>
        <p><strong>Theater ID:</strong> {theaterId}</p>
        <p><strong>Products Count:</strong> {products.length}</p>
        <p><strong>API Endpoint:</strong> {config.helpers.getApiUrl(`/theater-products/${theaterId}`)}</p>
      </div>
    </div>
  );
};

export default SimpleProductList;