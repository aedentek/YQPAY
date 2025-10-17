/**
 * Fix manager user and add 20 categories - Simple version
 */

const mongoose = require('mongoose');
const THEATER_ID = '68ed25e6962cb3e997acc163';

const FOOD_CATEGORIES = [
  { name: 'Burgers', description: 'Juicy burgers with fresh ingredients', imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500' },
  { name: 'Pizza', description: 'Hot and cheesy pizzas', imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500' },
  { name: 'French Fries', description: 'Crispy golden fries', imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500' },
  { name: 'Hot Dogs', description: 'Classic hot dogs', imageUrl: 'https://images.unsplash.com/photo-1612392062798-2394d45aaf5a?w=500' },
  { name: 'Sandwiches', description: 'Freshly made sandwiches', imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500' },
  { name: 'Nachos', description: 'Loaded nachos with cheese', imageUrl: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=500' },
  { name: 'Popcorn', description: 'Fresh theater popcorn', imageUrl: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=500' },
  { name: 'Ice Cream', description: 'Cool creamy ice cream', imageUrl: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=500' },
  { name: 'Soft Drinks', description: 'Refreshing beverages', imageUrl: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=500' },
  { name: 'Coffee', description: 'Hot fresh coffee', imageUrl: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=500' },
  { name: 'Milkshakes', description: 'Thick creamy milkshakes', imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500' },
  { name: 'Chicken Wings', description: 'Crispy chicken wings', imageUrl: 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=500' },
  { name: 'Tacos', description: 'Mexican style tacos', imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500' },
  { name: 'Pasta', description: 'Italian pasta dishes', imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=500' },
  { name: 'Salads', description: 'Fresh healthy salads', imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500' },
  { name: 'Donuts', description: 'Sweet glazed donuts', imageUrl: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=500' },
  { name: 'Cookies', description: 'Freshly baked cookies', imageUrl: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500' },
  { name: 'Wraps', description: 'Rolled wraps with fillings', imageUrl: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=500' },
  { name: 'Pretzels', description: 'Soft pretzels with salt', imageUrl: 'https://images.unsplash.com/photo-1558326567-98ae2405596b?w=500' },
  { name: 'Energy Drinks', description: 'Energy boost drinks', imageUrl: 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=500' }
];

(async () => {
  try {
    console.log('🚀 SETUP: Manager User + 20 Categories');
    console.log('='.repeat(60));

    await mongoose.connect('mongodb://localhost:27017/theater_canteen_db');
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Fix manager user
    console.log('📋 Step 1: Fix Manager User');
    const result = await db.collection('theaterusers').updateOne(
      { username: 'manager' },
      { 
        $set: { 
          theater: new mongoose.Types.ObjectId(THEATER_ID),
          theaterId: new mongoose.Types.ObjectId(THEATER_ID)
        } 
      }
    );
    console.log(`   ${result.modifiedCount > 0 ? '✅ Updated' : '✓ Already set'} manager theater\n`);

    // Add categories
    console.log('📋 Step 2: Add 20 Categories');
    let added = 0, skipped = 0;

    for (const cat of FOOD_CATEGORIES) {
      const exists = await db.collection('categories').findOne({
        name: cat.name,
        theater: new mongoose.Types.ObjectId(THEATER_ID)
      });

      if (exists) {
        skipped++;
        continue;
      }

      await db.collection('categories').insertOne({
        name: cat.name,
        description: cat.description,
        theater: new mongoose.Types.ObjectId(THEATER_ID),
        theaterId: new mongoose.Types.ObjectId(THEATER_ID),
        imageUrl: cat.imageUrl,
        isActive: true,
        sortOrder: added,
        slug: cat.name.toLowerCase().replace(/\s+/g, '-'),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`   ✅ ${cat.name}`);
      added++;
    }

    console.log(`\n📊 Added: ${added}, Skipped: ${skipped}`);
    
    const total = await db.collection('categories').countDocuments({ 
      theater: new mongoose.Types.ObjectId(THEATER_ID) 
    });
    console.log(`✅ Total categories: ${total}\n`);

    console.log('='.repeat(60));
    console.log('✅ SETUP COMPLETE!');
    console.log('🎯 Now: Refresh browser and login as manager');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
})();
