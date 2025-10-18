const mongoose = require('mongoose');

// Define schemas directly to avoid model conflicts
const roleOldSchema = new mongoose.Schema({
  name: String,
  description: String,
  theater: { type: mongoose.Schema.Types.ObjectId, ref: 'Theater' },
  permissions: [{
    page: String,
    pageName: String,
    hasAccess: { type: Boolean, default: false },
    route: String
  }],
  isGlobal: { type: Boolean, default: false },
  priority: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
  normalizedName: String,
  isDefault: { type: Boolean, default: false },
  canDelete: { type: Boolean, default: true },
  canEdit: { type: Boolean, default: true }
}, { timestamps: true, collection: 'roles' });

const roleNewSchema = new mongoose.Schema({
  theater: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Theater',
    required: true,
    unique: true
  },
  roleList: [{
    name: String,
    description: String,
    permissions: [{
      page: String,
      pageName: String,
      hasAccess: { type: Boolean, default: false },
      route: String
    }],
    isGlobal: { type: Boolean, default: false },
    priority: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    normalizedName: String,
    isDefault: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: true },
    canEdit: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }],
  metadata: {
    totalRoles: { type: Number, default: 0 },
    activeRoles: { type: Number, default: 0 },
    inactiveRoles: { type: Number, default: 0 },
    defaultRoles: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  }
}, { timestamps: true, collection: 'roles' });

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/theater_canteen_db';

async function migrateRoles() {
  try {
    console.log('🔄 Starting Roles migration to array structure...\n');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Create models for migration
    const RoleOld = mongoose.model('RoleOld', roleOldSchema);
    
    // First, backup existing data by renaming collection
    const collections = await mongoose.connection.db.listCollections({ name: 'roles' }).toArray();
    let backupName = null;
    
    if (collections.length > 0) {
      backupName = `roles_backup_${new Date().toISOString().replace(/[:.]/g, '-')}`;
      await mongoose.connection.db.collection('roles').aggregate([
        { $out: backupName }
      ]).toArray();
      console.log(`📦 Backed up existing roles collection to: ${backupName}`);
    }

    // Read old role documents directly from the roles collection
    const oldRoles = await mongoose.connection.db.collection('roles').find({}).toArray();
    console.log(`📊 Found ${oldRoles.length} individual role documents`);

    if (oldRoles.length === 0) {
      console.log('🟡 No roles found to migrate');
      
      // Check if collection exists
      const collections = await mongoose.connection.db.listCollections({ name: 'roles' }).toArray();
      if (collections.length === 0) {
        console.log('ℹ️  Roles collection does not exist');
      } else {
        console.log('ℹ️  Roles collection exists but is empty');
      }
      return;
    }

    // Group roles by theater
    const rolesByTheater = {};
    
    oldRoles.forEach(role => {
      const theaterId = role.theater.toString();
      if (!rolesByTheater[theaterId]) {
        rolesByTheater[theaterId] = [];
      }
      rolesByTheater[theaterId].push(role);
    });

    console.log(`🏢 Grouped roles by ${Object.keys(rolesByTheater).length} theaters`);

    // Create new collection with array structure
    const RoleNew = mongoose.model('RoleNew', roleNewSchema);
    
    let totalConverted = 0;
    
    for (const [theaterId, theaterRoles] of Object.entries(rolesByTheater)) {
      console.log(`\n🏢 Processing theater: ${theaterId} (${theaterRoles.length} roles)`);
      
      // Convert roles to array format
      const roleList = theaterRoles.map((role, index) => ({
        name: role.name,
        description: role.description || '',
        permissions: role.permissions || [],
        isGlobal: role.isGlobal || false,
        priority: role.priority || 1,
        isActive: role.isActive !== undefined ? role.isActive : true,
        normalizedName: role.normalizedName || role.name?.toLowerCase().trim(),
        isDefault: role.isDefault || false,
        canDelete: role.canDelete !== undefined ? role.canDelete : true,
        canEdit: role.canEdit !== undefined ? role.canEdit : true,
        sortOrder: index,
        createdAt: role.createdAt || new Date(),
        updatedAt: role.updatedAt || new Date()
      }));

      // Calculate metadata
      const totalRoles = roleList.length;
      const activeRoles = roleList.filter(role => role.isActive).length;
      const inactiveRoles = totalRoles - activeRoles;
      const defaultRoles = roleList.filter(role => role.isDefault).length;

      // Create new theater-wise document directly in roles collection
      const newRoleDoc = {
        theater: new mongoose.Types.ObjectId(theaterId),
        roleList,
        metadata: {
          totalRoles,
          activeRoles,
          inactiveRoles,
          defaultRoles,
          lastUpdated: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Insert directly into the roles collection
      await mongoose.connection.db.collection('roles').insertOne(newRoleDoc);
      totalConverted += theaterRoles.length;
      
      console.log(`✅ Created array document for theater ${theaterId}:`);
      console.log(`   - Total roles: ${totalRoles}`);
      console.log(`   - Active roles: ${activeRoles}`);
      console.log(`   - Default roles: ${defaultRoles}`);
    }

    console.log(`\n🎉 Migration completed successfully!`);
    console.log(`📊 Migration Summary:`);
    console.log(`   - Individual documents processed: ${oldRoles.length}`);
    console.log(`   - Theater documents created: ${Object.keys(rolesByTheater).length}`);
    console.log(`   - Total roles converted: ${totalConverted}`);
    console.log(`   - Structure: Individual → Theater-wise Arrays`);

    // Verify the migration
    console.log(`\n🔍 Verification:`);
    const newCount = await mongoose.connection.db.collection('roles').countDocuments();
    const totalRolesInArrays = await mongoose.connection.db.collection('roles').aggregate([
      { $project: { totalRoles: '$metadata.totalRoles' } },
      { $group: { _id: null, total: { $sum: '$totalRoles' } } }
    ]).toArray();
    
    console.log(`   - New theater documents: ${newCount}`);
    console.log(`   - Total roles in arrays: ${totalRolesInArrays[0]?.total || 0}`);
    
    if (totalRolesInArrays[0]?.total === oldRoles.length) {
      console.log(`✅ Migration verification passed!`);
    } else {
      console.log(`❌ Migration verification failed! Data mismatch.`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Rollback function to restore original structure
async function rollbackRoles() {
  try {
    console.log('🔄 Starting Roles rollback to individual structure...\n');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the most recent backup
    const collections = await mongoose.connection.db.listCollections().toArray();
    const backupCollections = collections.filter(col => col.name.startsWith('roles_backup_'));
    
    if (backupCollections.length === 0) {
      console.log('❌ No backup collections found');
      return;
    }

    // Get the most recent backup (last one alphabetically due to timestamp format)
    const latestBackup = backupCollections.sort((a, b) => b.name.localeCompare(a.name))[0];
    console.log(`📦 Found backup: ${latestBackup.name}`);

    // Drop current roles collection
    await mongoose.connection.db.collection('roles').drop();
    console.log('🗑️ Dropped current roles collection');

    // Restore from backup
    await mongoose.connection.db.collection(latestBackup.name).aggregate([
      { $out: 'roles' }
    ]).toArray();

    const restoredCount = await mongoose.connection.db.collection('roles').countDocuments();
    console.log(`✅ Restored ${restoredCount} individual role documents`);

  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Command line interface
const command = process.argv[2];

if (command === 'migrate') {
  migrateRoles().catch(console.error);
} else if (command === 'rollback') {
  rollbackRoles().catch(console.error);
} else {
  console.log('Usage:');
  console.log('  node migrate-roles-to-array.js migrate   - Migrate to array structure');
  console.log('  node migrate-roles-to-array.js rollback  - Rollback to individual structure');
}