# Chọn cửa hàng khi bắt đầu ca làm việc

## Tổng quan

Tính năng này cho phép nhân viên chọn cửa hàng mà họ có quyền truy cập khi bắt đầu ca làm việc mới.

## Tính năng chính

### 1. Hiển thị danh sách cửa hàng
- **Nhiều cửa hàng**: Hiển thị dropdown để chọn cửa hàng
- **Một cửa hàng**: Hiển thị thông tin cửa hàng hiện tại (không cần chọn)

### 2. Validation
- Bắt buộc phải chọn cửa hàng trước khi bắt đầu ca
- Hiển thị thông báo lỗi nếu chưa chọn cửa hàng

### 3. Tự động chuyển cửa hàng
- Nếu chọn cửa hàng khác với cửa hàng hiện tại, hệ thống sẽ tự động chuyển
- Chỉ bắt đầu ca sau khi chuyển cửa hàng thành công

## Giao diện người dùng

### Trường hợp có nhiều cửa hàng
```
┌─────────────────────────────────────┐
│ Bắt đầu ca làm việc                 │
├─────────────────────────────────────┤
│ Chọn cửa hàng và nhập số tiền mặt   │
│ ban đầu để bắt đầu ca mới.          │
│                                     │
│ Cửa hàng: [Dropdown với danh sách] │
│ Tiền đầu ca: [Input số tiền]       │
│                                     │
│ [Đăng xuất] [Bắt đầu ca]           │
└─────────────────────────────────────┘
```

### Trường hợp có một cửa hàng
```
┌─────────────────────────────────────┐
│ Bắt đầu ca làm việc                 │
├─────────────────────────────────────┤
│ Nhập số tiền mặt ban đầu trong      │
│ ngăn kéo để bắt đầu ca mới.         │
│                                     │
│ Cửa hàng: [Tên cửa hàng hiện tại]  │
│ Tiền đầu ca: [Input số tiền]       │
│                                     │
│ [Đăng xuất] [Bắt đầu ca]           │
└─────────────────────────────────────┘
```

## Luồng xử lý

1. **Khởi tạo**: Dialog hiển thị với cửa hàng hiện tại được chọn sẵn
2. **Chọn cửa hàng**: User có thể chọn cửa hàng khác (nếu có quyền)
3. **Nhập tiền đầu ca**: User nhập số tiền mặt ban đầu
4. **Validation**: Kiểm tra đã chọn cửa hàng chưa
5. **Chuyển cửa hàng**: Nếu cần, chuyển đến cửa hàng đã chọn
6. **Bắt đầu ca**: Tạo ca làm việc mới tại cửa hàng đã chọn

## Quyền truy cập

- **Owner/Company Manager**: Có thể chọn tất cả cửa hàng trong hệ thống
- **Store Manager**: Có thể chọn các cửa hàng được phân quyền
- **Salesperson**: Có thể chọn các cửa hàng được phân quyền

## Xử lý lỗi

### Lỗi chưa chọn cửa hàng
```
Tiêu đề: "Chưa chọn cửa hàng"
Nội dung: "Vui lòng chọn cửa hàng để bắt đầu ca làm việc."
```

### Lỗi chuyển cửa hàng
```
Tiêu đề: "Lỗi chuyển cửa hàng"  
Nội dung: "Không thể chuyển đến cửa hàng đã chọn."
```

### Lỗi bắt đầu ca
```
Tiêu đề: "Lỗi bắt đầu ca"
Nội dung: [Chi tiết lỗi từ server]
```

## Thông báo thành công

```
Tiêu đề: "Đã bắt đầu ca mới"
Nội dung: "Bạn có thể bắt đầu bán hàng tại [Tên cửa hàng]."
```

## Implementation Details

### Components được cập nhật
- `StartShiftDialog`: Thêm store selector và logic chuyển cửa hàng

### Dependencies
- `useStore`: Lấy danh sách cửa hàng và chuyển cửa hàng
- `Select` components: UI cho dropdown chọn cửa hàng
- `Store` icon: Icon hiển thị trong dropdown

### State management
- `selectedStoreId`: ID cửa hàng được chọn
- `hasMultipleStores`: Kiểm tra có nhiều cửa hàng không
- Validation logic cho store selection

## Testing

Đã có unit tests để kiểm tra:
- Logic xác định nhiều cửa hàng
- Validation chọn cửa hàng
- Xử lý trường hợp edge cases