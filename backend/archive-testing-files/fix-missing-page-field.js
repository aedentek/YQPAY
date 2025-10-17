const mongoose = require('mongoose');

async function fixMissingPage() {
  try {
    await mongoose.connect('mongodb://localhost:27017/theater_canteen_db');
    
    // Find the problematic page
    const page = await mongoose.connection.db.collection('pageaccesses')
      .findOne({pageName: 'TheaterReports'});
    
    if (!page) {
      console.log('❌ Page not found');
      process.exit(1);
    }
    
    console.log('Found problematic page:');
    console.log(JSON.stringify(page, null, 2));
    
    if (!page.page || page.page === '') {
      console.log('\n🔧 FIX: Setting page field to "TheaterReports"...');
      
      const result = await mongoose.connection.db.collection('pageaccesses')
        .updateOne(
          { _id: page._id },
          { $set: { page: 'TheaterReports' } }
        );
      
      console.log(`✅ Updated: ${result.modifiedCount} document`);
      
      // Verify
      const after = await mongoose.connection.db.collection('pageaccesses')
        .findOne({ _id: page._id });
      
      console.log('\n✅ After fix:');
      console.log(`page: '${after.page}'`);
      console.log(`pageName: '${after.pageName}'`);
      console.log(`isActive: ${after.isActive}`);
      
      // Verify all pages now have the 'page' field
      const all = await mongoose.connection.db.collection('pageaccesses')
        .find({}).toArray();
      
      const missing = all.filter(p => !p.page);
      
      if (missing.length === 0) {
        console.log('\n🎉 SUCCESS! All pages now have the "page" field');
      } else {
        console.log(`\n⚠️ Still ${missing.length} pages missing the "page" field`);
      }
    } else {
      console.log('\n✅ Page already has a valid "page" field:', page.page);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixMissingPage();
