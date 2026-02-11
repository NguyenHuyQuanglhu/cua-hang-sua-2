# Dashboard Tổng quan

## Tổng quan

Dashboard là trang chính hiển thị tổng quan toàn bộ hoạt động kinh doanh của cửa hàng. Giúp quản lý nắm bắt nhanh tình hình kinh doanh qua các chỉ số và biểu đồ trực quan.

## Tính năng

### 1. Thẻ thống kê (Stats Cards)

**Doanh thu tháng này**
- Hiển thị tổng doanh thu tháng hiện tại
- So sánh % thay đổi với tháng trước
- Icon mũi tên lên/xuống theo xu hướng

**Lợi nhuận tháng này**
- Tổng lợi nhuận (doanh thu - giá vốn)
- % thay đổi so với tháng trước
- Màu xanh/đỏ theo tăng/giảm

**Đơn hàng tháng này**
- Số lượng đơn hàng đã bán
- % thay đổi so với tháng trước

**Tồn kho**
- Tổng số sản phẩm
- Cảnh báo số sản phẩm sắp hết hàng

### 2. Biểu đồ doanh thu

**Tính năng:**
- Biểu đồ cột hiển thị doanh thu theo ngày
- Chọn khoảng thời gian: 7 ngày, 30 ngày, 90 ngày
- Hover để xem chi tiết doanh thu từng ngày
- Tự động scale theo giá trị cao nhất

**Cách hoạt động:**
- Lấy dữ liệu từ Sales Report API
- Group theo ngày
- Hiển thị dưới dạng bar chart đơn giản

### 3. Top sản phẩm bán chạy

**Hiển thị:**
- Top 5 sản phẩm có doanh số cao nhất
- Thứ hạng (1-5)
- Tên sản phẩm
- Số lượng đã bán
- Tổng doanh thu

**Sắp xếp:** Theo tổng doanh thu giảm dần

### 4. Cảnh báo tồn kho thấp

**Tính năng:**
- Hiển thị tối đa 5 sản phẩm sắp hết hàng
- Điều kiện: `currentStock <= lowStockThreshold`
- Hiển thị số lượng còn lại và ngưỡng tối thiểu
- Nút "Nhập hàng" để nhập nhanh
- Link "Xem tất cả" đến báo cáo tồn kho

**Trạng thái:**
- Có sản phẩm sắp hết: Hiển thị danh sách với viền cam
- Không có: Hiển thị "✓ Tất cả sản phẩm đều đủ hàng"

### 5. Tổng quan công nợ

**Hiển thị:**
- **Khách hàng nợ**: Tổng công nợ phải thu
- **Nợ nhà cung cấp**: Tổng công nợ phải trả
- **Vị thế ròng**: Chênh lệch giữa 2 loại nợ
  - Xanh: Khách hàng nợ > Nợ NCC (tốt)
  - Đỏ: Nợ NCC > Khách hàng nợ (cần chú ý)

**Link nhanh:**
- "Xem chi tiết" đến báo cáo công nợ tương ứng

## Cấu trúc File

```
frontend/src/app/dashboard/
├── page.tsx                          # Trang chính
└── components/
    ├── revenue-chart.tsx             # Biểu đồ doanh thu
    ├── top-products-table.tsx        # Bảng top sản phẩm
    ├── low-stock-alert.tsx           # Cảnh báo tồn kho
    └── debt-overview.tsx             # Tổng quan công nợ
```

## API sử dụng

- `getSalesReport()` - Dữ liệu doanh thu và đơn hàng
- `getInventoryReport()` - Dữ liệu tồn kho
- `getDebtReport()` - Công nợ khách hàng
- `getSupplierDebtReport()` - Công nợ nhà cung cấp
- `getProfitReport()` - Lợi nhuận
- `getSoldProductsReport()` - Sản phẩm đã bán

## Responsive Design

- Desktop: Grid 4 cột cho stats cards
- Tablet: Grid 2 cột
- Mobile: 1 cột, stack vertically

## Performance

- Fetch tất cả data song song với `Promise.all()`
- Loading state cho từng component
- Cache data trong component state
- Re-fetch khi thay đổi timeRange

## Lợi ích

1. ✅ **Nhanh chóng**: Nắm bắt tình hình kinh doanh trong 1 màn hình
2. ✅ **Trực quan**: Biểu đồ và số liệu dễ hiểu
3. ✅ **Cảnh báo**: Phát hiện sớm vấn đề (tồn kho thấp, công nợ)
4. ✅ **So sánh**: Thấy xu hướng tăng/giảm so với tháng trước
5. ✅ **Hành động nhanh**: Link trực tiếp đến các trang chi tiết

## Cải tiến tương lai

- [ ] Thêm biểu đồ tròn phân bổ doanh thu theo danh mục
- [ ] Thêm so sánh doanh thu theo cửa hàng
- [ ] Thêm dự báo doanh thu tháng tới
- [ ] Thêm widget tùy chỉnh (drag & drop)
- [ ] Export dashboard thành PDF

## Ngày tạo

2025-02-11
