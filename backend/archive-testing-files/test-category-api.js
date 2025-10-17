const fetch = require('node-fetch');

const THEATER_ID = '68ed25e6962cb3e997acc163';
const API_URL = `http://192.168.1.6:5000/api/theater-categories/${THEATER_ID}`;

async function testCategoryAPI() {
  try {
    console.log('\n🔍 Testing Category API...');
    console.log('URL:', API_URL);
    console.log('');

    const response = await fetch(API_URL);
    const data = await response.json();

    console.log('📡 API Response:');
    console.log(JSON.stringify(data, null, 2));

    console.log('\n📦 Categories Received:', data.data?.categories?.length || 0);
    
    if (data.data?.categories) {
      console.log('\n🏷️  Category Details:');
      data.data.categories.forEach((cat, index) => {
        console.log(`\n${index + 1}. ${cat.categoryName}`);
        console.log(`   _id: ${cat._id}`);
        console.log(`   imageUrl: ${cat.imageUrl ? 'YES ✅' : 'NO ❌'}`);
        if (cat.imageUrl) {
          console.log(`   URL: ${cat.imageUrl.substring(0, 100)}...`);
        }
        console.log(`   isActive: ${cat.isActive}`);
      });
    }

    console.log('\n✅ Test Complete!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testCategoryAPI();
