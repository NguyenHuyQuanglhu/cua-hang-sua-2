import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import { getConnection } from '../src/db/connection';

/**
 * Script to check settings in database
 */

async function checkSettings() {
  console.log('🔍 Checking Settings...\n');

  try {
    const pool = await getConnection();

    // Get all settings
    const settings = await pool.request().query(`
      SELECT 
        s.id,
        s.store_id,
        st.name as store_name,
        s.settings,
        s.created_at,
        s.updated_at
      FROM Settings s
      JOIN Stores st ON s.store_id = st.id
    `);

    console.log(`Found ${settings.recordset.length} settings records\n`);

    for (const setting of settings.recordset) {
      console.log(`📋 Store: ${setting.store_name}`);
      console.log(`   ID: ${setting.id}`);
      console.log(`   Store ID: ${setting.store_id}`);
      console.log(`   Created: ${new Date(setting.created_at).toLocaleString('vi-VN')}`);
      console.log(`   Updated: ${new Date(setting.updated_at).toLocaleString('vi-VN')}`);
      
      // Parse settings
      let settingsData = setting.settings;
      if (typeof settingsData === 'string') {
        try {
          settingsData = JSON.parse(settingsData);
        } catch (e) {
          console.log('   ⚠️  Failed to parse settings JSON');
        }
      }
      
      console.log('\n   Settings Data:');
      console.log(`   - Company Name: ${settingsData?.companyName || 'N/A'}`);
      console.log(`   - Company Address: ${settingsData?.companyAddress || 'N/A'}`);
      console.log(`   - Company Phone: ${settingsData?.companyPhone || 'N/A'}`);
      console.log(`   - Invoice Format: ${settingsData?.invoiceFormat || 'N/A'}`);
      console.log(`   - VAT Rate: ${settingsData?.vatRate || 'N/A'}%`);
      console.log('');
    }

    if (settings.recordset.length === 0) {
      console.log('⚠️  No settings found in database!');
      console.log('   Settings may not be saved properly.\n');
    }

    console.log('✅ Check completed!\n');

  } catch (error) {
    console.error('❌ Check failed:', error);
    throw error;
  }
}

checkSettings()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
