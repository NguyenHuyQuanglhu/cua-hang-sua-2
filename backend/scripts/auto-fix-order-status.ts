
import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.join(__dirname, '../.env') });

import { query } from '../src/db';

async function autoFixOrderStatus() {
  try {
    // Fix paid orders that are still pending (last hour only)
    const result = await query(`
      UPDATE Sales 
      SET 
        status = 'processed',
        updated_at = GETDATE()
      WHERE status = 'pending' 
        AND customer_payment > 0
        AND customer_payment >= final_amount
        AND created_at >= DATEADD(hour, -1, GETDATE())
    `);

    const rowsAffected = (result as any)?.rowsAffected || 0;
    
    if (rowsAffected > 0) {
      console.log(`[${new Date().toISOString()}] Auto-fixed ${rowsAffected} order status(es)`);
    }

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Auto-fix error:`, error);
  }
}

// Run immediately
autoFixOrderStatus();
