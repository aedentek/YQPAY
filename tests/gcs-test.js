const { Storage } = require('@google-cloud/storage');
const path = require('path');

class GCSTestSuite {
  constructor(config) {
    this.projectId = config.projectId;
    this.bucketName = config.bucketName;
    this.region = config.region;
    this.keyFilename = config.keyFilename;
    
    // Initialize storage client
    this.storage = new Storage({
      projectId: this.projectId,
      keyFilename: this.keyFilename
    });
    
    this.bucket = this.storage.bucket(this.bucketName);
  }

  async testConnection() {
    console.log('🔍 Testing Google Cloud Storage Connection...');
    console.log(`📊 Project ID: ${this.projectId}`);
    console.log(`🪣 Bucket Name: ${this.bucketName}`);
    
    try {
      // Test 1: Check if bucket exists
      const [exists] = await this.bucket.exists();
      if (!exists) {
        console.log('❌ Bucket does not exist. Creating bucket...');
        await this.createBucket();
      } else {
        console.log('✅ Bucket exists');
      }
      
      // Test 2: Check bucket permissions
      await this.testBucketPermissions();
      
      // Test 3: Upload test file
      await this.testFileUpload();
      
      // Test 4: Download test file
      await this.testFileDownload();
      
      // Test 5: Delete test file
      await this.testFileDelete();
      
      console.log('🎉 All Google Cloud Storage tests passed!');
      return { success: true, message: 'GCS connection successful' };
      
    } catch (error) {
      console.error('❌ GCS Test Failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async createBucket() {
    try {
      const [bucket] = await this.storage.createBucket(this.bucketName, {
        location: this.region,
        storageClass: 'STANDARD',
        uniformBucketLevelAccess: true
      });
      
      console.log(`✅ Bucket ${bucket.name} created successfully`);
      return bucket;
    } catch (error) {
      console.error('❌ Failed to create bucket:', error.message);
      throw error;
    }
  }

  async testBucketPermissions() {
    try {
      const [metadata] = await this.bucket.getMetadata();
      console.log('✅ Bucket permissions check passed');
      console.log(`📍 Location: ${metadata.location}`);
      console.log(`🏷️ Storage Class: ${metadata.storageClass}`);
      return true;
    } catch (error) {
      console.error('❌ Bucket permissions check failed:', error.message);
      throw error;
    }
  }

  async testFileUpload() {
    const testContent = 'This is a test file for Theater Canteen GCS integration';
    const fileName = 'test-file.txt';
    
    try {
      const file = this.bucket.file(fileName);
      await file.save(testContent, {
        metadata: {
          contentType: 'text/plain',
          metadata: {
            uploadedBy: 'theater-canteen-system',
            testFile: 'true'
          }
        }
      });
      
      console.log('✅ File upload test passed');
      return fileName;
    } catch (error) {
      console.error('❌ File upload test failed:', error.message);
      throw error;
    }
  }

  async testFileDownload() {
    const fileName = 'test-file.txt';
    
    try {
      const file = this.bucket.file(fileName);
      const [contents] = await file.download();
      
      console.log('✅ File download test passed');
      console.log(`📄 Downloaded content: ${contents.toString()}`);
      return contents.toString();
    } catch (error) {
      console.error('❌ File download test failed:', error.message);
      throw error;
    }
  }

  async testFileDelete() {
    const fileName = 'test-file.txt';
    
    try {
      const file = this.bucket.file(fileName);
      await file.delete();
      
      console.log('✅ File deletion test passed');
      return true;
    } catch (error) {
      console.error('❌ File deletion test failed:', error.message);
      throw error;
    }
  }

  async listFiles() {
    try {
      const [files] = await this.bucket.getFiles();
      console.log('📁 Files in bucket:');
      files.forEach(file => {
        console.log(`  - ${file.name}`);
      });
      return files.map(file => file.name);
    } catch (error) {
      console.error('❌ Failed to list files:', error.message);
      throw error;
    }
  }
}

// Test configuration
const testConfig = {
  projectId: 'fit-galaxy-472209-s4',
  bucketName: 'theater-canteen-test-bucket',
  region: 'us-central1',
  keyFilename: './config/gcs-service-account.json'
};

// Run tests if script is executed directly
if (require.main === module) {
  const gcsTest = new GCSTestSuite(testConfig);
  
  gcsTest.testConnection()
    .then(result => {
      console.log('\n📊 Test Results:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 Test Suite Error:', error);
      process.exit(1);
    });
}

module.exports = GCSTestSuite;