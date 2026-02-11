import 'dotenv/config';
import { query } from '../src/db';

/**
 * Script to delete purchase orders without supplier
 * These are sample/invalid data that should be removed
 */

async function deletePurchasesWithoutSupplier() {
  try {
    console.log('🔍 Finding purchase orders without supplier...');

    // Find all purchases without supplier
    const purchasesWithoutSupplier = await query(
      `SELECT id, order_number, import_date, total_amount 
       FROM PurchaseOrders 
       WHERE supplier_id IS NULL`,
      {}
    );

    console.log(`📊 Found ${purchasesWithoutSupplier.length} purchase orders without supplier`);

    if (purchasesWithoutSupplier.length === 0) {
      console.log('✅ No purchase orders to delete');
      return;
    }

    // Display the purchases to be deleted
    console.log('\n📋 Purchase orders to be deleted:');
    purchasesWithoutSupplier.forEach((p: any) => {
      console.log(`  - ${p.order_number} | ${new Date(p.import_date).toLocaleDateString()} | ${p.total_amount.toLocaleString()} VND`);
    });

    console.log('\n🗑️  Deleting purchase orders and related data...');

    // Delete in correct order to respect foreign key constraints
    for (const purchase of purchasesWithoutSupplier) {
      const purchaseId = purchase.id;
      
      // 1. Delete purchase lots
      await query(
        `DELETE FROM PurchaseLots WHERE purchase_order_id = @purchaseId`,
        { purchaseId }
      );
      console.log(`  ✓ Deleted purchase lots for ${purchase.order_number}`);

      // 2. Delete purchase order items
      await query(
        `DELETE FROM PurchaseOrderItems WHERE purchase_order_id = @purchaseId`,
        { purchaseId }
      );
      console.log(`  ✓ Deleted purchase items for ${purchase.order_number}`);

      // 3. Delete supplier payments (if any)
      await query(
        `DELETE FROM SupplierPayments WHERE purchase_id = @purchaseId`,
        { purchaseId }
      );
      console.log(`  ✓ Deleted supplier payments for ${purchase.order_number}`);

      // 4. Delete the purchase order itself
      await query(
        `DELETE FROM PurchaseOrders WHERE id = @purchaseId`,
        { purchaseId }
      );
      console.log(`  ✓ Deleted purchase order ${purchase.order_number}`);
    }

    console.log(`\n✅ Successfully deleted ${purchasesWithoutSupplier.length} purchase orders without supplier`);
    
    // Verify deletion
    const remaining = await query(
      `SELECT COUNT(*) as count FROM PurchaseOrders WHERE supplier_id IS NULL`,
      {}
    );
    
    console.log(`\n📊 Remaining purchase orders without supplier: ${remaining[0].count}`);

  } catch (error) {
    console.error('❌ Error deleting purchases:', error);
    throw error;
  }
}

// Run the script
deletePurchasesWithoutSupplier()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
