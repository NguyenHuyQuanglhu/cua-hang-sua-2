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

async function testAutoCloseShift() {
  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('🔌 Connecting to database...');
    pool = await sql.connect(config);
    console.log('✅ Connected to database\n');

    // 1. Kiểm tra cột max_shift_hours trong Users
    console.log('📋 Kiểm tra cấu trúc bảng Users...');
    const usersColumns = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'max_shift_hours'
    `);
    
    if (usersColumns.recordset.length > 0) {
      console.log('✅ Cột max_shift_hours đã tồn tại trong Users');
      console.log('   Type:', usersColumns.recordset[0].DATA_TYPE);
    } else {
      console.log('❌ Cột max_shift_hours chưa tồn tại trong Users');
    }

    // 2. Kiểm tra cột notes trong Shifts
    console.log('\n📋 Kiểm tra cấu trúc bảng Shifts...');
    const shiftsColumns = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Shifts' AND COLUMN_NAME = 'notes'
    `);
    
    if (shiftsColumns.recordset.length > 0) {
      console.log('✅ Cột notes đã tồn tại trong Shifts');
      console.log('   Type:', shiftsColumns.recordset[0].DATA_TYPE);
    } else {
      console.log('❌ Cột notes chưa tồn tại trong Shifts');
    }

    // 3. Kiểm tra users có max_shift_hours
    console.log('\n👥 Kiểm tra cấu hình max_shift_hours của users...');
    const usersWithMaxHours = await pool.request().query(`
      SELECT TOP 5 
        email, 
        display_name, 
        role, 
        max_shift_hours,
        status
      FROM Users
      WHERE status = 'active'
      ORDER BY created_at DESC
    `);

    if (usersWithMaxHours.recordset.length > 0) {
      console.log('✅ Danh sách users:');
      usersWithMaxHours.recordset.forEach((user: any) => {
        console.log(`   - ${user.email} (${user.role}): ${user.max_shift_hours || 'chưa cấu hình'} giờ`);
      });
    } else {
      console.log('⚠️  Không có users nào');
    }

    // 4. Kiểm tra active shifts
    console.log('\n⏰ Kiểm tra ca làm việc đang active...');
    const activeShifts = await pool.request().query(`
      SELECT 
        s.id,
        s.user_name,
        s.start_time,
        s.status,
        u.max_shift_hours,
        DATEDIFF(MINUTE, s.start_time, GETDATE()) / 60.0 as hours_worked
      FROM Shifts s
      LEFT JOIN Users u ON s.user_id = u.Id
      WHERE s.status = 'active'
      ORDER BY s.start_time DESC
    `);

    if (activeShifts.recordset.length > 0) {
      console.log(`✅ Có ${activeShifts.recordset.length} ca đang active:`);
      activeShifts.recordset.forEach((shift: any) => {
        const maxHours = shift.max_shift_hours || 8.0;
        const hoursWorked = shift.hours_worked || 0;
        const isOvertime = hoursWorked >= maxHours;
        console.log(`   - ${shift.user_name}: ${hoursWorked.toFixed(2)}/${maxHours} giờ ${isOvertime ? '⚠️ VỰA QUÁ GIỜ' : '✅'}`);
      });
    } else {
      console.log('⚠️  Không có ca nào đang active');
    }

    // 5. Kiểm tra ca đã đóng tự động
    console.log('\n📊 Kiểm tra ca đã đóng tự động...');
    const autoClosedShifts = await pool.request().query(`
      SELECT TOP 5
        id,
        user_name,
        start_time,
        end_time,
        notes,
        DATEDIFF(MINUTE, start_time, end_time) / 60.0 as hours_worked
      FROM Shifts
      WHERE status = 'closed' 
        AND notes LIKE '%Tự động đóng ca%'
      ORDER BY end_time DESC
    `);

    if (autoClosedShifts.recordset.length > 0) {
      console.log(`✅ Có ${autoClosedShifts.recordset.length} ca đã đóng tự động:`);
      autoClosedShifts.recordset.forEach((shift: any) => {
        console.log(`   - ${shift.user_name}: ${shift.hours_worked.toFixed(2)} giờ`);
        console.log(`     Bắt đầu: ${new Date(shift.start_time).toLocaleString('vi-VN')}`);
        console.log(`     Kết thúc: ${new Date(shift.end_time).toLocaleString('vi-VN')}`);
      });
    } else {
      console.log('⚠️  Chưa có ca nào được đóng tự động');
    }

    console.log('\n✅ Kiểm tra hoàn tất!');
    console.log('\n💡 Hướng dẫn:');
    console.log('   1. Cấu hình max_shift_hours cho user: PUT /api/users/:id/shift-hours');
    console.log('   2. Mở ca làm việc: POST /api/shifts/start');
    console.log('   3. Đợi service tự động đóng ca (chạy mỗi phút)');
    console.log('   4. Kiểm tra logs: "✅ Đã tự động đóng ca cho..."');

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

testAutoCloseShift()
  .then(() => {
    console.log('\n✅ Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
