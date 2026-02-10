import sql from 'mssql';

const config = {
  server: '118.69.126.49',
  database: 'Data_QuanLyBanHang_Online',
  user: 'userquanlybanhangonline',
  password: '123456789',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function checkSchema() {
  try {
    await sql.connect(config);
    
    // Check ProductInventory schema
    const schema = await sql.query`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'ProductInventory'
      ORDER BY ORDINAL_POSITION
    `;
    
    console.log('=== ProductInventory Schema ===\n');
    schema.recordset.forEach((col: any) => {
      console.log(`${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Check sample data
    console.log('\n=== Sample ProductInventory Data ===\n');
    const data = await sql.query`
      SELECT TOP 5 
        pi.Id,
        p.name as ProductName,
        pi.Quantity,
        pi.UnitId,
        u.name as UnitName
      FROM ProductInventory pi
      JOIN Products p ON pi.ProductId = p.id
      LEFT JOIN Units u ON pi.UnitId = u.id
    `;
    
    data.recordset.forEach((row: any) => {
      console.log(`${row.ProductName}: ${row.Quantity} ${row.UnitName || 'N/A'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.close();
  }
}

checkSchema();
