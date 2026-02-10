# 💰 Hướng Dẫn Thanh Toán Nợ

## 🎯 Có 2 Cách Thanh Toán Nợ

### Cách 1: Thanh Toán Nợ Cùng Đơn Hàng

**Khi nào dùng:** Khách hàng vừa mua hàng vừa muốn trả nợ cũ

**Các bước:**
1. Mở POS: `/pos`
2. Chọn khách hàng có nợ
3. Thêm sản phẩm vào giỏ hàng
4. ✅ Tích checkbox **"Thanh toán cả nợ cũ (XXX đ)"**
5. Nhập tiền khách đưa (tự động = Tổng đơn + Nợ)
6. Nhấn **"Thanh toán"**
7. Chọn phương thức thanh toán

**Kết quả:**
- ✅ Tạo đơn hàng mới
- ✅ Tạo payment record cho nợ cũ
- ✅ Cập nhật công nợ khách hàng

---

### Cách 2: Thanh Toán Nợ Riêng (KHÔNG MUA HÀNG)

**Khi nào dùng:** Khách hàng chỉ muốn trả nợ, không mua hàng

**Các bước:**
1. Mở POS: `/pos`
2. Chọn khách hàng có nợ
3. **KHÔNG** thêm sản phẩm vào giỏ (để giỏ trống)
4. ✅ Tích checkbox **"Thanh toán cả nợ cũ (XXX đ)"**
5. Nhập tiền khách đưa (≥ số nợ)
6. Nhấn **"Thanh toán nợ"** (nút sẽ đổi text)
7. Chọn phương thức thanh toán

**Kết quả:**
- ✅ Tạo payment record cho nợ
- ✅ Cập nhật công nợ khách hàng
- ✅ KHÔNG tạo đơn hàng (vì không có sản phẩm)

---

## 📊 So Sánh 2 Cách

| Tiêu chí | Thanh toán cùng đơn | Thanh toán riêng |
|----------|---------------------|------------------|
| Có sản phẩm | ✅ Có | ❌ Không |
| Tạo đơn hàng | ✅ Có | ❌ Không |
| Tạo payment record | ✅ Có | ✅ Có |
| Cập nhật nợ | ✅ Có | ✅ Có |
| Nút thanh toán | "Thanh toán" | "Thanh toán nợ" |

---

## 🖼️ Ví Dụ Minh Họa

### Ví Dụ 1: Thanh Toán Nợ Riêng

**Tình huống:**
- Khách hàng: Nguyễn Văn A
- Nợ cũ: 1,500,000 đ
- Không mua hàng

**Màn hình POS:**
```
┌─────────────────────────────────────────┐
│ Khách hàng: Nguyễn Văn A               │
│ Giỏ hàng: (Trống)                      │
├─────────────────────────────────────────┤
│ Khách cần trả              0            │
│ Nợ cũ                      1,500,000    │
│                                         │
│ ☑ Thanh toán cả nợ cũ (1,500,000)      │
│                                         │
│ Tổng phải trả              1,500,000    │
│                                         │
│ Tiền khách đưa                          │
│ ┌─────────────────────────────────────┐ │
│ │           1,500,000                 │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Tiền thối lại              0            │
│                                         │
│ [Hủy]          [Thanh toán nợ]         │
└─────────────────────────────────────────┘
```

**Sau khi thanh toán:**
```
┌─────────────────────────────────────────┐
│ 💰 Thanh toán nợ thành công!           │
│                                         │
│ Đã thanh toán: 1,500,000 đ             │
│ Phương thức: Tiền mặt                   │
│                                         │
│ Nợ còn lại: 0 đ                        │
└─────────────────────────────────────────┘
```

---

### Ví Dụ 2: Thanh Toán Nợ Cùng Đơn Hàng

**Tình huống:**
- Khách hàng: Nguyễn Văn A
- Nợ cũ: 1,500,000 đ
- Mua thêm: 500,000 đ

**Màn hình POS:**
```
┌─────────────────────────────────────────┐
│ Khách hàng: Nguyễn Văn A               │
│ Giỏ hàng: 2 sản phẩm                   │
├─────────────────────────────────────────┤
│ Khách cần trả              500,000      │
│ Nợ cũ                      1,500,000    │
│                                         │
│ ☑ Thanh toán cả nợ cũ (1,500,000)      │
│                                         │
│ Tổng phải trả              2,000,000    │
│                                         │
│ Tiền khách đưa                          │
│ ┌─────────────────────────────────────┐ │
│ │           2,000,000                 │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Tiền thối lại              0            │
│                                         │
│ [Hủy]          [Thanh toán]            │
└─────────────────────────────────────────┘
```

**Sau khi thanh toán:**
```
┌─────────────────────────────────────────┐
│ ✅ Thanh toán thành công!               │
│                                         │
│ Đơn hàng PN2026020001 đã được tạo      │
│ Phương thức: Tiền mặt                   │
│ ✓ Đã thanh toán nợ cũ: 1,500,000 đ     │
│                                         │
│                        [In hóa đơn]     │
└─────────────────────────────────────────┘
```

---

## ⚠️ Lưu Ý Quan Trọng

### 1. Điều Kiện Thanh Toán Nợ Riêng

- ✅ Phải chọn khách hàng (không phải khách vãng lai)
- ✅ Khách hàng phải có nợ > 0
- ✅ Giỏ hàng phải trống (không có sản phẩm)
- ✅ Phải tích checkbox "Thanh toán cả nợ cũ"
- ✅ Tiền khách đưa ≥ số nợ

### 2. Nút Thanh Toán

Nút sẽ tự động đổi text:
- **"Thanh toán"** - Khi có sản phẩm trong giỏ
- **"Thanh toán nợ"** - Khi giỏ trống + tích checkbox nợ

### 3. Tiền Thối Lại

Nếu khách đưa nhiều hơn số nợ:
- Hệ thống tính tiền thối
- Hiển thị trong toast thông báo
- Nhân viên cần thối tiền cho khách

### 4. Lịch Sử Thanh Toán

Cả 2 cách đều lưu vào bảng `Payments`:
- Xem tại: **Khách hàng** → Chi tiết → **Lịch sử thanh toán**
- Hoặc: **Báo cáo** → **Công nợ khách hàng**

---

## 🔍 Kiểm Tra Thanh Toán

### Sau Khi Thanh Toán, Kiểm Tra:

1. **Công nợ khách hàng đã giảm?**
   - Vào trang **Khách hàng**
   - Tìm khách hàng vừa thanh toán
   - Xem cột "Nợ hiện tại"

2. **Có payment record không?**
   - Vào chi tiết khách hàng
   - Tab **"Lịch sử thanh toán"**
   - Xem record mới nhất

3. **Nếu có đơn hàng, kiểm tra:**
   - Vào trang **Đơn hàng**
   - Tìm đơn hàng mới
   - Xem field "Nợ cũ đã thanh toán"

---

## 🐛 Xử Lý Lỗi

### Lỗi: "Vui lòng chọn khách hàng"
**Nguyên nhân:** Chưa chọn khách hàng hoặc đang chọn khách vãng lai  
**Giải pháp:** Chọn khách hàng có tài khoản

### Lỗi: "Khách hàng không có nợ"
**Nguyên nhân:** Khách hàng đã trả hết nợ  
**Giải pháp:** Kiểm tra lại công nợ khách hàng

### Lỗi: "Số tiền không đủ"
**Nguyên nhân:** Tiền khách đưa < số nợ  
**Giải pháp:** Nhập số tiền ≥ số nợ cần thanh toán

### Lỗi: "Không thể ghi nhận thanh toán"
**Nguyên nhân:** Lỗi kết nối hoặc database  
**Giải pháp:** 
1. Kiểm tra kết nối internet
2. Kiểm tra backend đang chạy
3. Thử lại sau vài giây

---

## 📱 Tips & Tricks

### Tip 1: Thanh Toán Nhanh
Khi khách chỉ trả nợ:
1. Chọn khách hàng
2. Tích checkbox
3. Enter (tự động focus vào tiền khách đưa)
4. Nhập số tiền
5. Enter (mở dialog chọn phương thức)
6. Chọn phương thức
7. Xong!

### Tip 2: Kiểm Tra Nợ Nhanh
- Khi chọn khách hàng, số nợ hiển thị ngay
- Màu đỏ = Có nợ
- Màu xanh = Không nợ

### Tip 3: In Biên Lai
Sau khi thanh toán nợ riêng:
- Vào **Khách hàng** → Chi tiết
- Tab **Lịch sử thanh toán**
- Nhấn nút **In** bên cạnh payment record

---

## ✅ Checklist Thanh Toán Nợ

Trước khi thanh toán, đảm bảo:
- [ ] Đã chọn đúng khách hàng
- [ ] Xác nhận số nợ chính xác
- [ ] Đã tích checkbox "Thanh toán cả nợ cũ"
- [ ] Số tiền khách đưa đủ
- [ ] Đã chọn phương thức thanh toán đúng
- [ ] Nếu có tiền thối, đã chuẩn bị tiền lẻ

Sau khi thanh toán:
- [ ] Kiểm tra toast thông báo thành công
- [ ] Xác nhận nợ đã giảm
- [ ] Thối tiền cho khách (nếu có)
- [ ] In biên lai (nếu khách yêu cầu)

---

**Lưu ý:** Tính năng này giúp nhân viên xử lý thanh toán nợ nhanh chóng mà không cần rời khỏi màn hình POS!
