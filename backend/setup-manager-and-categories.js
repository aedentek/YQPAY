/**
 * Fix manager user theater assignment and add 20 food categories
 */

const mongoose = require('mongoose');
const path = require('path');
const https = require('https');
const fs = require('fs');
require('dotenv').config({ path: '.env' });

const THEATER_ID = '68ed25e6962cb3e997acc163';
const CATEGORIES_DIR = path.join(__dirname, 'category-images');

// Ensure directory exists
if (!fs.existsSync(CATEGORIES_DIR)) {
  fs.mkdirSync(CATEGORIES_DIR, { recursive: true });
}

console.log('🚀 FIXING MANAGER USER & ADDING 20 CATEGORIES');
console.log('='.repeat(70));

/**
 * Download image from URL
 */
async function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(CATEGORIES_DIR, filename);
    const file = fs.createWriteStream(filePath);
    
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filePath);
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

/**
 * 20 Food Categories with real image URLs
 */
const FOOD_CATEGORIES = [
  {
    name: 'Burgers',
    description: 'Juicy burgers with fresh ingredients',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500',
    isActive: true
  },
  {
    name: 'Pizza',
    description: 'Hot and cheesy pizzas with various toppings',
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500',
    isActive: true
  },
  {
    name: 'French Fries',
    description: 'Crispy golden french fries',
    imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500',
    isActive: true
  },
  {
    name: 'Hot Dogs',
    description: 'Classic hot dogs with condiments',
    imageUrl: 'https://images.unsplash.com/photo-1612392062798-2394d45aaf5a?w=500',
    isActive: true
  },
  {
    name: 'Sandwiches',
    description: 'Freshly made sandwiches',
    imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500',
    isActive: true
  },
  {
    name: 'Nachos',
    description: 'Loaded nachos with cheese and toppings',
    imageUrl: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=500',
    isActive: true
  },
  {
    name: 'Popcorn',
    description: 'Freshly popped theater popcorn',
    imageUrl: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=500',
    isActive: true
  },
  {
    name: 'Ice Cream',
    description: 'Cool and creamy ice cream',
    imageUrl: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=500',
    isActive: true
  },
  {
    name: 'Soft Drinks',
    description: 'Refreshing cold beverages',
    imageUrl: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=500',
    isActive: true
  },
  {
    name: 'Coffee',
    description: 'Hot and fresh coffee',
    imageUrl: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=500',
    isActive: true
  },
  {
    name: 'Milkshakes',
    description: 'Thick and creamy milkshakes',
    imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500',
    isActive: true
  },
  {
    name: 'Chicken Wings',
    description: 'Crispy chicken wings with sauces',
    imageUrl: 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=500',
    isActive: true
  },
  {
    name: 'Tacos',
    description: 'Mexican style tacos',
    imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500',
    isActive: true
  },
  {
    name: 'Pasta',
    description: 'Italian pasta dishes',
    imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=500',
    isActive: true
  },
  {
    name: 'Salads',
    description: 'Fresh and healthy salads',
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500',
    isActive: true
  },
  {
    name: 'Donuts',
    description: 'Sweet and glazed donuts',
    imageUrl: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=500',
    isActive: true
  },
  {
    name: 'Cookies',
    description: 'Freshly baked cookies',
    imageUrl: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500',
    isActive: true
  },
  {
    name: 'Wraps',
    description: 'Rolled wraps with fillings',
    imageUrl: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=500',
    isActive: true
  },
  {
    name: 'Pretzels',
    description: 'Soft pretzels with salt',
    imageUrl: 'https://images.unsplash.com/photo-1558326567-98ae2405596b?w=500',
    isActive: true
  },
  {
    name: 'Energy Drinks',
    description: 'Boost your energy drinks',
    imageUrl: 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=500',
    isActive: true
  }
];

async function run() {
  try {
    // Connect to MongoDB
    console.log('\n🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/theater_canteen_db');
    console.log('✅ Connected to database');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('theaterusers');
    const categoriesCollection = db.collection('categories');

    // Step 1: Fix manager user
    console.log('\n📋 Step 1: Checking manager user...');
    const managerUser = await usersCollection.findOne({ username: 'manager' });
    
    if (!managerUser) {
      console.error('❌ Manager user not found!');
    } else {
      console.log('✅ Manager user found:');
      console.log(`   Username: ${managerUser.username}`);
      console.log(`   Email: ${managerUser.email}`);
      console.log(`   Role: ${managerUser.role}`);
      console.log(`   Current Theater: ${managerUser.theater || managerUser.theaterId || 'NOT SET'}`);
      
      // Update theater if not set or incorrect
      if (!managerUser.theater || String(managerUser.theater) !== THEATER_ID) {
        console.log(`\n🔧 Updating manager's theater to: ${THEATER_ID}`);
        await usersCollection.updateOne(
          { _id: managerUser._id },
          { 
            $set: { 
              theater: mongoose.Types.ObjectId(THEATER_ID),
              theaterId: mongoose.Types.ObjectId(THEATER_ID)
            } 
          }
        );
        console.log('✅ Manager theater updated successfully!');
      } else {
        console.log('✅ Manager theater is already correct');
      }
    }

    // Step 2: Check existing categories
    console.log('\n📋 Step 2: Checking existing categories...');
    const existingCategories = await categoriesCollection.find({ theater: mongoose.Types.ObjectId(THEATER_ID) }).toArray();
    console.log(`   Found ${existingCategories.length} existing categories`);
    
    if (existingCategories.length > 0) {
      console.log('   Existing categories:');
      existingCategories.forEach((cat, i) => {
        console.log(`   ${i + 1}. ${cat.name}`);
      });
    }

    // Step 3: Add 20 new categories
    console.log('\n📋 Step 3: Adding 20 food categories...');
    console.log('   Using real image URLs from Unsplash');
    
    let added = 0;
    let skipped = 0;

    for (const category of FOOD_CATEGORIES) {
      // Check if category already exists
      const exists = await categoriesCollection.findOne({
        name: category.name,
        theater: mongoose.Types.ObjectId(THEATER_ID)
      });

      if (exists) {
        console.log(`   ⏭️  Skipped: ${category.name} (already exists)`);
        skipped++;
        continue;
      }

      // Create category
      const categoryDoc = {
        name: category.name,
        description: category.description,
        theater: mongoose.Types.ObjectId(THEATER_ID),
        theaterId: mongoose.Types.ObjectId(THEATER_ID),
        imageUrl: category.imageUrl,
        isActive: category.isActive,
        sortOrder: added,
        slug: category.name.toLowerCase().replace(/\s+/g, '-'),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await categoriesCollection.insertOne(categoryDoc);
      console.log(`   ✅ Added: ${category.name}`);
      added++;
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Added: ${added} categories`);
    console.log(`   ⏭️  Skipped: ${skipped} categories`);
    console.log(`   📦 Total categories in theater: ${existingCategories.length + added}`);

    // Step 4: Verify final count
    console.log('\n📋 Step 4: Verifying all categories...');
    const allCategories = await categoriesCollection.find({ 
      theater: mongoose.Types.ObjectId(THEATER_ID) 
    }).toArray();
    
    console.log(`\n✅ Final category list (${allCategories.length} total):`);
    allCategories.forEach((cat, i) => {
      console.log(`   ${i + 1}. ${cat.name} - ${cat.imageUrl ? '🖼️  Has Image' : '📭 No Image'}`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('✅ SETUP COMPLETE!');
    console.log('='.repeat(70));
    console.log('\n🎯 Next Steps:');
    console.log('   1. Refresh the browser (Ctrl+F5)');
    console.log('   2. Login as manager (manager / admin123)');
    console.log('   3. Navigate to Theater Categories');
    console.log('   4. You should see all 20 categories with images');
    console.log('   5. Try deleting 5 categories to test CRUD');
    console.log('   6. Try adding a new category to test create');
    console.log('   7. Try editing a category to test update');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

run().catch(console.error);
