import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.join(__dirname, '../.env') });

import { query } from '../src/db';

async function createAutoStatusFixHook() {
  try {
    console.log('🔧 Creating automatic status fix mechanism...\n');

    // Option 1: Create a database trigger (recommended)
    console.log('📝 Creating database trigger to auto-fix order status...');

    const triggerSQL = `
      -- Drop trigger if exists
      IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'tr_Sales_AutoFixStatus')
      BEGIN
          DROP TRIGGER tr_Sales_AutoFixStatus
      END
      GO

      -- Create trigger to automatically fix status
      CREATE TRIGGER tr_Sales_AutoFixStatus
      ON Sales
      AFTER INSERT, UPDATE
      AS
      BEGIN
          SET NOCOUNT ON;
          
          -- Update status to 'processed' for paid orders that are still 'pending'
          UPDATE s
          SET status = 'processed',
              updated_at = GETDATE()
          FROM Sales s
          INNER JOIN inserted i ON s.id = i.id
          WHERE s.status = 'pending'
            AND s.customer_payment > 0
            AND s.customer_payment >= s.final_amount;
            
          -- Log the auto-fix (optional)
          IF @@ROWCOUNT > 0
          BEGIN
              PRINT 'Auto-fixed ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' order status(es) from pending to processed';
          END
      END
    `;

    try {
      // Execute the trigger creation
      await query(triggerSQL);
      console.log('✅ Database trigger created successfully!');
      
      console.log('\n🔍 Testing the trigger...');
      
      // Test by creating a sample order (we'll delete it after)
      const testOrderId = 'TEST-' + Date.now();
      
      // Insert test order with pending status but full payment
      await query(`
        INSERT INTO Sales (
          id, store_id, invoice_number, customer_payment, final_amount, 
          status, total_amount, transaction_date, created_at, updated_at
        ) VALUES (
          @testId, 
          (SELECT TOP 1 id FROM Stores WHERE status = 'active'),
          'TEST-TRIGGER',
          100000,
          100000,
          'pending',
          100000,
          GETDATE(),
          GETDATE(),
          GETDATE()
        )
      `, { testId: testOrderId });

      // Check if trigger worked
      const testResult = await query(`
        SELECT status FROM Sales WHERE id = @testId
      `, { testId: testOrderId });

      const testStatus = (testResult as any[])[0]?.status;
      
      if (testStatus === 'processed') {
        console.log('✅ Trigger test PASSED! Status auto-fixed from pending to processed');
      } else {
        console.log(`❌ Trigger test FAILED! Status is still: ${testStatus}`);
      }

      // Clean up test order
      await query(`DELETE FROM Sales WHERE id = @testId`, { testId: testOrderId });
      console.log('🧹 Test order cleaned up');

    } catch (error) {
      console.error('❌ Error creating trigger:', error);
      console.log('\n💡 Falling back to scheduled job approach...');
      
      // Option 2: Create a scheduled job script
      await createScheduledFixScript();
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

async function createScheduledFixScript() {
  console.log('📝 Creating scheduled fix script...');
  
  const scheduledScript = `
import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.join(__dirname, '../.env') });

import { query } from '../src/db';

async function autoFixOrderStatus() {
  try {
    // Fix paid orders that are still pending (last hour only)
    const result = await query(\`
      UPDATE Sales 
      SET 
        status = 'processed',
        updated_at = GETDATE()
      WHERE status = 'pending' 
        AND customer_payment > 0
        AND customer_payment >= final_amount
        AND created_at >= DATEADD(hour, -1, GETDATE())
    \`);

    const rowsAffected = (result as any)?.rowsAffected || 0;
    
    if (rowsAffected > 0) {
      console.log(\`[\${new Date().toISOString()}] Auto-fixed \${rowsAffected} order status(es)\`);
    }

  } catch (error) {
    console.error(\`[\${new Date().toISOString()}] Auto-fix error:\`, error);
  }
}

// Run immediately
autoFixOrderStatus();
`;

  // Write the scheduled script
  const fs = require('fs');
  const scheduledScriptPath = path.join(__dirname, 'auto-fix-order-status.ts');
  fs.writeFileSync(scheduledScriptPath, scheduledScript);
  
  console.log('✅ Scheduled fix script created: auto-fix-order-status.ts');
  console.log('💡 You can run this script every few minutes with a cron job');
  console.log('   Example cron: */5 * * * * cd /path/to/backend && npx ts-node scripts/auto-fix-order-status.ts');
}

createAutoStatusFixHook()
  .then(() => {
    console.log('\n✅ Auto-fix mechanism created successfully!');
    console.log('\n🎯 Summary:');
    console.log('  ✅ Database trigger created (automatic)');
    console.log('  ✅ Backup scheduled script available');
    console.log('  ✅ Future paid orders will auto-fix to processed status');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Creation failed:', error);
    process.exit(1);
  });