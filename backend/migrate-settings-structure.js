/**
 * Settings Structure Migration Script
 * Ensures settings are properly formatted for frontend consumption
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/theater_canteen_db';

async function migrateSettings() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const settingsCollection = db.collection('settings');

    // Find the general settings document
    const generalSettings = await settingsCollection.findOne({ type: 'general' });

    if (!generalSettings) {
      console.log('⚠️ No general settings found. Creating default settings...');
      
      // Create default settings document
      await settingsCollection.insertOne({
        type: 'general',
        firebaseConfig: {
          apiKey: '',
          authDomain: '',
          projectId: '',
          storageBucket: '',
          messagingSenderId: '',
          appId: '',
          measurementId: ''
        },
        gcsConfig: {
          projectId: '',
          keyFilename: '',
          serviceAccountKey: '',
          bucketName: '',
          region: 'us-central1'
        },
        smsConfig: {
          provider: 'twilio',
          twilioAccountSid: '',
          twilioAuthToken: '',
          twilioPhoneNumber: '',
          textlocalApiKey: '',
          textlocalUsername: '',
          textlocalSender: '',
          awsAccessKeyId: '',
          awsSecretAccessKey: '',
          awsRegion: 'us-east-1',
          msg91ApiKey: '',
          msg91SenderId: '',
          msg91Route: '4',
          otpLength: 6,
          otpExpiry: 300,
          maxRetries: 3,
          enabled: false
        },
        mongodbConfig: {
          uri: MONGODB_URI,
          status: 'connected'
        },
        generalConfig: {
          applicationName: 'Theater Canteen System',
          browserTabTitle: 'YQPayNow - Theater Canteen',
          logoUrl: '',
          qrCodeUrl: '',
          environment: 'development',
          defaultCurrency: 'INR',
          timezone: 'Asia/Kolkata',
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '12hour',
          languageRegion: 'en-IN',
          siteName: 'Theater Canteen',
          siteDescription: 'QR-based online ordering system',
          primaryColor: '#8B5CF6',
          secondaryColor: '#6366F1',
          currency: 'INR',
          currencySymbol: '₹',
          orderTimeout: 30,
          maintenanceMode: false,
          allowRegistration: true,
          requireEmailVerification: false,
          requirePhoneVerification: true,
          maxOrdersPerDay: 10,
          minOrderAmount: 50,
          taxRate: 18,
          deliveryCharge: 25,
          freeDeliveryThreshold: 500,
          frontendUrl: 'http://localhost:3001'
        },
        isActive: true,
        version: 1,
        lastUpdated: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      console.log('✅ Default settings created');
    } else {
      console.log('📋 Found existing general settings');
      console.log('Current generalConfig:', JSON.stringify(generalSettings.generalConfig, null, 2));

      // Ensure generalConfig exists and has all required fields
      const updatedGeneralConfig = {
        applicationName: generalSettings.generalConfig?.applicationName || 'Theater Canteen System',
        browserTabTitle: generalSettings.generalConfig?.browserTabTitle || 'YQPayNow - Theater Canteen',
        logoUrl: generalSettings.generalConfig?.logoUrl || '',
        qrCodeUrl: generalSettings.generalConfig?.qrCodeUrl || '',
        environment: generalSettings.generalConfig?.environment || 'development',
        defaultCurrency: generalSettings.generalConfig?.defaultCurrency || 'INR',
        timezone: generalSettings.generalConfig?.timezone || 'Asia/Kolkata',
        dateFormat: generalSettings.generalConfig?.dateFormat || 'DD/MM/YYYY',
        timeFormat: generalSettings.generalConfig?.timeFormat || '12hour',
        languageRegion: generalSettings.generalConfig?.languageRegion || 'en-IN',
        siteName: generalSettings.generalConfig?.siteName || 'Theater Canteen',
        siteDescription: generalSettings.generalConfig?.siteDescription || 'QR-based online ordering system',
        primaryColor: generalSettings.generalConfig?.primaryColor || '#8B5CF6',
        secondaryColor: generalSettings.generalConfig?.secondaryColor || '#6366F1',
        currency: generalSettings.generalConfig?.currency || generalSettings.generalConfig?.defaultCurrency || 'INR',
        currencySymbol: generalSettings.generalConfig?.currencySymbol || '₹',
        orderTimeout: generalSettings.generalConfig?.orderTimeout || 30,
        maintenanceMode: generalSettings.generalConfig?.maintenanceMode || false,
        allowRegistration: generalSettings.generalConfig?.allowRegistration !== undefined 
          ? generalSettings.generalConfig.allowRegistration 
          : true,
        requireEmailVerification: generalSettings.generalConfig?.requireEmailVerification || false,
        requirePhoneVerification: generalSettings.generalConfig?.requirePhoneVerification !== undefined 
          ? generalSettings.generalConfig.requirePhoneVerification 
          : true,
        maxOrdersPerDay: generalSettings.generalConfig?.maxOrdersPerDay || 10,
        minOrderAmount: generalSettings.generalConfig?.minOrderAmount || 50,
        taxRate: generalSettings.generalConfig?.taxRate || 18,
        deliveryCharge: generalSettings.generalConfig?.deliveryCharge || 25,
        freeDeliveryThreshold: generalSettings.generalConfig?.freeDeliveryThreshold || 500,
        frontendUrl: generalSettings.generalConfig?.frontendUrl || 'http://localhost:3001'
      };

      // Update the settings document
      const updateResult = await settingsCollection.updateOne(
        { type: 'general' },
        {
          $set: {
            generalConfig: updatedGeneralConfig,
            lastUpdated: new Date(),
            updatedAt: new Date(),
            version: typeof generalSettings.version === 'number' ? generalSettings.version + 1 : 1
          }
        }
      );

      console.log('✅ Settings structure updated');
      console.log('Updated generalConfig:', JSON.stringify(updatedGeneralConfig, null, 2));
    }

    // Verify the migration
    const verifySettings = await settingsCollection.findOne({ type: 'general' });
    console.log('\n📊 Final settings structure:');
    console.log('- applicationName:', verifySettings.generalConfig?.applicationName);
    console.log('- browserTabTitle:', verifySettings.generalConfig?.browserTabTitle);
    console.log('- logoUrl:', verifySettings.generalConfig?.logoUrl || '(empty)');
    console.log('- environment:', verifySettings.generalConfig?.environment);
    console.log('- defaultCurrency:', verifySettings.generalConfig?.defaultCurrency);

    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run migration
if (require.main === module) {
  migrateSettings()
    .then(() => {
      console.log('Migration script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateSettings };
