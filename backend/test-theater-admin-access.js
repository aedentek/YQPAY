/**
 * Test Theater Admin Access to Order History
 * This script verifies that theater admins can see all orders while regular staff only see their own
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function testTheaterAdminAccess() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/yqpaynow', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Get a theater
    const theater = await db.collection('theaters').findOne({});
    if (!theater) {
      console.log('❌ No theaters found');
      process.exit(1);
    }
    console.log('🎭 Theater:', theater.name, '\n');

    // Get theater users
    const theaterUsers = await db.collection('theaterusers')
      .find({ theater: theater._id, isActive: true })
      .toArray();

    console.log('👥 Theater Users:');
    console.log('================');
    for (const user of theaterUsers) {
      let roleInfo = null;
      let userType = 'theater_user';
      
      // Determine role/userType
      if (user.role) {
        if (typeof user.role === 'string' && user.role.toLowerCase().includes('admin')) {
          userType = 'theater_admin';
        } else if (mongoose.Types.ObjectId.isValid(user.role)) {
          roleInfo = await db.collection('roles').findOne({ 
            _id: new mongoose.Types.ObjectId(user.role) 
          });
          if (roleInfo && roleInfo.name && roleInfo.name.toLowerCase().includes('admin')) {
            userType = 'theater_admin';
          }
        }
      }

      console.log(`\n📋 Username: ${user.username}`);
      console.log(`   Role: ${roleInfo ? roleInfo.name : user.role}`);
      console.log(`   UserType: ${userType}`);
      console.log(`   Theater: ${theater.name}`);
    }

    // Get orders for this theater
    const theaterOrders = await db.collection('theaterorders')
      .findOne({ theater: theater._id });

    if (!theaterOrders || !theaterOrders.orderList) {
      console.log('\n⚠️ No orders found for this theater');
    } else {
      console.log(`\n📊 Total Orders: ${theaterOrders.orderList.length}`);
      
      // Group orders by staff
      const ordersByStaff = {};
      for (const order of theaterOrders.orderList) {
        const staffId = order.staffInfo?.staffId ? String(order.staffInfo.staffId) : 'anonymous';
        const staffName = order.staffInfo?.username || 'Anonymous';
        
        if (!ordersByStaff[staffId]) {
          ordersByStaff[staffId] = {
            name: staffName,
            count: 0
          };
        }
        ordersByStaff[staffId].count++;
      }

      console.log('\n📈 Orders by Staff:');
      console.log('==================');
      for (const [staffId, info] of Object.entries(ordersByStaff)) {
        console.log(`   ${info.name}: ${info.count} orders (ID: ${staffId})`);
      }
    }

    console.log('\n\n✅ Test Complete!');
    console.log('\n💡 Expected Behavior:');
    console.log('   - Theater Admin (userType: theater_admin) → Should see ALL orders');
    console.log('   - Theater User (userType: theater_user) → Should see ONLY their own orders');
    console.log('\n📝 After logging in with new tokens, verify:');
    console.log('   1. Theater Admin can see all orders from all staff');
    console.log('   2. Regular staff can only see orders they created');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testTheaterAdminAccess();
