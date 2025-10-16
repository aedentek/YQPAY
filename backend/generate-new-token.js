/**
 * Generate a fresh authentication token for theater user
 */

const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '_1.env' });

const generateToken = () => {
  const payload = {
    userId: '68ed2634962cb3e997acc178',
    email: 'theater@test.com',
    userType: 'theater_user',
    theater: '68ed25e6962cb3e997acc163',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET);

  console.log('🔑 New Authentication Token Generated!\n');
  console.log('Token:', token);
  console.log('\n📋 Token Details:');
  console.log('   User ID:', payload.userId);
  console.log('   Theater ID:', payload.theater);
  console.log('   User Type:', payload.userType);
  console.log('   Expires in: 7 days');
  console.log('\n📝 Copy this token and paste it in your browser console:');
  console.log(`   localStorage.setItem('authToken', '${token}');`);
  console.log('\n✅ Then refresh the page and try adding products again!');
};

generateToken();
