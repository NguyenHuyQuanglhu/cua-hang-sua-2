import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.join(__dirname, '../.env') });

import { query } from '../src/db';

async function checkRecentOrders() {
  try {
    console.log('🔍 Checking recent orders and their status...\n');

    // Check recent orders (last 24 hours)
    const recentOrders = await query(`
      SELECT 
        invoice_number,
        customer_id,
        transaction_date,
        status,
        customer_payment,
        final_amount,
        remaining_debt,
        created_at,
        updated_at
      FROM Sales 
      WHERE transaction_date >= DATEADD(hour, -24, GETDATE())
      ORDER BY transaction_date DESC
    `);

    console.log(`📊 Found ${recentOrders.length} orders in last 24 hours:`);

    if (recentOrders.length === 0) {
      console.log('No recent orders found.');
      return;
    }

    (recentOrders as any[]).forEach((order: any, index: number) => {
      const isPaid = order.customer_payment > 0;
      const shouldBeProcessed = isPaid;
      const statusIcon = order.status === 'processed' ? '✅' : 
                        order.status === 'pending' ? '⚠️' : '❓';
      
      console.log(`  ${index + 1}. ${statusIcon} ${order.invoice_number}`);
      console.log(`     Status: ${order.status}`);
      console.log(`     Payment: ${order.customer_payment}/${order.final_amount}`);
      console.log(`     Date: ${order.transaction_date}`);
      console.log(`     Created: ${order.created_at}`);
      
      if (isPaid && order.status === 'pending') {
        console.log(`     🚨 ISSUE: Paid order still pending!`);
      }
      console.log('');
    });

    // Check if there are paid orders still pending
    const paidPendingOrders = await query(`
      SELECT COUNT(*) as count
      FROM Sales 
      WHERE status = 'pending' 
        AND customer_payment > 0
        AND transaction_date >= DATEADD(hour, -24, GETDATE())
    `);

    const problemCount = (paidPendingOrders as any[])[0]?.count || 0;
    
    if (problemCount > 0) {
      console.log(`🚨 FOUND ${problemCount} paid orders still marked as pending!`);
      console.log(`💡 This suggests the POS fix may not be working correctly.`);
      
      // Check what status is actually being sent from POS
      console.log(`\n🔍 Let's check the most recent order details:`);
      
      const latestOrder = await query(`
        SELECT TOP 1 *
        FROM Sales 
        WHERE transaction_date >= DATEADD(hour, -24, GETDATE())
        ORDER BY created_at DESC
      `);

      if (latestOrder.length > 0) {
        const order = (latestOrder as any[])[0];
        console.log(`Latest order details:`);
        console.log(`  Invoice: ${order.invoice_number}`);
        console.log(`  Status: ${order.status}`);
        console.log(`  Payment: ${order.customer_payment}`);
        console.log(`  Final Amount: ${order.final_amount}`);
        console.log(`  Created: ${order.created_at}`);
        console.log(`  Updated: ${order.updated_at}`);
      }
    } else {
      console.log(`✅ All recent paid orders have correct status!`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkRecentOrders()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Check failed:', error);
    process.exit(1);
  });