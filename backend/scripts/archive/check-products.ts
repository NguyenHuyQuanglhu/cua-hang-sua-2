import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

const config: sql.config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME,
  options: { encrypt: true, trustServerCertificate: true }
};

async function check() {
  const pool = await sql.connect(config);
  
  console.log('\n📦 DANH SÁCH SẢN PHẨM:\n');
  
  const result = await pool.request().query(`
    SELECT 
      s.name as [Cửa hàng],
      p.name as [Sản phẩm],
      p.cost_price as [Giá nhập],
      p.price as [Giá bán],
      p.stock_quantity as [Tồn kho],
      (p.cost_price * p.stock_quantity) as [Thành tiền nhập],
      (p.price * p.stock_quantity) as [Thành tiền bán]
    FROM Products p
    JOIN Stores s ON p.store_id = s.id
    ORDER BY s.name, p.name
  `);
  
  console.table(result.recordset);
  
  // Tổng kết theo cửa hàng
  console.log('\n📊 TỔNG KẾT THEO CỬA HÀNG:\n');
  
  const summary = await pool.request().query(`
    SELECT 
      s.name as [Cửa hàng],
      COUNT(p.id) as [Số SP],
      SUM(p.stock_quantity) as [Tổng tồn kho],
      SUM(p.cost_price * p.stock_quantity) as [Tổng giá nhập],
      SUM(p.price * p.stock_quantity) as [Tổng giá bán],
      SUM(p.price * p.stock_quantity) - SUM(p.cost_price * p.stock_quantity) as [Lợi nhuận tiềm năng]
    FROM Products p
    JOIN Stores s ON p.store_id = s.id
    GROUP BY s.id, s.name
  `);
  
  console.table(summary.recordset);
  
  await pool.close();
}

check();
