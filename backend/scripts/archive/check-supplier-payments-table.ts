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

async function checkTable() {
  let pool: sql.ConnectionPool | null = null;
  try {
    pool = await sql.connect(config);
    
    // Check if table exists
    const tableCheck = await sql.query`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'SupplierPayments'
    `;
    
    if (tableCheck.recordset.length === 0) {
      console.log('❌ Bảng SupplierPayments không tồn tại!');
      console.log('\n📝 Tạo bảng SupplierPayments...');
      
      await sql.query`
        CREATE TABLE SupplierPayments (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          store_id UNIQUEIDENTIFIER NOT NULL,
          supplier_id UNIQUEIDENTIFIER NOT NULL,
          purchase_id UNIQUEIDENTIFIER NULL,
          amount DECIMAL(18, 2) NOT NULL,
          payment_date DATETIME2 NOT NULL DEFAULT GETDATE(),
          payment_method NVARCHAR(50) NOT NULL DEFAULT 'cash',
          notes NTEXT NULL,
          created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
          FOREIGN KEY (store_id) REFERENCES Stores(id),
          FOREIGN KEY (supplier_id) REFERENCES Suppliers(id),
          FOREIGN KEY (purchase_id) REFERENCES PurchaseOrders(id)
        )
      `;
      
      console.log('✅ Đã tạo bảng SupplierPayments thành công!');
    } else {
      console.log('✅ Bảng SupplierPayments đã tồn tại');
      
      // Show columns
      const columns = await sql.query`
        SELECT COLUMN_NAME, DATA_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'SupplierPayments'
        ORDER BY ORDINAL_POSITION
      `;
      
      console.log('\n📋 Cấu trúc bảng:');
      columns.recordset.forEach(col => {
        console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
      });
    }

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
    process.exit(0);
  }
}

checkTable();
