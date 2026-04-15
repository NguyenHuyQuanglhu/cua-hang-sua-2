import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.join(__dirname, '../.env') });

import { query } from '../src/db';

async function fixRecentPendingOrders() {
  try {
    console.log('🔧 Fixing recent paid orders with pending status...\n');

    // Find paid orders that are still pending (last 7 days to be safe)
    const paidPendingOrders = await query(`
      SELECT 
        id,
        invoice_number,
        customer_payment,
        final_amount,
        transaction_date,
        created_at
      FROM Sales 
      WHERE status = 'pending' 
        AND customer_payment > 0
        AND transaction_date >= DATEADD(day, -7, GETDATE())
      ORDER BY transaction_date DESC
    `);

    console.log(`📊 Found ${paidPendingOrders.length} paid orders with pending status:`);

    if (paidPendingOrders.length === 0) {
      console.log('✅ No paid pending orders found!');
      return;
    }

    // Fix each order
    for (const order of paidPendingOrders as any[]) {
      console.log(`🔨 Fixing: ${order.invoice_number}`);
      console.log(`   Payment: ${order.customer_payment}/${order.final_amount}`);
      console.log(`   Date: ${order.transaction_date}`);

      try {
        // Update status to processed
        await query(`
          UPDATE Sales 
          SET 
            status = 'processed',
            updated_at = GETDATE()
          WHERE id = @saleId
        `, { saleId: order.id });

        console.log(`   ✅ Updated to 'processed' status`);

      } catch (error) {
        console.error(`   ❌ Error fixing ${order.invoice_number}:`, error);
      }
    }

    // Verify the fix
    console.log(`\n🔍 Verifying fixes...`);
    
    const remainingPending = await query(`
      SELECT COUNT(*) as count
      FROM Sales 
      WHERE status = 'pending' 
        AND customer_payment > 0
        AND transaction_date >= DATEADD(day, -7, GETDATE())
    `);

    const remainingCount = (remainingPending as any[])[0]?.count || 0;
    
    if (remainingCount === 0) {
      console.log(`✅ All recent paid orders now have 'processed' status!`);
    } else {
      console.log(`⚠️  ${remainingCount} paid orders still have pending status.`);
    }

    // Show recent orders status
    console.log(`\n📊 Recent Orders Status (last 24 hours):`);
    
    const recentOrders = await query(`
      SELECT 
        invoice_number,
        status,
        customer_payment,
        final_amount,
        transaction_date
      FROM Sales 
      WHERE transaction_date >= DATEADD(hour, -24, GETDATE())
      ORDER BY transaction_date DESC
    `);

    (recentOrders as any[]).forEach((order: any, index: number) => {
      const isPaid = order.customer_payment > 0;
      const statusIcon = order.status === 'processed' ? '✅' : 
                        order.status === 'pending' ? (isPaid ? '🚨' : '⚠️') : '❓';
      
      console.log(`  ${statusIcon} ${order.invoice_number}: ${order.status} (${order.customer_payment}/${order.final_amount})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

fixRecentPendingOrders()
  .then(() => {
    console.log('\n✅ Fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  });