console.log('Setting fresh auth token...');

// Fresh token from backend (valid for 24 hours)
const validToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGVkMjVlNjk2MmNiM2U5OTdhY2MxNjMiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6IkFkbWluIiwiaWF0IjoxNzYwODEwNjQ0LCJleHAiOjE3NjA4OTcwNDR9.nFhkKGcjde3DajA7ab6GNalHWOMfw5QKYzKAVS9V3RY";

localStorage.setItem('authToken', validToken);
console.log('✅ Fresh token set in localStorage');
console.log('Current token:', localStorage.getItem('authToken'));

// Redirect to correct stock management page with valid product ID
const theaterId = "68d37ea676752b839952af81";
const productId = "68dc4d0d4d1d703aa133268c"; // Valid product ID from API test
const stockUrl = `/theater-stock-management/${theaterId}/${productId}`;

console.log('🔄 Redirecting to:', stockUrl);
window.location.href = stockUrl;