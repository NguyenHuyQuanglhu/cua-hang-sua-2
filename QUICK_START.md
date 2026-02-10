# 🚀 Quick Start Guide - Hệ Thống Quản Lý Cửa Hàng Sữa

## 📋 Yêu Cầu Hệ Thống

- Node.js >= 18.x
- npm >= 9.x
- SQL Server (đã cấu hình)
- Windows OS (hoặc Linux/Mac với điều chỉnh nhỏ)

## ⚡ Khởi Động Nhanh

### 1. Khởi động Backend

```bash
cd cua-hang-sua-2/backend
npm run dev
```

Backend sẽ chạy tại: **http://localhost:3001**

### 2. Khởi động Frontend (Terminal mới)

```bash
cd cua-hang-sua-2/frontend
npm run dev
```

Frontend sẽ chạy tại: **http://localhost:3000**

### 3. Kiểm tra hệ thống

```bash
cd cua-hang-sua-2
powershell -ExecutionPolicy Bypass -File test-api.ps1
```

## 🔐 Đăng Nhập

Mở trình duyệt và truy cập: **http://localhost:3000**

Sử dụng tài khoản có sẵn trong database để đăng nhập.

## 📱 Các Tính Năng Chính

### 1. 🏪 Quản Lý Bán Hàng (POS)
- Đường dẫn: `/pos`
- Tính năng:
  - Bán hàng nhanh
  - Quét mã vạch
  - Quản lý ca làm việc
  - Tính lương theo giờ
  - **MỚI:** Quản lý tăng ca tự động

### 2. 👥 Quản Lý Khách Hàng
- Đường dẫn: `/customers`
- Tính năng:
  - Thêm/sửa/xóa khách hàng
  - Quản lý công nợ
  - Lịch sử mua hàng
  - Gửi nhắc nợ (email/SMS)

### 3. 📦 Quản Lý Sản Phẩm
- Đường dẫn: `/products`
- Tính năng:
  - Thêm/sửa/xóa sản phẩm
  - Quản lý tồn kho
  - Đơn vị tính đa dạng
  - Upload hình ảnh

### 4. 📊 Báo Cáo
- Đường dẫn: `/reports`
- Tính năng:
  - Báo cáo doanh thu
  - Báo cáo công nợ
  - Báo cáo tồn kho
  - Xuất Excel

### 5. ⏰ Quản Lý Ca Làm Việc
- Đường dẫn: `/shifts`
- Tính năng:
  - Mở/đóng ca
  - Tính lương theo giờ
  - **MỚI:** Hỏi tăng ca khi đủ 8 tiếng
  - **MỚI:** Tự động đóng ca khi đủ 12 tiếng
  - Đối soát tiền mặt

## 🎯 Tính Năng Mới: Quản Lý Tăng Ca

### Cách Hoạt Động

1. **Khi nhân viên làm đủ 8 tiếng:**
   - Hệ thống hiển thị dialog hỏi có muốn tăng ca không
   - Hiển thị lương hiện tại đã tính
   - 2 lựa chọn:
     - ✅ **Có, tôi muốn tăng ca** → Tiếp tục làm đến 12 tiếng
     - ❌ **Không, đóng ca ngay** → Yêu cầu đóng ca

2. **Khi nhân viên làm đủ 12 tiếng:**
   - Hệ thống tự động thông báo đã đạt giới hạn
   - Yêu cầu đóng ca bắt buộc

### Lợi Ích

- ⏱️ Quản lý giờ làm chính xác
- 💰 Tính lương công bằng
- 🚫 Tránh làm việc quá giờ
- 📊 Dữ liệu rõ ràng cho báo cáo

## 🔧 Cấu Hình

### Backend (.env)

File: `backend/.env`

```env
# Database
DB_SERVER=118.69.126.49
DB_NAME=Data_quanlybanhang_online
DB_USER=userquanlybanhangonline
DB_PASSWORD=123456789
DB_PORT=1433

# JWT
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Server
PORT=3001
NODE_ENV=development

# CORS
FRONTEND_URL=http://localhost:3000
```

### Frontend

File: `frontend/.env.local` (tạo nếu chưa có)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 🐛 Xử Lý Lỗi Thường Gặp

### 1. Backend không kết nối được database

**Lỗi:** `Connection failed to SQL Server`

**Giải pháp:**
- Kiểm tra SQL Server đang chạy
- Kiểm tra thông tin kết nối trong `.env`
- Kiểm tra firewall

### 2. Frontend không gọi được API

**Lỗi:** `Failed to fetch` hoặc `Network Error`

**Giải pháp:**
- Đảm bảo backend đang chạy
- Kiểm tra CORS settings
- Xóa cache browser (Ctrl + Shift + Delete)

### 3. Lỗi "Port already in use"

**Lỗi:** `EADDRINUSE: address already in use :::3000`

**Giải pháp:**

```bash
# Tìm process đang dùng port
netstat -ano | findstr :3000

# Kill process (thay PID bằng số thực tế)
taskkill /PID <PID> /F
```

### 4. TypeScript errors

**Giải pháp:**

```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

## 📝 Logs & Debug

### Xem Backend Logs

Backend tự động log tất cả requests:
```
[2026-02-10T...] GET /api/products
Headers: { authorization: 'Bearer ***', x-store-id: '...' }
```

### Xem Frontend Logs

Mở Browser DevTools (F12):
- **Console tab:** Xem JavaScript errors
- **Network tab:** Xem API calls
- **Application tab:** Xem localStorage/cookies

## 🧪 Testing

### Test API Endpoints

```bash
cd cua-hang-sua-2
powershell -ExecutionPolicy Bypass -File test-api.ps1
```

### Test Manual

```bash
# Health check
curl http://localhost:3001/health

# Test login (sẽ fail nhưng endpoint hoạt động)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'
```

## 📚 Tài Liệu Bổ Sung

- `SYSTEM_STATUS.md` - Trạng thái hệ thống và bugs đã sửa
- `README.md` - Tổng quan dự án
- `backend/README.md` - Chi tiết backend API
- `frontend/README.md` - Chi tiết frontend

## 🆘 Hỗ Trợ

Nếu gặp vấn đề:

1. Kiểm tra logs trong terminal
2. Kiểm tra browser console (F12)
3. Xem file `SYSTEM_STATUS.md` để biết các vấn đề đã biết
4. Restart cả backend và frontend

## ✅ Checklist Sau Khi Khởi Động

- [ ] Backend chạy tại port 3001
- [ ] Frontend chạy tại port 3000
- [ ] Health check trả về `{"status":"ok"}`
- [ ] Có thể truy cập http://localhost:3000
- [ ] Có thể đăng nhập
- [ ] Có thể mở ca làm việc
- [ ] Có thể tạo đơn hàng

## 🎉 Sẵn Sàng!

Hệ thống đã sẵn sàng sử dụng. Chúc bạn làm việc hiệu quả! 🚀
