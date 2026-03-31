# ⚡ Quick Gmail Setup

## 🚀 Bước 1: Tạo App Password
1. Vào: https://myaccount.google.com/apppasswords
2. Chọn **Mail** → **Other** → Nhập `Cua Hang Sua`
3. **Copy mật khẩu 16 ký tự** (dạng: abcd efgh ijkl mnop)

## 📝 Bước 2: Cập nhật .env
```env
SMTP_USER=your-email@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
SMTP_FROM=your-email@gmail.com
```

## 🧪 Bước 3: Test
```bash
npm run test:email
```

## ✅ Thành công khi thấy:
```
✅ Email test đã được gửi thành công!
📬 Kiểm tra hộp thư của your-email@gmail.com
🎉 Gmail SMTP đã hoạt động!
```

**Lưu ý:** Phải bật 2-Step Verification trước!