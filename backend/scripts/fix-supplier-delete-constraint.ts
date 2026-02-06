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

async function fixSupplierDeleteConstraint() {
  try {
    await sql.connect(config);
    console.log('🔧 Sửa constraint để cho phép xóa nhà cung cấp...\n');

    // 1. Drop existing foreign key constraints
    console.log('1. Xóa các constraint cũ...');
    
    // Find all FK constraints related to supplier_id
    const constraints = await sql.query`
      SELECT 
        fk.name as constraint_name,
        OBJECT_NAME(fk.parent_object_id) as table_name
      FROM sys.foreign_keys fk
      INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
      INNER JOIN sys.columns c ON fkc.parent_object_id = c.object_id AND fkc.parent_column_id = c.column_id
      WHERE c.name = 'supplier_id'
        AND OBJECT_NAME(fk.referenced_object_id) = 'Suppliers'
    `;

    for (const constraint of constraints.recordset) {
      console.log(`   Dropping ${constraint.constraint_name} from ${constraint.table_name}...`);
      await sql.query`
        ALTER TABLE ${sql.NVarChar(constraint.table_name)}
        DROP CONSTRAINT ${sql.NVarChar(constraint.constraint_name)}
      `.catch((err) => {
        // Use dynamic SQL instead
        return sql.query(`
          ALTER TABLE [${constraint.table_name}]
          DROP CONSTRAINT [${constraint.constraint_name}]
        `);
      });
      console.log(`   ✓ Dropped ${constraint.constraint_name}`);
    }

    // 2. Recreate FK constraints with ON DELETE SET NULL
    console.log('\n2. Tạo lại constraints với ON DELETE SET NULL...');

    // PurchaseOrders
    try {
      await sql.query`
        ALTER TABLE PurchaseOrders
        ADD CONSTRAINT FK_PurchaseOrders_Suppliers
        FOREIGN KEY (supplier_id) REFERENCES Suppliers(id)
        ON DELETE SET NULL
      `;
      console.log('   ✓ PurchaseOrders: Khi xóa NCC → supplier_id = NULL (giữ lịch sử)');
    } catch (err: any) {
      if (!err.message.includes('already exists')) {
        console.log('   ⚠️  PurchaseOrders:', err.message);
      }
    }

    // SupplierPayments
    try {
      await sql.query`
        ALTER TABLE SupplierPayments
        ADD CONSTRAINT FK_SupplierPayments_Suppliers
        FOREIGN KEY (supplier_id) REFERENCES Suppliers(id)
        ON DELETE SET NULL
      `;
      console.log('   ✓ SupplierPayments: Khi xóa NCC → supplier_id = NULL (giữ lịch sử)');
    } catch (err: any) {
      if (!err.message.includes('already exists')) {
        console.log('   ⚠️  SupplierPayments:', err.message);
      }
    }

    console.log('\n✅ Hoàn tất! Bây giờ có thể xóa nhà cung cấp mà vẫn giữ lịch sử.');
    console.log('\n📋 Cách hoạt động:');
    console.log('   • Xóa NCC → supplier_id trong đơn hàng = NULL');
    console.log('   • Lịch sử đơn hàng vẫn còn (số tiền, ngày nhập...)');
    console.log('   • Lịch sử thanh toán vẫn còn');
    console.log('   • Tên NCC sẽ hiển thị "Không có nhà cung cấp"');

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await sql.close();
  }
}

fixSupplierDeleteConstraint();
