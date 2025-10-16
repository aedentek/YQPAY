// Cart Test Utilities
export const testCartPersistence = () => {
  console.log('🧪 Testing cart persistence...');
  
  // Test localStorage availability
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
    console.log('✅ localStorage is working');
  } catch (e) {
    console.error('❌ localStorage is not available:', e);
    return false;
  }
  
  // Check current cart in localStorage
  const currentCart = localStorage.getItem('yqpay_cart');
  console.log('📦 Current cart in storage:', currentCart);
  
  if (currentCart) {
    try {
      const parsed = JSON.parse(currentCart);
      console.log('📦 Parsed cart items:', parsed);
      console.log('📦 Cart item count:', parsed.length);
    } catch (e) {
      console.error('❌ Error parsing cart data:', e);
    }
  } else {
    console.log('📦 No cart data found in storage');
  }
  
  return true;
};

// Add this to browser console to test
window.testCartPersistence = testCartPersistence;