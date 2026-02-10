import sql from 'mssql';

const config: sql.config = {
  server: '118.69.126.49',
  database: 'Data_QuanLyBanHang_Online',
  user: 'userquanlybanhangonline',
  password: '123456789',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function fixTable() {
  let pool: sql.ConnectionPool | null = null;
  try {
    pool = await sql.connect(config);
    
    console.log('🔧 Kiểm tra và thêm cột thiếu...\n');
    
    // Check if purchase_id exists
    const purchaseIdCheck = await sql.query`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'SupplierPayments' AND COLUMN_NAME = 'purchase_id'
    `;
    
    if (purchaseIdCheck.recordset.length === 0) {
      console.log('➕ Thêm cột purchase_id...');
      await sql.query`
        ALTER TABLE SupplierPayments
        ADD purchase_id UNIQUEIDENTIFIER NULL
      `;
      console.log('✅ Đã thêm cột purchase_id');
    } else {
      console.log('✓ Cột purchase_id đã tồn tại');
    }
    
    // Check if payment_method exists
    const paymentMethodCheck = await sql.query`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'SupplierPayments' AND COLUMN_NAME = 'payment_method'
    `;
    
    if (paymentMethodCheck.recordset.length === 0) {
      console.log('➕ Thêm cột payment_method...');
      await sql.query`
        ALTER TABLE SupplierPayments
        ADD payment_method NVARCHAR(50) NOT NULL DEFAULT 'cash'
      `;
      console.log('✅ Đã thêm cột payment_method');
    } else {
      console.log('✓ Cột payment_method đã tồn tại');
    }
    
    console.log('\n✅ Hoàn thành! Bảng SupplierPayments đã được cập nhật.');

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
    process.exit(0);
  }
}

fixTable();
