# 📧 Hướng dẫn Setup Gmail SMTP

## Bước 1: Tạo App Password cho Gmail

### 1.1 Bật 2-Step Verification
1. Đi tới [Google Account Security](https://myaccount.google.com/security)
2. Tìm mục **"2-Step Verification"**
3. Bật tính năng này nếu chưa có

### 1.2 Tạo App Password
1. Vào [App Passwords](https://myaccount.google.com/apppasswords)
2. Chọn **"Mail"** và **"Other (custom name)"**
3. Nhập tên: `Cua Hang Sua System`
4. Click **"Generate"**
5. **Lưu lại mật khẩu 16 ký tự** (dạng: xxxx xxxx xxxx xxxx)

## Bước 2: Cập nhật file .env

Mở file `backend/.env` và thay đổi:

```env
# Email Configuration - Gmail SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
SMTP_FROM=your-email@gmail.com
```

**Thay thế:**
- `your-email@gmail.com` → Email Gmail của bạn
- `xxxx xxxx xxxx xxxx` → App Password vừa tạo (giữ nguyên dấu cách)

## Bước 3: Restart Backend

```bash
# Dừng backend hiện tại (Ctrl+C)
# Sau đó chạy lại:
npm run dev
```

## Bước 4: Test Email

Hệ thống sẽ gửi email khi:
- ✅ Khách hàng nợ quá hạn (debt reminder)
- ✅ Tồn kho sắp hết
- ✅ Đăng ký tài khoản mới
- ✅ Reset mật khẩu

## ⚠️ Lưu ý quan trọng:

1. **Không dùng mật khẩu Gmail thường** - Chỉ dùng App Password
2. **Giữ bí mật App Password** - Không share cho ai
3. **Nếu lỗi "Less secure app"** - Đảm bảo đã bật 2-Step Verification
4. **Port 587** với **STARTTLS** - Đây là cấu hình chuẩn Gmail

## 🔧 Troubleshooting:

### Lỗi "Invalid login"
- Kiểm tra email đúng chưa
- Kiểm tra App Password (16 ký tự, có dấu cách)
- Đảm bảo 2-Step Verification đã bật

### Lỗi "Connection timeout"
- Kiểm tra firewall/antivirus
- Thử port 465 với SSL thay vì 587

### Test thủ công:
```bash
# Trong backend directory:
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransporter({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-app-password'
  }
});
transporter.sendMail({
  from: 'your-email@gmail.com',
  to: 'test@example.com',
  subject: 'Test Email',
  text: 'Hello from Cua Hang Sua!'
}).then(() => console.log('✅ Email sent!')).catch(console.error);
"
```

## 📞 Hỗ trợ:
Nếu gặp vấn đề, kiểm tra log backend để xem lỗi cụ thể.