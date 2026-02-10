# Backend Scripts

Thư mục này chứa các scripts quan trọng để quản lý database.

## 📁 Cấu trúc

### `migrations/`
Chứa các file SQL migration để thay đổi cấu trúc database.
- Các file này cần được giữ lại để có thể setup database mới
- Chạy khi cần thêm/sửa cột, bảng, constraints

### `stored-procedures/`
Chứa source code của tất cả stored procedures.
- Đây là "business logic" của database
- Cần thiết để deploy lại hoặc sửa đổi SP

### Scripts chính

#### `setup-database.ts`
Setup database từ đầu (tạo tables, indexes, constraints)
```bash
npx tsx scripts/setup-database.ts
```

#### `setup-master-database.ts`
Setup master database cho multi-tenant system
```bash
npx tsx scripts/setup-master-database.ts
```

#### `deploy-stored-procedures.ts`
Deploy tất cả stored procedures
```bash
npx tsx scripts/deploy-stored-procedures.ts
```

#### `hash-password.ts`
Tiện ích để hash password cho user
```bash
npx tsx scripts/hash-password.ts
```

## 📦 Archive

Thư mục `archive/` chứa 164 scripts đã chạy xong:
- check-* : Scripts kiểm tra dữ liệu
- fix-* : Scripts sửa lỗi dữ liệu
- test-* : Scripts test chức năng
- debug-* : Scripts debug
- Các scripts migration/setup đã chạy xong

**Lưu ý**: Các file trong archive có thể xóa sau 3-6 tháng nếu chắc chắn không cần nữa.

## 🔄 Workflow

### Khi thêm tính năng mới:
1. Tạo migration trong `migrations/`
2. Tạo/sửa stored procedure trong `stored-procedures/`
3. Chạy migration
4. Deploy stored procedure

### Khi có lỗi database:
1. Kiểm tra trong `archive/` xem có script check/fix tương tự không
2. Tạo script mới nếu cần
3. Sau khi fix xong, chuyển vào `archive/`

## ⚠️ Quan trọng

**KHÔNG XÓA**:
- ✅ migrations/
- ✅ stored-procedures/
- ✅ setup-database.ts
- ✅ deploy-stored-procedures.ts

**CÓ THỂ XÓA** (sau 3-6 tháng):
- ⚠️ archive/
