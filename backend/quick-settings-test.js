// Quick test of settings endpoints
const fetch = require('node-fetch');

async function quickTest() {
    try {
        // Test login
        const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@yqpaynow.com', password: 'admin123' })
        });
        
        if (loginResponse.ok) {
            const { token } = await loginResponse.json();
            console.log('✅ Login successful');
            
            // Test settings endpoints
            const endpoints = ['firebase', 'mongodb', 'gcs', 'sms'];
            for (const endpoint of endpoints) {
                const response = await fetch(`http://localhost:5000/api/settings/${endpoint}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                console.log(`${endpoint}: ${response.status}`);
            }
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

quickTest();