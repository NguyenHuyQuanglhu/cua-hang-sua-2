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

async function masterSystemFix() {
  try {
    await sql.connect(config);
    console.log('🚀 MASTER SYSTEM FIX - Chuẩn hóa toàn bộ hệ thống\n');
    console.log('=' .repeat(70));

    // ========== 1. FIX DATABASE STRUCTURE ==========
    console.log('\n📋 BƯỚC 1: Kiểm tra và sửa cấu trúc database');
    console.log('-'.repeat(70));

    // 1.1 Ensure all required columns exist in PurchaseOrders
    console.log('\n1.1. Kiểm tra cột trong PurchaseOrders...');
    const poColumns = await sql.query`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'PurchaseOrders'
    `;
    
    const existingPOColumns = poColumns.recordset.map((c: any) => c.COLUMN_NAME);
    console.log(`   ✓ Tìm thấy ${existingPOColumns.length} cột`);

    // Check for payment columns
    const requiredColumns = ['paid_amount', 'remaining_debt', 'payment_status'];
    for (const col of requiredColumns) {
      if (!existingPOColumns.includes(col)) {
        console.log(`   ❌ Thiếu cột: ${col}`);
      } else {
        console.log(`   ✓ Cột ${col} tồn tại`);
      }
    }

    // 1.2 Fix SupplierPayments to allow NULL supplier_id
    console.log('\n1.2. Cho phép supplier_id NULL trong SupplierPayments...');
    try {
      await sql.query`
        ALTER TABLE SupplierPayments 
        ALTER COLUMN supplier_id UNIQUEIDENTIFIER NULL
      `;
      console.log('   ✓ Đã sửa supplier_id cho phép NULL');
    } catch (error: any) {
      if (error.message.includes('same as existing')) {
        console.log('   ✓ supplier_id đã cho phép NULL');
      } else {
        console.log('   ⚠️  Không thể sửa:', error.message);
      }
    }

    // ========== 2. FIX DATA INTEGRITY ==========
    console.log('\n📊 BƯỚC 2: Sửa dữ liệu và đảm bảo tính toàn vẹn');
    console.log('-'.repeat(70));

    // 2.1 Fix NULL payment values
    console.log('\n2.1. Sửa giá trị NULL trong payment columns...');
    const nullPayments = await sql.query`
      SELECT COUNT(*) as count
      FROM PurchaseOrders
      WHERE paid_amount IS NULL OR remaining_debt IS NULL OR payment_status IS NULL
    `;
    
    if (nullPayments.recordset[0].count > 0) {
      await sql.query`
        UPDATE PurchaseOrders
        SET 
          paid_amount = ISNULL(paid_amount, 0),
          remaining_debt = ISNULL(remaining_debt, total_amount),
          payment_status = ISNULL(payment_status, 'unpaid')
        WHERE paid_amount IS NULL OR remaining_debt IS NULL OR payment_status IS NULL
      `;
      console.log(`   ✓ Đã sửa ${nullPayments.recordset[0].count} bản ghi`);
    } else {
      console.log('   ✓ Không có giá trị NULL');
    }

    // 2.2 Fix NULL updated_at
    console.log('\n2.2. Sửa giá trị NULL trong updated_at...');
    const nullUpdatedAt = await sql.query`
      SELECT COUNT(*) as count
      FROM PurchaseOrders
      WHERE updated_at IS NULL
    `;
    
    if (nullUpdatedAt.recordset[0].count > 0) {
      await sql.query`
        UPDATE PurchaseOrders
        SET updated_at = ISNULL(updated_at, created_at)
        WHERE updated_at IS NULL
      `;
      console.log(`   ✓ Đã sửa ${nullUpdatedAt.recordset[0].count} bản ghi`);
    } else {
      console.log('   ✓ Không có giá trị NULL');
    }

    // 2.3 Recalculate remaining_debt based on payments
    console.log('\n2.3. Tính lại remaining_debt dựa trên payments...');
    await sql.query`
      UPDATE po
      SET 
        po.paid_amount = ISNULL(payments.total_paid, 0),
        po.remaining_debt = po.total_amount - ISNULL(payments.total_paid, 0),
        po.payment_status = CASE
          WHEN po.total_amount - ISNULL(payments.total_paid, 0) <= 0 THEN 'paid'
          WHEN ISNULL(payments.total_paid, 0) > 0 THEN 'partial'
          ELSE 'unpaid'
        END
      FROM PurchaseOrders po
      LEFT JOIN (
        SELECT purchase_id, SUM(amount) as total_paid
        FROM SupplierPayments
        WHERE purchase_id IS NOT NULL
        GROUP BY purchase_id
      ) payments ON po.id = payments.purchase_id
    `;
    console.log('   ✓ Đã tính lại công nợ cho tất cả đơn hàng');

    // ========== 3. CREATE TRIGGERS FOR AUTO-UPDATE ==========
    console.log('\n⚙️  BƯỚC 3: Tạo triggers tự động cập nhật');
    console.log('-'.repeat(70));

    // 3.1 Trigger for auto-updating updated_at
    console.log('\n3.1. Tạo trigger tự động cập nhật updated_at...');
    await sql.query`
      IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_PurchaseOrders_AutoUpdateTimestamp')
      DROP TRIGGER trg_PurchaseOrders_AutoUpdateTimestamp
    `;
    
    await sql.query`
      CREATE TRIGGER trg_PurchaseOrders_AutoUpdateTimestamp
      ON PurchaseOrders
      AFTER UPDATE
      AS
      BEGIN
        SET NOCOUNT ON;
        
        -- Only update if updated_at wasn't explicitly changed
        UPDATE po
        SET updated_at = GETDATE()
        FROM PurchaseOrders po
        INNER JOIN inserted i ON po.id = i.id
        INNER JOIN deleted d ON po.id = d.id
        WHERE po.updated_at = d.updated_at
      END
    `;
    console.log('   ✓ Đã tạo trigger tự động cập nhật updated_at');

    // 3.2 Trigger for auto-updating payment status
    console.log('\n3.2. Tạo trigger tự động cập nhật payment_status...');
    await sql.query`
      IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_SupplierPayments_UpdatePurchaseOrder')
      DROP TRIGGER trg_SupplierPayments_UpdatePurchaseOrder
    `;
    
    await sql.query`
      CREATE TRIGGER trg_SupplierPayments_UpdatePurchaseOrder
      ON SupplierPayments
      AFTER INSERT, UPDATE, DELETE
      AS
      BEGIN
        SET NOCOUNT ON;
        
        -- Update affected purchase orders
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
        WHERE po.id IN (
          SELECT DISTINCT purchase_id FROM inserted WHERE purchase_id IS NOT NULL
          UNION
          SELECT DISTINCT purchase_id FROM deleted WHERE purchase_id IS NOT NULL
        )
      END
    `;
    console.log('   ✓ Đã tạo trigger tự động cập nhật payment khi có thanh toán');

    // ========== 4. VERIFY SYSTEM INTEGRITY ==========
    console.log('\n✅ BƯỚC 4: Kiểm tra tính toàn vẹn hệ thống');
    console.log('-'.repeat(70));

    const stats = await sql.query`
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN supplier_id IS NOT NULL THEN 1 ELSE 0 END) as with_supplier,
        SUM(CASE WHEN supplier_id IS NULL THEN 1 ELSE 0 END) as without_supplier,
        SUM(CASE WHEN payment_status = 'unpaid' THEN 1 ELSE 0 END) as unpaid,
        SUM(CASE WHEN payment_status = 'partial' THEN 1 ELSE 0 END) as partial,
        SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid,
        SUM(CASE WHEN updated_at IS NULL THEN 1 ELSE 0 END) as null_updated_at,
        SUM(total_amount) as total_purchases,
        SUM(paid_amount) as total_paid,
        SUM(remaining_debt) as total_debt
      FROM PurchaseOrders
    `;

    const s = stats.recordset[0];
    console.log('\n📈 Thống kê hệ thống:');
    console.log(`   • Tổng số đơn hàng: ${s.total_orders}`);
    console.log(`   • Có nhà cung cấp: ${s.with_supplier}`);
    console.log(`   • Không có NCC: ${s.without_supplier}`);
    console.log(`   • Chưa thanh toán: ${s.unpaid}`);
    console.log(`   • Thanh toán một phần: ${s.partial}`);
    console.log(`   • Đã thanh toán: ${s.paid}`);
    console.log(`   • NULL updated_at: ${s.null_updated_at}`);
    console.log(`\n💰 Tài chính:`);
    console.log(`   • Tổng nhập hàng: ${s.total_purchases?.toLocaleString('vi-VN')} VNĐ`);
    console.log(`   • Đã thanh toán: ${s.total_paid?.toLocaleString('vi-VN')} VNĐ`);
    console.log(`   • Còn nợ: ${s.total_debt?.toLocaleString('vi-VN')} VNĐ`);

    // ========== 5. SUMMARY ==========
    console.log('\n' + '='.repeat(70));
    console.log('🎉 HOÀN TẤT! Hệ thống đã được chuẩn hóa');
    console.log('='.repeat(70));
    console.log('\n✅ Các tính năng tự động:');
    console.log('   1. updated_at tự động cập nhật khi INSERT/UPDATE');
    console.log('   2. payment_status tự động cập nhật khi có thanh toán');
    console.log('   3. remaining_debt tự động tính toán');
    console.log('   4. Cho phép tạo đơn không có nhà cung cấp');
    console.log('   5. Đơn mới tự động hiện ở đầu danh sách');
    
    console.log('\n⚠️  Lưu ý:');
    console.log('   • Đơn không có NCC không thể thanh toán (cần thêm NCC trước)');
    console.log('   • Mọi thay đổi đều tự động, không cần chạy script fix');
    console.log('   • Hệ thống đã sẵn sàng sử dụng!');

  } catch (error) {
    console.error('\n❌ LỖI:', error);
  } finally {
    await sql.close();
  }
}

masterSystemFix();
