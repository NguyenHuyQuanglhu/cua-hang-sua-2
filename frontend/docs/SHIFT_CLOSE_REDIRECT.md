# Tự động chuyển hướng sau khi đóng ca

## Tổng quan

Tính năng này tự động chuyển hướng người dùng đến trang phù hợp dựa trên vai trò (role) của họ sau khi đóng ca làm việc.

## Logic chuyển hướng

### Các vai trò quản lý → Dashboard
- **Chủ sở hữu** (`owner`) → `/dashboard`
- **Quản lý công ty** (`company_manager`) → `/dashboard`  
- **Quản lý cửa hàng** (`store_manager`) → `/dashboard`

### Nhân viên → Login
- **Nhân viên bán hàng** (`salesperson`) → `/login`

## Triển khai

### 1. Utility Functions
File: `src/lib/navigation.ts`
- `getPostShiftRedirectPath(userRole)`: Trả về đường dẫn chuyển hướng
- `shouldRedirectToDashboard(userRole)`: Kiểm tra có nên chuyển về dashboard không

### 2. Components được cập nhật
- `ShiftControls`: Sử dụng logic chuyển hướng mới khi đóng ca
- `StartShiftDialog`: Sử dụng logic chuyển hướng khi user không bắt đầu ca
- `POSPage`: Cập nhật `handleShiftClosed` để sử dụng logic mới

### 3. Lý do thiết kế

**Tại sao quản lý chuyển về Dashboard?**
- Có quyền truy cập nhiều tính năng quản lý
- Cần xem tổng quan hoạt động kinh doanh
- Có thể tiếp tục làm việc mà không cần mở ca mới

**Tại sao nhân viên chuyển về Login?**
- Chỉ có quyền sử dụng POS
- Cần mở ca mới để tiếp tục làm việc
- Cho phép người khác đăng nhập sử dụng

## Testing

Đã có unit tests trong `src/lib/__tests__/navigation.test.ts` để đảm bảo logic hoạt động đúng.

## Tương thích ngược

Thay đổi này tương thích ngược - các component có thể vẫn truyền callback `onShiftClosed` để override hành vi mặc định.