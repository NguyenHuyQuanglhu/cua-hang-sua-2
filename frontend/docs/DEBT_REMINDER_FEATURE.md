# Tính năng Nhắc nợ Khách hàng

## Tổng quan

Thay vì cho phép admin thanh toán hộ khách hàng, hệ thống cung cấp tính năng nhắc nợ để gửi thông báo đến khách hàng yêu cầu thanh toán.

## Chức năng

### 1. Nút "Nhắc nợ"
- Hiển thị trong cột "Hành động" của báo cáo công nợ
- Chỉ hiển thị cho khách hàng có nợ > 0
- Icon: Mail (thư)

### 2. Dialog Nhắc nợ

Khi nhấn nút "Nhắc nợ", hiển thị dialog với:

#### Thông tin khách hàng
- Tên khách hàng
- Số nợ hiện tại (màu đỏ, font lớn)
- Email (nếu có)
- Số điện thoại (nếu có)

#### Tùy chọn gửi Email
- **Nội dung mẫu**:
  ```
  Tiêu đề: Thông báo công nợ - [Tên KH]
  
  Kính gửi [Tên KH],
  
  Chúng tôi xin thông báo về công nợ hiện tại của quý khách:
  
  - Tổng phát sinh: [số tiền]
  - Đã thanh toán: [số tiền]
  - Còn nợ: [số tiền]
  
  Quý khách vui lòng thanh toán số tiền còn nợ trong thời gian sớm nhất.
  
  Trân trọng,
  Cửa hàng
  ```

- **Nút "Sao chép"**: Copy nội dung email vào clipboard
- **Nút "Gửi Email"**: Mở ứng dụng email mặc định với nội dung đã điền sẵn
- Disable nếu khách hàng không có email

#### Tùy chọn gửi SMS
- **Nội dung mẫu**:
  ```
  [Nhắc nợ] Kính gửi [Tên KH], quý khách còn nợ [số tiền]. 
  Vui lòng thanh toán sớm. Xin cảm ơn!
  ```

- **Nút "Sao chép"**: Copy nội dung SMS vào clipboard
- **Nút "Gửi SMS"**: Mở ứng dụng tin nhắn với nội dung đã điền sẵn
- Disable nếu khách hàng không có số điện thoại

#### Mẹo sử dụng
- Có thể sao chép nội dung và gửi qua các ứng dụng khác như Zalo, Messenger, Telegram, v.v.

## Luồng sử dụng

1. Admin vào trang "Báo cáo công nợ khách hàng"
2. Xem danh sách khách hàng có nợ
3. Nhấn nút "Nhắc nợ" cho khách hàng cần nhắc
4. Chọn phương thức:
   - **Email**: Nhấn "Gửi Email" → Ứng dụng email mở ra → Gửi
   - **SMS**: Nhấn "Gửi SMS" → Ứng dụng tin nhắn mở ra → Gửi
   - **Sao chép**: Nhấn nút sao chép → Dán vào ứng dụng khác (Zalo, Messenger)

## Lợi ích

1. **Đúng quy trình**: Khách hàng tự thanh toán, không phải admin thanh toán hộ
2. **Linh hoạt**: Hỗ trợ nhiều kênh gửi (Email, SMS, hoặc copy sang app khác)
3. **Chuyên nghiệp**: Nội dung nhắc nợ được soạn sẵn, thống nhất
4. **Tiện lợi**: Chỉ cần 1-2 click để gửi thông báo

## Technical Details

### Components
- `debt-reminder-dialog.tsx`: Dialog chính
- `page.tsx`: Trang báo cáo công nợ (đã cập nhật)

### Features
- Copy to clipboard API
- mailto: protocol để mở email client
- sms: protocol để mở SMS app
- Toast notifications
- Responsive design

### Data Required
- Customer name (required)
- Debt amount (required)
- Email (optional)
- Phone (optional)

## Ngày cập nhật

2025-02-11
