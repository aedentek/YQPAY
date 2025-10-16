import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import config from '../config';

const TestAddProductDropdowns = () => {
  const { theaterId: urlTheaterId } = useParams();
  const { theaterId: authTheaterId, user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  // Get effective theater ID
  const effectiveTheaterId = authTheaterId || user?.theater?._id || user?.assignedTheater?._id || '68d37ea676752b839952af81';

  console.log('🧪 Test Component - Theater ID sources:', {
    urlTheaterId,
    authTheaterId,
    userTheaterId: user?.theater?._id,
    effectiveTheaterId,
    user: user ? { id: user.id, username: user.username } : null
  });

  useEffect(() => {
    const testAPIs = async () => {
      console.log('🔧 Testing APIs in test component...');
      setLoading(true);
      
      const token = localStorage.getItem('authToken');
      console.log('Token exists:', token ? 'YES' : 'NO');
      
      if (!token) {
        setErrors({ auth: 'No auth token found' });
        setLoading(false);
        return;
      }

      try {
        // First test if we can reach the API at all
        console.log('🔍 Testing API connectivity...');
        const healthResponse = await fetch(`${config.api.baseUrl}/health`);
        console.log('Health check response:', healthResponse.status);
        
        if (!healthResponse.ok) {
          setErrors({ connectivity: 'Cannot reach backend API' });
          setLoading(false);
          return;
        }
        // Test Categories API
        console.log('📋 Testing Categories API...');
        const categoriesResponse = await fetch(`${config.api.baseUrl}/theater-categories-simple/${effectiveTheaterId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('Categories Response Status:', categoriesResponse.status);
        const categoriesData = await categoriesResponse.json();
        console.log('Categories Response Data:', categoriesData);

        if (categoriesResponse.ok && categoriesData.success) {
          setCategories(categoriesData.data.categories || []);
          console.log('✅ Categories loaded:', categoriesData.data.categories?.length || 0);
        } else {
          console.error('❌ Categories API failed:', {
            status: categoriesResponse.status,
            statusText: categoriesResponse.statusText,
            data: categoriesData
          });
          setErrors(prev => ({ ...prev, categories: `Categories API error: ${categoriesData.message || 'Unknown error'}` }));
        }

        // Test Product Types API  
        console.log('🏷️ Testing Product Types API...');
        const productTypesResponse = await fetch(`${config.api.baseUrl}/theater-product-types-simple/${effectiveTheaterId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('Product Types Response Status:', productTypesResponse.status);
        const productTypesData = await productTypesResponse.json();
        console.log('Product Types Response Data:', productTypesData);

        if (productTypesResponse.ok && productTypesData.success) {
          setProductTypes(productTypesData.data.productTypes || []);
          console.log('✅ Product Types loaded:', productTypesData.data.productTypes?.length || 0);
        } else {
          console.error('❌ Product Types API failed:', {
            status: productTypesResponse.status,
            statusText: productTypesResponse.statusText,
            data: productTypesData
          });
          setErrors(prev => ({ ...prev, productTypes: `Product Types API error: ${productTypesData.message || 'Unknown error'}` }));
        }

      } catch (error) {
        console.error('❌ API Test Error:', error);
        setErrors({ general: `Network error: ${error.message}` });
      } finally {
        setLoading(false);
      }
    };

    if (effectiveTheaterId) {
      testAPIs();
    } else {
      console.error('❌ No theater ID available');
      setErrors({ theaterId: 'No theater ID available' });
      setLoading(false);
    }
  }, [effectiveTheaterId]);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ color: '#8B5CF6' }}>🧪 Add Product Dropdowns Test</h2>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h3>Debug Info:</h3>
        <p><strong>URL Theater ID:</strong> {urlTheaterId || 'None'}</p>
        <p><strong>Auth Theater ID:</strong> {authTheaterId || 'None'}</p>
        <p><strong>User Theater ID:</strong> {user?.theater?._id || 'None'}</p>
        <p><strong>Effective Theater ID:</strong> {effectiveTheaterId}</p>
        <p><strong>Auth Token:</strong> {localStorage.getItem('authToken') ? 'EXISTS' : 'MISSING'}</p>
        <p><strong>User:</strong> {user ? `${user.username} (${user.id})` : 'None'}</p>
      </div>

      {loading && (
        <div style={{ padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '8px', marginBottom: '20px' }}>
          <p>🔄 Loading API data...</p>
        </div>
      )}

      {Object.keys(errors).length > 0 && (
        <div style={{ padding: '15px', backgroundColor: '#ffebee', borderRadius: '8px', marginBottom: '20px' }}>
          <h3 style={{ color: '#d32f2f' }}>Errors:</h3>
          {Object.entries(errors).map(([key, error]) => (
            <p key={key} style={{ color: '#d32f2f' }}><strong>{key}:</strong> {error}</p>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '8px' }}>
          <h3>📋 Categories ({categories.length})</h3>
          {categories.length > 0 ? (
            <ul>
              {categories.map((cat, index) => (
                <li key={cat._id || index}>
                  <strong>{cat.name}</strong>
                  {cat.description && <span> - {cat.description}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: '#666' }}>No categories loaded</p>
          )}
        </div>

        <div style={{ padding: '15px', backgroundColor: '#fff3e0', borderRadius: '8px' }}>
          <h3>🏷️ Product Types ({productTypes.length})</h3>
          {productTypes.length > 0 ? (
            <ul>
              {productTypes.map((pt, index) => (
                <li key={pt._id || index}>
                  <strong>{pt.productName}</strong> ({pt.productCode})
                  {pt.description && <span> - {pt.description}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: '#666' }}>No product types loaded</p>
          )}
        </div>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f3e5f5', borderRadius: '8px' }}>
        <h3>🎯 Expected Results:</h3>
        <p><strong>Categories:</strong> Should show Bread, Drinks, Snacks</p>
        <p><strong>Product Types:</strong> Should show COCA COLA (CA-001)</p>
        <p><strong>Status:</strong> {categories.length > 0 && productTypes.length > 0 ? '✅ SUCCESS' : '❌ FAILED'}</p>
      </div>
    </div>
  );
};

export default TestAddProductDropdowns;