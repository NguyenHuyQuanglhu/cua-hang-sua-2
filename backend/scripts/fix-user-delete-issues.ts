/**
 * Script để kiểm tra và sửa lỗi xóa người dùng
 * Chạy: npx ts-node scripts/fix-user-delete-issues.ts
 */

import { query, queryOne } from '../src/db';

interface User {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  status: string;
  created_at: string;
}

async function checkUserDeleteIssues() {
  console.log('=== KIỂM TRA VẤN ĐỀ XÓA NGƯỜI DÙNG ===\n');

  try {
    // 1. Kiểm tra danh sách users
    console.log('1. Danh sách người dùng:');
    const users = await query<User>('SELECT id, email, display_name, role, status, created_at FROM Users ORDER BY created_at');
    
    users.forEach((user: User, index: number) => {
      console.log(`   ${index + 1}. ${user.email} (${user.role}) - ${user.status}`);
      console.log(`      ID: ${user.id}`);
      console.log(`      Tên: ${user.display_name || 'N/A'}`);
      console.log('');
    });

    // 2. Kiểm tra foreign key constraints
    console.log('2. Kiểm tra ràng buộc foreign key:');
    
    // Sessions
    const sessionsCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM Sessions');
    console.log(`   - Sessions: ${sessionsCount?.count || 0} bản ghi`);
    
    // UserStores
    const userStoresCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM UserStores');
    console.log(`   - UserStores: ${userStoresCount?.count || 0} bản ghi`);
    
    // Shifts
    const shiftsCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM Shifts');
    console.log(`   - Shifts: ${shiftsCount?.count || 0} bản ghi`);
    
    // Sales (created_by)
    const salesCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM Sales WHERE created_by IS NOT NULL');
    console.log(`   - Sales with created_by: ${salesCount?.count || 0} bản ghi`);

    // 3. Kiểm tra users có thể xóa được
    console.log('\n3. Phân tích khả năng xóa:');
    
    for (const user of users) {
      console.log(`\n   User: ${user.email} (${user.role})`);
      
      // Kiểm tra sessions
      const userSessions = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM Sessions WHERE UserId = @userId', { userId: user.id });
      console.log(`     - Sessions: ${userSessions?.count || 0}`);
      
      // Kiểm tra user stores
      const userStores = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM UserStores WHERE UserId = @userId', { userId: user.id });
      console.log(`     - UserStores: ${userStores?.count || 0}`);
      
      // Kiểm tra shifts
      const userShifts = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM Shifts WHERE UserId = @userId', { userId: user.id });
      console.log(`     - Shifts: ${userShifts?.count || 0}`);
      
      // Kiểm tra sales
      const userSales = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM Sales WHERE created_by = @userId', { userId: user.id });
      console.log(`     - Sales created: ${userSales?.count || 0}`);
      
      const canSoftDelete = user.status === 'active';
      console.log(`     - Có thể soft delete: ${canSoftDelete ? 'Có' : 'Không (đã inactive)'}`);
    }

    // 4. Test soft delete function
    console.log('\n4. Test soft delete function:');
    console.log('   Tìm user có thể test...');
    
    const testUser = users.find((u: User) => u.role === 'salesperson' && u.status === 'active');
    if (testUser) {
      console.log(`   Tìm thấy user test: ${testUser.email}`);
      console.log('   Để test xóa, chạy:');
      console.log(`   UPDATE Users SET status = 'inactive' WHERE id = '${testUser.id}';`);
      console.log(`   DELETE FROM Sessions WHERE UserId = '${testUser.id}';`);
    } else {
      console.log('   Không tìm thấy user phù hợp để test');
    }

    // 5. Kiểm tra permissions
    console.log('\n5. Kiểm tra permissions mặc định:');
    const ownerUsers = users.filter((u: User) => u.role === 'owner');
    const companyManagerUsers = users.filter((u: User) => u.role === 'company_manager');
    
    console.log(`   - Owners (có thể xóa tất cả): ${ownerUsers.length}`);
    console.log(`   - Company Managers (có thể xóa company_manager và dưới): ${companyManagerUsers.length}`);
    
    ownerUsers.forEach((user: User) => {
      console.log(`     Owner: ${user.email}`);
    });
    
    companyManagerUsers.forEach((user: User) => {
      console.log(`     Company Manager: ${user.email}`);
    });

  } catch (error) {
    console.error('Lỗi khi kiểm tra:', error);
  }
}

async function fixCommonIssues() {
  console.log('\n=== SỬA CÁC VẤN ĐỀ THƯỜNG GẶP ===\n');

  try {
    // 1. Xóa sessions cũ/invalid
    console.log('1. Dọn dẹp sessions cũ...');
    const deletedSessions = await query('DELETE FROM Sessions WHERE ExpiresAt < GETDATE()');
    console.log(`   Đã xóa ${deletedSessions} sessions hết hạn`);

    // 2. Kiểm tra và sửa user permissions
    console.log('\n2. Kiểm tra user permissions...');
    const usersWithoutPermissions = await query<User>('SELECT id, email, role FROM Users WHERE Permissions IS NULL OR Permissions = \'\'');
    
    if (usersWithoutPermissions.length > 0) {
      console.log(`   Tìm thấy ${usersWithoutPermissions.length} users không có permissions`);
      
      for (const user of usersWithoutPermissions) {
        console.log(`   Cập nhật permissions cho ${user.email} (${user.role})`);
        
        // Set default permissions based on role
        let defaultPermissions = '{}';
        if (user.role === 'owner') {
          defaultPermissions = JSON.stringify({
            users: ['view', 'add', 'edit', 'delete'],
            dashboard: ['view'],
            pos: ['view', 'add', 'edit', 'delete'],
            // ... other permissions
          });
        }
        
        await query('UPDATE Users SET Permissions = @permissions WHERE id = @id', {
          permissions: defaultPermissions,
          id: user.id
        });
      }
    } else {
      console.log('   Tất cả users đều có permissions');
    }

    // 3. Kiểm tra database constraints
    console.log('\n3. Kiểm tra database constraints...');
    
    // Kiểm tra xem có foreign key constraints nào có thể gây vấn đề không
    const constraintCheck = await query(`
      SELECT 
        fk.name AS constraint_name,
        tp.name AS parent_table,
        cp.name AS parent_column,
        tr.name AS referenced_table,
        cr.name AS referenced_column
      FROM sys.foreign_keys fk
      INNER JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
      INNER JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
      INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
      INNER JOIN sys.columns cp ON fkc.parent_column_id = cp.column_id AND fkc.parent_object_id = cp.object_id
      INNER JOIN sys.columns cr ON fkc.referenced_column_id = cr.column_id AND fkc.referenced_object_id = cr.object_id
      WHERE tr.name = 'Users'
    `);
    
    console.log('   Foreign keys tham chiếu đến Users:');
    constraintCheck.forEach((constraint: any) => {
      console.log(`     ${constraint.parent_table}.${constraint.parent_column} -> Users.${constraint.referenced_column}`);
    });

    console.log('\n✅ Hoàn thành kiểm tra và sửa lỗi');

  } catch (error) {
    console.error('Lỗi khi sửa:', error);
  }
}

// Chạy script
async function main(): Promise<void> {
  await checkUserDeleteIssues();
  await fixCommonIssues();
}

// Export để có thể import từ file khác
export { checkUserDeleteIssues, fixCommonIssues };

// Chạy nếu được gọi trực tiếp
main().catch(console.error);    