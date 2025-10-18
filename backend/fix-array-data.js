const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/theater_canteen_db')
  .then(() => {
    console.log('✅ Connected to MongoDB');
    fixTheaterUserArray();
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

async function fixTheaterUserArray() {
  try {
    const db = mongoose.connection.db;
    
    console.log('\n🔧 FIXING THEATER USER ARRAY DATA:\n');
    
    // Get the theater ID
    const theaters = await db.collection('theaters').find({}).toArray();
    if (theaters.length === 0) {
      console.log('❌ No theaters found!');
      process.exit(1);
    }
    
    const theaterId = theaters[0]._id;
    console.log(`Theater ID: ${theaterId}`);
    
    // Get the current array document
    const arrayDoc = await db.collection('theateruserarrays').findOne({});
    console.log(`Current array document theaterId: ${arrayDoc?.theaterId}`);
    console.log(`Users in array: ${arrayDoc?.users?.length || 0}`);
    
    // Get all users from old collection
    const oldUsers = await db.collection('theaterusers').find({}).toArray();
    console.log(`Old users found: ${oldUsers.length}`);
    
    if (oldUsers.length > 0) {
      // Prepare users array with proper structure
      const usersArray = oldUsers.map(user => ({
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isActive: user.isActive !== false,
        isEmailVerified: user.isEmailVerified || false,
        passwordHash: user.passwordHash,
        loginAttempts: user.loginAttempts || 0,
        lockUntil: user.lockUntil || null,
        lastLogin: user.lastLogin || null,
        createdAt: user.createdAt || new Date(),
        updatedAt: new Date()
      }));
      
      // Update or create the array document with correct theaterId
      const updateResult = await db.collection('theateruserarrays').updateOne(
        {}, // Empty filter to find the existing document
        {
          $set: {
            theaterId: new mongoose.Types.ObjectId(theaterId),
            users: usersArray,
            totalUsers: usersArray.length,
            lastModified: new Date(),
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
      
      console.log(`✅ Update result: ${JSON.stringify(updateResult)}`);
      
      // Verify the fix
      const updatedDoc = await db.collection('theateruserarrays').findOne({});
      console.log(`\n✅ VERIFICATION:`);
      console.log(`   - Theater ID: ${updatedDoc.theaterId}`);
      console.log(`   - Users count: ${updatedDoc.users?.length || 0}`);
      console.log(`   - Total users: ${updatedDoc.totalUsers}`);
      
      if (updatedDoc.users?.length > 0) {
        console.log(`   - Sample user: ${updatedDoc.users[0].username}`);
      }
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Fix error:', error);
    process.exit(1);
  }
}