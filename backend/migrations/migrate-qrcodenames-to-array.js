const mongoose = require('mongoose');

// Define schemas directly to avoid model conflicts
const qrCodeNameOldSchema = new mongoose.Schema({
  qrName: String,
  seatClass: String,
  description: String,
  isActive: { type: Boolean, default: true },
  theater: { type: mongoose.Schema.Types.ObjectId, ref: 'Theater' }
}, { timestamps: true, collection: 'qrcodenames' });

const qrCodeNameNewSchema = new mongoose.Schema({
  theater: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Theater',
    required: true,
    unique: true
  },
  qrNameList: [{
    qrName: String,
    seatClass: String,
    description: String,
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }],
  metadata: {
    totalQRNames: { type: Number, default: 0 },
    activeQRNames: { type: Number, default: 0 },
    inactiveQRNames: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  }
}, { timestamps: true, collection: 'qrcodenames' });

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/theater_canteen_db';

async function migrateQRCodeNames() {
  try {
    console.log('🔄 Starting QR Code Names migration to array structure...\n');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Create models for migration
    const QRCodeNameOld = mongoose.model('QRCodeNameOld', qrCodeNameOldSchema);
    
    // First, backup existing data by renaming collection
    const collections = await mongoose.connection.db.listCollections({ name: 'qrcodenames' }).toArray();
    if (collections.length > 0) {
      console.log('📋 Backing up existing qrcodenames collection...');
      await mongoose.connection.db.collection('qrcodenames').rename('qrcodenames_backup_' + Date.now());
      console.log('✅ Backup created');
    }

    // Create new collection with array structure
    const QRCodeNameNew = mongoose.model('QRCodeNameNew', qrCodeNameNewSchema);

    // Get all existing QR code names from backup
    const backupCollections = await mongoose.connection.db.listCollections().toArray();
    const backupCollection = backupCollections.find(col => col.name.startsWith('qrcodenames_backup_'));
    
    if (!backupCollection) {
      console.log('⚠️ No backup collection found, checking for existing data...');
      return;
    }

    const oldQRNames = await mongoose.connection.db.collection(backupCollection.name).find({}).toArray();
    console.log(`📊 Found ${oldQRNames.length} QR code names to migrate`);

    // Group by theater
    const theaterGroups = {};
    oldQRNames.forEach(qrName => {
      const theaterId = qrName.theater ? qrName.theater.toString() : 'global';
      if (!theaterGroups[theaterId]) {
        theaterGroups[theaterId] = [];
      }
      theaterGroups[theaterId].push(qrName);
    });

    console.log(`🎭 Found ${Object.keys(theaterGroups).length} theater groups`);

    let migratedCount = 0;
    let errorCount = 0;

    // Process each theater group
    for (const [theaterId, qrNames] of Object.entries(theaterGroups)) {
      try {
        console.log(`\n🔄 Processing theater ${theaterId} with ${qrNames.length} QR names...`);

        // Skip global QR names (no theater assigned)
        if (theaterId === 'global') {
          console.log('⚠️ Skipping global QR names (no theater assigned)');
          continue;
        }

        // Create new array-based document
        const qrNameList = qrNames.map(qr => ({
          qrName: qr.qrName,
          seatClass: qr.seatClass,
          description: qr.description || '',
          isActive: qr.isActive !== false, // Default to true if undefined
          sortOrder: 0,
          createdAt: qr.createdAt || new Date(),
          updatedAt: qr.updatedAt || new Date()
        }));

        const newDoc = new QRCodeNameNew({
          theater: new mongoose.Types.ObjectId(theaterId),
          qrNameList: qrNameList,
          metadata: {
            totalQRNames: qrNameList.length,
            activeQRNames: qrNameList.filter(qr => qr.isActive).length,
            inactiveQRNames: qrNameList.filter(qr => !qr.isActive).length,
            lastUpdated: new Date()
          }
        });

        await newDoc.save();
        migratedCount += qrNames.length;
        
        console.log(`✅ Created new array document for theater ${theaterId} with ${qrNameList.length} QR names`);

        // List the migrated QR names
        qrNameList.forEach((qr, index) => {
          console.log(`   ${index + 1}. ${qr.qrName} - ${qr.seatClass} (${qr.isActive ? 'Active' : 'Inactive'})`);
        });

      } catch (error) {
        errorCount++;
        console.error(`❌ Error processing theater ${theaterId}:`, error.message);
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   - Total QR names processed: ${oldQRNames.length}`);
    console.log(`   - Successfully migrated: ${migratedCount}`);
    console.log(`   - Errors: ${errorCount}`);
    console.log(`   - Theater groups processed: ${Object.keys(theaterGroups).length}`);
    console.log(`   - Backup collection: ${backupCollection.name}`);

    console.log(`\n⚠️ IMPORTANT: After verifying the migration, you should:`);
    console.log(`   1. Test the new array structure thoroughly`);
    console.log(`   2. Update your application to use the new structure`);
    console.log(`   3. Remove the backup collection if everything works correctly`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateQRCodeNames();
}

module.exports = { migrateQRCodeNames };