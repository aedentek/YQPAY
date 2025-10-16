console.log('Setting fresh auth token...');

// Fresh token from backend (valid for 24 hours)
const validToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZDY0ZTliMzE0NWE0NWUzN2ZiMGUyMyIsInVzZXJUeXBlIjoidGhlYXRlcl91c2VyIiwidGhlYXRlciI6IjY4ZDM3ZWE2NzY3NTJiODM5OTUyYWY4MSIsInRoZWF0ZXJJZCI6IjY4ZDM3ZWE2NzY3NTJiODM5OTUyYWY4MSIsInBlcm1pc3Npb25zIjpbXSwiaWF0IjoxNzU5Mjk3NDc4LCJleHAiOjE3NTkzODM4Nzh9.W70K7iR9R3w3pAFlnrlYxOp-wD2KCLZoAAVcesi6dFA";

localStorage.setItem('authToken', validToken);
console.log('✅ Fresh token set in localStorage');
console.log('Current token:', localStorage.getItem('authToken'));

// Redirect to correct stock management page with valid product ID
const theaterId = "68d37ea676752b839952af81";
const productId = "68dc4d0d4d1d703aa133268c"; // Valid product ID from API test
const stockUrl = `/theater-stock-management/${theaterId}/${productId}`;

console.log('🔄 Redirecting to:', stockUrl);
window.location.href = stockUrl;