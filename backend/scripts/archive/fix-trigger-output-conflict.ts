import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  server: process.env.DB_SERVER || '',
  database: process.env.DB_NAME || '',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

async function fixTriggerOutputConflict() {
  try {
    await sql.connect(config);
    console.log('🔧 Sửa trigger để tương thích với OUTPUT clause...\n');

    // Drop the problematic trigger
    console.log('1. Xóa trigger cũ...');
    await sql.query`
      IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_PurchaseOrders_AutoUpdateTimestamp')
      DROP TRIGGER trg_PurchaseOrders_AutoUpdateTimestamp
    `;
    console.log('   ✓ Đã xóa trigger cũ');

    // Don't recreate the trigger - let the application handle updated_at
    console.log('\n2. Không tạo lại trigger (để tránh xung đột với OUTPUT)');
    console.log('   ✓ Application sẽ tự động set updated_at');

    // Keep the payment trigger but make it simpler
    console.log('\n3. Đơn giản hóa payment trigger...');
    await sql.query`
      IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_SupplierPayments_UpdatePurchaseOrder')
      DROP TRIGGER trg_SupplierPayments_UpdatePurchaseOrder
    `;

    // Recreate with simpler logic that doesn't conflict
    await sql.query`
      CREATE TRIGGER trg_SupplierPayments_UpdatePurchaseOrder
      ON SupplierPayments
      AFTER INSERT, DELETE
      AS
      BEGIN
        SET NOCOUNT ON;
        
        -- Get affected purchase order IDs
        DECLARE @affected_purchases TABLE (purchase_id UNIQUEIDENTIFIER);
        
        INSERT INTO @affected_purchases
        SELECT DISTINCT purchase_id FROM inserted WHERE purchase_id IS NOT NULL
        UNION
        SELECT DISTINCT purchase_id FROM deleted WHERE purchase_id IS NOT NULL;
        
        -- Update each affected purchase order
        UPDATE po
        SET 
          po.paid_amount = ISNULL(payments.total_paid, 0),
          po.remaining_debt = po.total_amount - ISNULL(payments.total_paid, 0),
          po.payment_status = CASE
            WHEN po.total_amount - ISNULL(payments.total_paid, 0) <= 0 THEN 'paid'
            WHEN ISNULL(payments.total_paid, 0) > 0 THEN 'partial'
            ELSE 'unpaid'
          END,
          po.updated_at = GETDATE()
        FROM PurchaseOrders po
        LEFT JOIN (
          SELECT purchase_id, SUM(amount) as total_paid
          FROM SupplierPayments
          WHERE purchase_id IS NOT NULL
          GROUP BY purchase_id
        ) payments ON po.id = payments.purchase_id
        WHERE po.id IN (SELECT purchase_id FROM @affected_purchases)
      END
    `;
    console.log('   ✓ Đã tạo lại payment trigger (đơn giản hơn)');

    console.log('\n✅ Hoàn tất! Bây giờ có thể UPDATE đơn hàng bình thường.');
    console.log('\n📋 Cách hoạt động:');
    console.log('   • UPDATE đơn hàng: Application tự set updated_at');
    console.log('   • Thanh toán: Trigger tự động cập nhật công nợ');
    console.log('   • Không còn xung đột OUTPUT clause');

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await sql.close();
  }
}

fixTriggerOutputConflict();
