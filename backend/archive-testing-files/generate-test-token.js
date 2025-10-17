const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '_1.env' });

async function generateTestToken() {
  try {
    await mongoose.connect('mongodb://localhost:27017/theater_canteen_db');
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // Find a theater user for theater 68ed25e6962cb3e997acc163
    const theaterUser = await db.collection('theaterusers').findOne({
      theater: new mongoose.Types.ObjectId('68ed25e6962cb3e997acc163')
    });
    
    if (!theaterUser) {
      console.log('❌ No theater user found');
      
      // Find admin user instead
      const admin = await db.collection('admins').findOne({});
      if (admin) {
        console.log('✅ Found admin user:', admin.username);
        
        const token = jwt.sign(
          {
            id: admin._id,
            userType: 'admin',
            permissions: ['all']
          },
          process.env.JWT_SECRET || 'yqpaynow-super-secret-jwt-key-development-only',
          { expiresIn: '7d' }
        );
        
        console.log('\n🔑 Admin Token (valid for 7 days):');
        console.log(token);
        return token;
      }
    } else {
      console.log('✅ Found theater user:', theaterUser.username);
      
      const token = jwt.sign(
        {
          id: theaterUser._id,
          userType: 'theater_user',
          theater: theaterUser.theater,
          theaterId: theaterUser.theater,
          permissions: []
        },
        process.env.JWT_SECRET || 'yqpaynow-super-secret-jwt-key-development-only',
        { expiresIn: '7d' }
      );
      
      console.log('\n🔑 Theater User Token (valid for 7 days):');
      console.log(token);
      return token;
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

generateTestToken();
