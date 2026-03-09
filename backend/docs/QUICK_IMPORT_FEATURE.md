# Chức Năng Nhập Nhanh Sản Phẩm Tồn Kho Thấp

## Tổng Quan

Chức năng "Nhập Nhanh" cho phép người dùng nhanh chóng nhập hàng cho các sản phẩm có tồn kho dưới ngưỡng cảnh báo. Đây là giải pháp tối ưu để quản lý và bổ sung hàng hóa kịp thời.

## Các Tính Năng Chính

### 1. Backend API

#### Endpoint: `GET /api/products/low-stock`
Lấy danh sách sản phẩm có tồn kho thấp

**Query Parameters:**
- `threshold` (optional): Ngưỡng tồn kho (mặc định: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "product-id",
      "name": "Tên sản phẩm",
      "sku": "SKU123",
      "price": 50000,
      "costPrice": 30000,
      "stockQuantity": 5,
      "currentStock": 5,
      "unitId": "unit-id",
      "unitName": "Hộp",
      "categoryName": "Danh mục",
      "categoryId": "category-id"
    }
  ],
  "threshold": 10,
  "total": 15
}
```

#### Endpoint: `POST /api/purchases/quick`
Tạo đơn nhập hàng nhanh cho 1 sản phẩm

**Request Body:**
```json
{
  "supplierId": "supplier-id",
  "productId": "product-id",
  "quantity": 20,
  "cost": 30000,
  "unitId": "unit-id",
  "importDate": "2024-01-15"
}
```

**Response:**
```json
{
  "id": "purchase-order-id",
  "orderNumber": "PO-2024-001",
  "supplierId": "supplier-id",
  "importDate": "2024-01-15",
  "totalAmount": 600000,
  "items": [...]
}
```

### 2. Frontend UI

#### Trang Nhập Nhanh: `/purchases/quick-import`

**Tính năng:**
- Hiển thị danh sách sản phẩm tồn kho thấp
- Cho phép điều chỉnh ngưỡng cảnh báo
- Badge màu sắc theo mức độ tồn kho:
  - Đỏ: Hết hàng (0) hoặc rất thấp (≤5)
  - Vàng: Thấp (≤10)
  - Xám: Bình thường (>10)
- Nút "Nhập hàng" cho từng sản phẩm

#### Dialog Nhập Nhanh

**Thông tin hiển thị:**
- Tên sản phẩm
- Mã SKU
- Tồn kho hiện tại
- Đơn vị tính

**Form nhập liệu:**
- Nhà cung cấp (bắt buộc)
- Ngày nhập (bắt buộc)
- Số lượng (bắt buộc, min: 1)
- Giá nhập (bắt buộc, min: 0)
- Tổng tiền (tự động tính)

### 3. Quy Trình Sử Dụng

1. **Truy cập trang Nhập Nhanh:**
   - Từ trang "Đơn nhập hàng" → Click "Nhập hàng" → Chọn "Nhập nhanh - Tồn kho thấp"
   - Hoặc truy cập trực tiếp: `/purchases/quick-import`

2. **Xem danh sách sản phẩm:**
   - Hệ thống hiển thị các sản phẩm có tồn kho ≤ ngưỡng
   - Điều chỉnh ngưỡng nếu cần và click "Làm mới"

3. **Nhập hàng:**
   - Click nút "Nhập hàng" ở sản phẩm cần nhập
   - Điền thông tin trong dialog:
     - Chọn nhà cung cấp
     - Nhập số lượng cần nhập
     - Xác nhận giá nhập
     - Chọn ngày nhập
   - Click "Nhập hàng" để hoàn tất

4. **Kết quả:**
   - Đơn nhập hàng được tạo tự động
   - Tồn kho được cập nhật
   - Danh sách sản phẩm tồn kho thấp được làm mới

## Lợi Ích

1. **Tiết kiệm thời gian:** Không cần tạo đơn nhập hàng phức tạp cho từng sản phẩm
2. **Quản lý chủ động:** Dễ dàng theo dõi và bổ sung hàng hóa kịp thời
3. **Giảm thiểu rủi ro:** Tránh tình trạng hết hàng ảnh hưởng đến kinh doanh
4. **Trực quan:** Badge màu sắc giúp nhận biết nhanh mức độ ưu tiên

## Cấu Hình

### Thay Đổi Ngưỡng Mặc Định

Trong file `cua-hang-sua-2/frontend/src/app/purchases/quick-import/page.tsx`:

```typescript
const [threshold, setThreshold] = useState(10); // Thay đổi giá trị mặc định
```

### Tùy Chỉnh Màu Badge

Trong hàm `getStockBadgeVariant`:

```typescript
const getStockBadgeVariant = (stock: number) => {
  if (stock === 0) return "destructive";
  if (stock <= 5) return "destructive";  // Điều chỉnh ngưỡng
  if (stock <= 10) return "default";     // Điều chỉnh ngưỡng
  return "secondary";
};
```

## Lưu Ý Kỹ Thuật

1. **Authentication:** Tất cả API đều yêu cầu token xác thực
2. **Store Context:** Cần có `X-Store-Id` header
3. **Validation:** Backend kiểm tra đầy đủ dữ liệu đầu vào
4. **Transaction:** Sử dụng transaction để đảm bảo tính toàn vẹn dữ liệu
5. **Error Handling:** Xử lý lỗi đầy đủ với thông báo rõ ràng

## Mở Rộng Tương Lai

- [ ] Thêm tính năng nhập hàng hàng loạt từ danh sách tồn kho thấp
- [ ] Tích hợp cảnh báo tự động qua email/SMS
- [ ] Lịch sử nhập hàng nhanh
- [ ] Đề xuất số lượng nhập dựa trên lịch sử bán hàng
- [ ] Export danh sách sản phẩm tồn kho thấp ra Excel
