import dotenv from 'dotenv';
import sql from 'mssql';

dotenv.config();

const config: sql.config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'SmartInventory',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT !== 'false',
  },
};

async function demoAutoClose() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('🔌 Connecting to database...');
    pool = await sql.connect(config);
    console.log('✅ Connected to database\n');

    // Lấy ca đang active
    const activeShift = await pool.request().query(`
      SELECT TOP 1
        s.id,
        s.user_id,
        s.user_name,
        s.start_time,
        u.max_shift_hours,
        DATEDIFF(MINUTE, s.start_time, GETDATE()) / 60.0 as hours_worked
      FROM Shifts s
      LEFT JOIN Users u ON s.user_id = u.Id
      WHERE s.status = 'active'
      ORDER BY s.start_time DESC
    `);

    if (activeShift.recordset.length === 0) {
      console.log('⚠️  Không có ca nào đang active để demo');
      console.log('💡 Hãy mở một ca làm việc trước: POST /api/shifts/start');
      return;
    }

    const shift = activeShift.recordset[0];
    const hoursWorked = shift.hours_worked || 0;
    const currentMaxHours = shift.max_shift_hours || 8.0;

    console.log('📊 Ca làm việc hiện tại:');
    console.log(`   - Nhân viên: ${shift.user_name}`);
    console.log(`   - Đã làm: ${hoursWorked.toFixed(2)} giờ`);
    console.log(`   - Giới hạn hiện tại: ${currentMaxHours} giờ`);
    console.log(`   - Bắt đầu: ${new Date(shift.start_time).toLocaleString('vi-VN')}`);

    // Giảm max_shift_hours xuống thấp hơn số giờ đã làm
    const newMaxHours = Math.max(0.1, hoursWorked - 0.1);
    
    console.log(`\n🔧 Đang cập nhật max_shift_hours xuống ${newMaxHours.toFixed(2)} giờ...`);
    await pool.request()
      .input('userId', sql.NVarChar, shift.user_id)
      .input('maxShiftHours', sql.Decimal(5, 2), newMaxHours)
      .query('UPDATE Users SET max_shift_hours = @maxShiftHours WHERE id = @userId');

    console.log('✅ Đã cập nhật!');
    console.log('\n⏰ Service sẽ tự động đóng ca trong vòng 1 phút...');
    console.log('💡 Theo dõi logs của server để xem kết quả:');
    console.log('   "✅ Đã tự động đóng ca cho..."');
    
    console.log('\n📝 Sau khi test xong, bạn có thể khôi phục lại:');
    console.log(`   UPDATE Users SET max_shift_hours = ${currentMaxHours} WHERE id = '${shift.user_id}'`);

  } catch (error) {
    console.error('❌ Lỗi:', error);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

demoAutoClose()
  .then(() => {
    console.log('\n✅ Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
