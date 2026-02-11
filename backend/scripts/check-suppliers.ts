import 'dotenv/config';
import { query } from '../src/db';

async function checkSuppliers() {
  try {
    console.log('🔍 Checking suppliers in database...\n');

    const suppliers = await query(
      `SELECT id, name, phone, email, address, store_id 
       FROM Suppliers 
       ORDER BY name`,
      {}
    );

    console.log(`📊 Total suppliers: ${suppliers.length}\n`);

    if (suppliers.length === 0) {
      console.log('⚠️  No suppliers found in database!');
      console.log('💡 You need to create suppliers first.');
      console.log('   Go to: Nhà cung cấp → Thêm nhà cung cấp\n');
    } else {
      console.log('📋 Suppliers list:\n');
      suppliers.forEach((s: any, index: number) => {
        console.log(`${index + 1}. ${s.name}`);
        console.log(`   ID: ${s.id}`);
        console.log(`   Phone: ${s.phone || 'N/A'}`);
        console.log(`   Email: ${s.email || 'N/A'}`);
        console.log(`   Store ID: ${s.store_id}`);
        console.log('');
      });
    }

    // Check by store
    const byStore = await query(
      `SELECT store_id, COUNT(*) as count 
       FROM Suppliers 
       GROUP BY store_id`,
      {}
    );

    if (byStore.length > 0) {
      console.log('📊 Suppliers by store:');
      byStore.forEach((s: any) => {
        console.log(`   Store ${s.store_id}: ${s.count} suppliers`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkSuppliers()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
