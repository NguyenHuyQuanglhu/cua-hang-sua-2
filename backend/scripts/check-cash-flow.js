/**
 * Check cash flow synchronization status
 */

const sql = require('mssql');

const config = {
  server: '118.69.126.49',
  database: 'Data_quanlybanhang_online',
  user: 'userquanlybanhangonline',
  password: '123456789',
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

async function checkCashFlow() {
  let pool;
  
  try {
    pool = await sql.connect(config);
    
    console.log('=== KIỂM TRA ĐỒNG BỘ SỔ QUỸ ===\n');
    
    // 1. Check table exists
    const tableCheck = await pool.request().query(`
      SELECT COUNT(*) as count FROM sys.tables WHERE name = 'CashTransactions'
    `);
    
    if (tableCheck.recordset[0].count === 0) {
      console.log('❌ Bảng CashTransactions chưa được tạo!');
      return;
    }
    
    console.log('✓ Bảng CashTransactions đã tồn tại\n');
    
    // 2. Get summary by category
    const summary = await pool.request().query(`
      SELECT 
        type as type,
        category,
        COUNT(*) as count,
        SUM(amount) as total
      FROM CashTransactions
      GROUP BY type, category
      ORDER BY type, category
    `);
    
    console.log('📊 Thống kê theo danh mục:\n');
    
    let totalIncome = 0;
    let totalExpense = 0;
    
    summary.recordset.forEach(row => {
      const icon = row.type === 'thu' ? '📈' : '📉';
      const typeText = row.type === 'thu' ? 'THU' : 'CHI';
      const amount = parseFloat(row.total);
      
      if (row.type === 'thu') {
        totalIncome += amount;
      } else {
        totalExpense += amount;
      }
      
      console.log(`${icon} ${typeText} - ${row.category || '(Không có danh mục)'}`);
      console.log(`   Số giao dịch: ${row.count}`);
      console.log(`   Tổng tiền: ${amount.toLocaleString('vi-VN')} ₫\n`);
    });
    
    // 3. Show totals
    const balance = totalIncome - totalExpense;
    
    console.log('=== TỔNG KẾT ===\n');
    console.log(`📈 Tổng thu:  ${totalIncome.toLocaleString('vi-VN')} ₫`);
    console.log(`📉 Tổng chi:  ${totalExpense.toLocaleString('vi-VN')} ₫`);
    console.log(`💰 Số dư:    ${balance.toLocaleString('vi-VN')} ₫\n`);
    
    // 4. Recent transactions
    const recent = await pool.request().query(`
      SELECT TOP 10
        type,
        transaction_date,
        amount,
        reason,
        category
      FROM CashTransactions
      ORDER BY transaction_date DESC
    `);
    
    console.log('📋 10 giao dịch gần nhất:\n');
    recent.recordset.forEach((row, i) => {
      const icon = row.type === 'thu' ? '📈' : '📉';
      const date = new Date(row.transaction_date).toLocaleDateString('vi-VN');
      const amount = parseFloat(row.amount).toLocaleString('vi-VN');
      console.log(`${i + 1}. ${icon} ${date} - ${amount} ₫`);
      console.log(`   ${row.reason}`);
      console.log(`   Danh mục: ${row.category || '(Không có)'}\n`);
    });
    
  } catch (err) {
    console.error('Lỗi:', err.message);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

checkCashFlow()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Failed:', err);
    process.exit(1);
  });
