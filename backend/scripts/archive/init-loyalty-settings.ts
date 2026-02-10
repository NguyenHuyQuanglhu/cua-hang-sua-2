import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import { getConnection } from '../src/db/connection';

/**
 * Script to initialize loyalty settings for all stores
 */

async function initLoyaltySettings() {
  console.log('🚀 Initializing loyalty settings...\n');

  try {
    const pool = await getConnection();

    // Get all stores
    const stores = await pool.request().query(`
      SELECT id, name FROM Stores WHERE status = 'active'
    `);

    console.log(`Found ${stores.recordset.length} active stores\n`);

    for (const store of stores.recordset) {
      // Check if loyalty settings exist
      const existing = await pool.request()
        .input('storeId', store.id)
        .query(`
          SELECT id FROM LoyaltyPointsSettings WHERE store_id = @storeId
        `);

      if (existing.recordset.length === 0) {
        // Create default loyalty settings
        await pool.request()
          .input('id', crypto.randomUUID())
          .input('storeId', store.id)
          .query(`
            INSERT INTO LoyaltyPointsSettings 
            (id, store_id, enabled, earn_rate, redeem_rate, min_points_to_redeem, max_redeem_percentage, created_at, updated_at)
            VALUES 
            (@id, @storeId, 1, 0.00001, 1000, 100, 50, GETDATE(), GETDATE())
          `);
        console.log(`✅ Created loyalty settings for: ${store.name}`);
      } else {
        console.log(`⏭️  Skipped (already exists): ${store.name}`);
      }
    }

    console.log('\n✅ Initialization completed!\n');

  } catch (error) {
    console.error('❌ Initialization failed:', error);
    throw error;
  }
}

initLoyaltySettings()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
