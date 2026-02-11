# Hành Vi Đóng Dialog "Bắt Đầu Ca Làm Việc"

## Tổng Quan

Dialog "Bắt đầu ca làm việc" có hành vi đóng khác nhau tùy theo vai trò của người dùng:

- **Admin/Manager**: Có thể đóng dialog và chuyển sang trang quản lý
- **Nhân viên bán hàng**: Không thể đóng, phải chọn "Bắt đầu ca" hoặc "Đăng xuất"

## Phân Quyền

### Tài Khoản Có Quyền Quản Lý
Các vai trò sau có thể truy cập trang quản lý mà không cần mở ca:
- `owner` - Chủ sở hữu
- `company_manager` - Quản lý công ty
- `store_manager` - Quản lý cửa hàng

### Tài Khoản Nhân Viên
Vai trò sau bắt buộc phải mở ca để sử dụng POS:
- `salesperson` - Nhân viên bán hàng

## Hành Vi Khi Bấm Nút X

### Kịch Bản 1: Admin/Manager Bấm X
```
1. User: Admin/Manager
2. Bấm nút X (hoặc ESC)
3. → Chuyển hướng đến /dashboard
4. Có thể truy cập các trang quản lý
```

**Lý do:**
- Admin/Manager cần truy cập các trang quản lý (báo cáo, cài đặt, v.v.)
- Họ không nhất thiết phải mở ca để làm việc
- Có thể xem dữ liệu và quản lý hệ thống mà không cần POS

### Kịch Bản 2: Nhân Viên Bán Hàng Bấm X
```
1. User: Salesperson
2. Bấm nút X (hoặc ESC)
3. → Hiển thị AlertDialog cảnh báo
4. Đọc cảnh báo
5. Bấm "Đã hiểu"
6. → Quay lại dialog "Bắt đầu ca làm việc"
7. Phải chọn: "Bắt đầu ca" hoặc "Đăng xuất"
```

**Lý do:**
- Nhân viên bán hàng chỉ có quyền sử dụng POS
- POS yêu cầu phải có ca làm việc để theo dõi doanh thu
- Không cho phép bỏ qua việc mở ca để đảm bảo tính minh bạch

## Giao Diện

### Dialog Chính (Tất Cả Vai Trò)
```
┌─────────────────────────────────────┐
│  Bắt đầu ca làm việc            [X]│
│                                     │
│  Nhập số tiền mặt ban đầu trong    │
│  ngăn kéo để bắt đầu ca mới.       │
│                                     │
│  Tiền đầu ca:  [        0]         │
│                                     │
│  [🚪 Đăng xuất]  [Bắt đầu ca]     │
└─────────────────────────────────────┘
```

### AlertDialog Cảnh Báo (Chỉ Nhân Viên)
```
┌─────────────────────────────────────┐
│  ⚠️ Không thể đóng                 │
│                                     │
│  Nhân viên bán hàng phải bắt đầu   │
│  ca làm việc mới có thể sử dụng    │
│  hệ thống POS.                     │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ Vui lòng chọn một trong hai:  │ │
│  │ • Bắt đầu ca - Tiếp tục       │ │
│  │ • Đăng xuất - Kết thúc        │ │
│  └───────────────────────────────┘ │
│                                     │
│  💡 Lưu ý: Chỉ tài khoản quản lý   │
│  mới có thể truy cập các trang     │
│  khác mà không cần mở ca.          │
│                                     │
│                      [Đã hiểu]     │
└─────────────────────────────────────┘
```

## Code Implementation

### Kiểm Tra Quyền
```typescript
const effectiveUserRole = userRole || user?.role || 'salesperson';
const canAccessManagement = ['owner', 'company_manager', 'store_manager'].includes(effectiveUserRole);
```

### Handler Đóng Dialog
```typescript
const handleCloseAttempt = () => {
  // If user is admin/manager, redirect to dashboard
  if (canAccessManagement) {
    router.push('/dashboard')
  } else {
    // If user is salesperson, show warning
    setShowCloseWarning(true)
  }
}
```

### Dialog với onOpenChange
```typescript
<Dialog open={true} onOpenChange={(open) => !open && handleCloseAttempt()}>
  {/* Dialog content */}
</Dialog>
```

## Luồng Hoạt Động Chi Tiết

### Admin/Manager Workflow
```
┌─────────────────┐
│ Đóng ca         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Dialog hiện lên │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌──────────────┐
│ Bấm "Bắt đầu ca"│  │ Bấm X        │
└────────┬────────┘  └──────┬───────┘
         │                  │
         ▼                  ▼
┌─────────────────┐  ┌──────────────┐
│ Ca mới được tạo │  │ → /dashboard │
│ Tiếp tục POS    │  │ Quản lý      │
└─────────────────┘  └──────────────┘
```

### Salesperson Workflow
```
┌─────────────────┐
│ Đóng ca         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Dialog hiện lên │
└────────┬────────┘
         │
         ├─────────────────┬──────────────┐
         │                 │              │
         ▼                 ▼              ▼
┌─────────────────┐  ┌──────────┐  ┌──────────┐
│ Bấm "Bắt đầu ca"│  │ Bấm X    │  │ Đăng xuất│
└────────┬────────┘  └────┬─────┘  └────┬─────┘
         │                │              │
         ▼                ▼              ▼
┌─────────────────┐  ┌──────────┐  ┌──────────┐
│ Ca mới được tạo │  │ Cảnh báo │  │ → /login │
│ Tiếp tục POS    │  │ hiện lên │  │          │
└─────────────────┘  └────┬─────┘  └──────────┘
                          │
                          ▼
                     ┌──────────┐
                     │ Đã hiểu  │
                     └────┬─────┘
                          │
                          ▼
                     ┌──────────┐
                     │ Quay lại │
                     │ Dialog   │
                     └──────────┘
```

## Testing

### Test Case 1: Admin Đóng Dialog
```
Given: User có role = "owner"
When: Bấm nút X trên dialog
Then: Chuyển hướng đến /dashboard
And: Không hiển thị cảnh báo
```

### Test Case 2: Manager Đóng Dialog
```
Given: User có role = "store_manager"
When: Bấm nút X trên dialog
Then: Chuyển hướng đến /dashboard
And: Không hiển thị cảnh báo
```

### Test Case 3: Nhân Viên Đóng Dialog
```
Given: User có role = "salesperson"
When: Bấm nút X trên dialog
Then: Hiển thị AlertDialog cảnh báo
And: Dialog chính vẫn mở
And: Không chuyển hướng
```

### Test Case 4: Nhân Viên Đóng Cảnh Báo
```
Given: AlertDialog cảnh báo đang hiển thị
When: Bấm "Đã hiểu"
Then: AlertDialog đóng
And: Quay lại dialog "Bắt đầu ca làm việc"
```

### Test Case 5: Nhân Viên Bấm ESC
```
Given: User có role = "salesperson"
When: Bấm phím ESC
Then: Hiển thị AlertDialog cảnh báo
And: Hành vi giống như bấm X
```

## Lợi Ích

### Cho Admin/Manager
✅ Linh hoạt trong việc truy cập hệ thống
✅ Không bị ép phải mở ca khi chỉ cần xem báo cáo
✅ Có thể quản lý nhiều cửa hàng mà không cần mở ca ở từng nơi

### Cho Nhân Viên Bán Hàng
✅ Đảm bảo mọi giao dịch đều được ghi nhận vào ca
✅ Tránh tình trạng bán hàng mà không có ca
✅ Minh bạch trong quản lý doanh thu

### Cho Hệ Thống
✅ Dữ liệu ca làm việc chính xác
✅ Dễ dàng theo dõi và kiểm toán
✅ Phân quyền rõ ràng theo vai trò

## Lưu Ý Quan Trọng

1. **Role mặc định**: Nếu không có role, mặc định là `salesperson` (an toàn hơn)
2. **Không có nút "Bỏ qua"**: Để đảm bảo nhân viên không thể bypass việc mở ca
3. **Redirect đến /dashboard**: Admin/Manager được chuyển đến trang quản lý, không phải trang chủ
4. **Toast notification**: Không hiển thị toast khi redirect (để UX mượt mà hơn)

## Tương Lai

Có thể cân nhắc:
- Cho phép admin cấu hình role nào cần bắt buộc mở ca
- Thêm tùy chọn "Chế độ xem" cho manager (xem POS mà không cần mở ca)
- Log lại hành động đóng dialog để phân tích UX
