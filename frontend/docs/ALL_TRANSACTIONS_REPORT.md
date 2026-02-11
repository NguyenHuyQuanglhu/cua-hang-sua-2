# Báo Cáo Tất Cả Giao Dịch

## Tổng Quan

Trang "Tất cả Giao dịch" là một báo cáo tổng hợp hiển thị TẤT CẢ các giao dịch tài chính trong hệ thống, bao gồm:

1. **Bán hàng** - Doanh thu từ khách hàng
2. **Nhập hàng** - Chi phí mua hàng từ nhà cung cấp
3. **Thu tiền KH** - Thanh toán công nợ từ khách hàng
4. **Trả tiền NCC** - Thanh toán công nợ cho nhà cung cấp

## Mục Đích

### Đồng Bộ Hóa Dữ Liệu
- Khi admin/quản lý thanh toán công nợ từ bất kỳ trang nào (Công nợ KH, Công nợ NCC, Chi tiết đơn hàng), giao dịch đó sẽ tự động hiển thị trong trang này
- Không cần phải vào nhiều trang khác nhau để xem lịch sử giao dịch
- Tất cả dữ liệu được tập trung tại một nơi

### Báo Cáo Tổng Hợp
- Xem tổng quan về tất cả hoạt động tài chính
- So sánh doanh thu và chi phí
- Theo dõi dòng tiền vào/ra
- Phân tích xu hướng giao dịch

## Tính Năng

### 1. Thẻ Tóm Tắt (Summary Cards)

Hiển thị 4 chỉ số quan trọng:

```
┌─────────────────────┐  ┌─────────────────────┐
│ Doanh thu bán hàng  │  │ Chi phí nhập hàng   │
│ 📈 123,456,789 đ    │  │ 📦 98,765,432 đ     │
└─────────────────────┘  └─────────────────────┘

┌─────────────────────┐  ┌─────────────────────┐
│ Thu từ khách hàng   │  │ Trả nhà cung cấp    │
│ 💵 45,678,901 đ     │  │ 📉 32,109,876 đ     │
└─────────────────────┘  └─────────────────────┘
```

- **Doanh thu bán hàng**: Tổng giá trị các đơn bán hàng (màu xanh lá)
- **Chi phí nhập hàng**: Tổng giá trị các đơn nhập hàng (màu cam)
- **Thu từ khách hàng**: Tổng số tiền thu được từ thanh toán công nợ KH (màu xanh dương)
- **Trả nhà cung cấp**: Tổng số tiền đã trả cho NCC (màu đỏ)

### 2. Bộ Lọc

#### Lọc Theo Thời Gian
- Chọn khoảng thời gian tùy chỉnh
- Preset nhanh:
  - Tuần này
  - Tháng này
  - Quý này
  - Năm nay
  - Tất cả

#### Lọc Theo Loại Giao Dịch
- Tất cả
- Bán hàng
- Nhập hàng
- Thu tiền KH
- Trả tiền NCC

#### Tìm Kiếm
- Tìm theo tên đối tác (khách hàng hoặc nhà cung cấp)
- Tìm theo tham chiếu (số hóa đơn, ghi chú thanh toán)

### 3. Bảng Giao Dịch

Hiển thị chi tiết từng giao dịch:

| STT | Ngày | Loại giao dịch | Đối tác | Tham chiếu | Số tiền |
|-----|------|----------------|---------|------------|---------|
| 1 | 11/02/2026 14:30 | 🟢 Bán hàng | Nguyễn Văn A | HD-001 | 1,500,000 |
| 2 | 11/02/2026 10:15 | 🟠 Nhập hàng | NCC Vinamilk | PN-002 | 5,000,000 |
| 3 | 10/02/2026 16:45 | 🔵 Thu tiền KH | Trần Thị B | Thanh toán công nợ | 2,000,000 |
| 4 | 10/02/2026 09:00 | 🔴 Trả tiền NCC | NCC TH True Milk | Thanh toán công nợ NCC | 3,000,000 |

**Màu sắc:**
- 🟢 Xanh lá: Bán hàng (thu vào)
- 🟠 Cam: Nhập hàng (chi ra)
- 🔵 Xanh dương: Thu tiền KH (thu vào)
- 🔴 Đỏ: Trả tiền NCC (chi ra)

### 4. Sắp Xếp

Có thể sắp xếp theo:
- Ngày (mặc định: mới nhất trước)
- Loại giao dịch
- Đối tác (A-Z)
- Số tiền (cao đến thấp)

### 5. Xuất Excel

Xuất toàn bộ dữ liệu ra file Excel với các cột:
- STT
- Ngày
- Loại giao dịch
- Đối tác
- Tham chiếu
- Số tiền
- Ghi chú

## Cấu Trúc Dữ Liệu

### UnifiedTransaction Interface

```typescript
interface UnifiedTransaction {
  id: string;                    // Unique ID
  date: Date;                    // Ngày giao dịch
  type: TransactionType;         // Loại: sale | purchase | customer_payment | supplier_payment
  partnerName: string;           // Tên khách hàng hoặc NCC
  partnerId: string;             // ID của đối tác
  reference: string;             // Số hóa đơn hoặc ghi chú
  amount: number;                // Số tiền
  notes?: string;                // Ghi chú bổ sung
  originalData: any;             // Dữ liệu gốc (Sale | Payment | Purchase)
}
```

### Nguồn Dữ Liệu

1. **Sales** (Bán hàng)
   - API: `/api/sales`
   - Mapping: `transactionDate` → `date`, `customerName` → `partnerName`, `invoiceNumber` → `reference`

2. **Purchases** (Nhập hàng)
   - API: `/api/purchases`
   - Mapping: `purchaseDate` → `date`, `supplierName` → `partnerName`, `invoiceNumber` → `reference`

3. **Payments** (Thanh toán KH)
   - API: `/api/payments`
   - Mapping: `paymentDate` → `date`, `customerName` → `partnerName`, `notes` → `reference`

4. **SupplierPayments** (Thanh toán NCC)
   - API: `/api/supplier-payments`
   - Mapping: `paymentDate` → `date`, `supplierName` → `partnerName`, `notes` → `reference`

## Luồng Hoạt Động

### Khi Admin/Quản Lý Thanh Toán Công Nợ

#### Từ Trang "Công Nợ KH"
```
1. Admin vào trang "Công nợ KH"
2. Chọn khách hàng và nhấn "Thanh toán"
3. Nhập số tiền và ghi chú
4. Lưu thanh toán
   ↓
5. Hệ thống tạo record trong bảng Payments
   ↓
6. Trang "Tất cả Giao dịch" tự động hiển thị giao dịch này
   - Loại: "Thu tiền KH"
   - Đối tác: Tên khách hàng
   - Số tiền: Số tiền thanh toán
```

#### Từ Trang "Công Nợ NCC"
```
1. Admin vào trang "Công nợ NCC"
2. Chọn nhà cung cấp và nhấn "Thanh toán"
3. Nhập số tiền và ghi chú
4. Lưu thanh toán
   ↓
5. Hệ thống tạo record trong bảng SupplierPayments
   ↓
6. Trang "Tất cả Giao dịch" tự động hiển thị giao dịch này
   - Loại: "Trả tiền NCC"
   - Đối tác: Tên nhà cung cấp
   - Số tiền: Số tiền thanh toán
```

#### Từ Chi Tiết Đơn Hàng
```
1. Admin vào chi tiết đơn bán hàng/nhập hàng
2. Nhấn "Thanh toán" trực tiếp từ đơn
3. Nhập số tiền
4. Lưu thanh toán
   ↓
5. Hệ thống tạo record trong Payments hoặc SupplierPayments
   ↓
6. Trang "Tất cả Giao dịch" tự động hiển thị
```

## So Sánh Với Trang Cũ

### Trang "Lịch sử Giao dịch" (Cũ)
- Chỉ hiển thị giao dịch của **khách hàng**
- Bao gồm: Bán hàng + Thanh toán KH
- Nhóm theo khách hàng
- Hiển thị nợ đầu kỳ, phát sinh, thanh toán, nợ cuối kỳ

### Trang "Tất cả Giao dịch" (Mới)
- Hiển thị **TẤT CẢ** giao dịch tài chính
- Bao gồm: Bán hàng + Nhập hàng + Thanh toán KH + Thanh toán NCC
- Hiển thị theo thời gian (không nhóm)
- Tổng hợp 4 loại giao dịch trong một bảng

## Quyền Truy Cập

Trang này sử dụng quyền `reports_transactions`:
- Owner: Có quyền xem
- Company Manager: Có quyền xem
- Store Manager: Có quyền xem (nếu được cấp)
- Salesperson: Không có quyền (mặc định)

## Navigation

### Menu Sidebar
```
📊 Báo cáo & Quản lý
  ├─ 📈 Bảng điều khiển
  ├─ 💰 Thu-Chi
  ├─ 💵 Lợi nhuận
  ├─ 👥 Công nợ KH
  ├─ 🚚 Công nợ NCC
  ├─ 📜 Tất cả Giao dịch ⭐ MỚI
  ├─ 📋 Lịch sử GD Khách hàng
  ├─ 🔍 Đối soát Công nợ NCC
  └─ 📊 Doanh thu
```

### URL
- Trang mới: `/reports/all-transactions`
- Trang cũ: `/reports/transactions` (vẫn giữ nguyên)

## Use Cases

### 1. Kiểm Tra Dòng Tiền
**Mục đích**: Xem tổng quan về tiền vào/ra trong ngày

```
Bước 1: Vào trang "Tất cả Giao dịch"
Bước 2: Chọn "Hôm nay" trong bộ lọc ngày
Bước 3: Xem summary cards:
  - Thu vào = Doanh thu bán hàng + Thu từ KH
  - Chi ra = Chi phí nhập hàng + Trả NCC
  - Dòng tiền ròng = Thu vào - Chi ra
```

### 2. Đối Chiếu Thanh Toán
**Mục đích**: Kiểm tra xem đã thanh toán cho NCC chưa

```
Bước 1: Vào trang "Tất cả Giao dịch"
Bước 2: Lọc theo "Trả tiền NCC"
Bước 3: Tìm kiếm tên nhà cung cấp
Bước 4: Xem danh sách các lần thanh toán
```

### 3. Báo Cáo Tháng
**Mục đích**: Xuất báo cáo tất cả giao dịch trong tháng

```
Bước 1: Vào trang "Tất cả Giao dịch"
Bước 2: Chọn "Tháng này"
Bước 3: Nhấn "Xuất Excel"
Bước 4: Gửi file cho kế toán
```

### 4. Phân Tích Xu Hướng
**Mục đích**: Xem xu hướng giao dịch theo thời gian

```
Bước 1: Vào trang "Tất cả Giao dịch"
Bước 2: Chọn "Quý này"
Bước 3: Sắp xếp theo ngày
Bước 4: Quan sát:
  - Ngày nào có nhiều giao dịch nhất?
  - Loại giao dịch nào chiếm đa số?
  - Đối tác nào giao dịch thường xuyên?
```

## Lợi Ích

### Cho Admin/Quản Lý
✅ Tiết kiệm thời gian - Không cần vào nhiều trang khác nhau
✅ Tổng quan toàn diện - Nhìn thấy toàn bộ hoạt động tài chính
✅ Dễ dàng đối chiếu - Tất cả giao dịch ở một nơi
✅ Báo cáo nhanh - Xuất Excel với một click

### Cho Kế Toán
✅ Kiểm tra dòng tiền - Xem thu chi rõ ràng
✅ Đối chiếu công nợ - Dễ dàng tìm các khoản thanh toán
✅ Lập báo cáo - Xuất dữ liệu đầy đủ
✅ Audit trail - Theo dõi mọi giao dịch

### Cho Hệ Thống
✅ Đồng bộ dữ liệu - Tự động cập nhật khi có giao dịch mới
✅ Không trùng lặp - Mỗi giao dịch chỉ hiển thị một lần
✅ Performance tốt - Sử dụng useMemo để tối ưu
✅ Scalable - Dễ dàng thêm loại giao dịch mới

## Technical Notes

### Performance Optimization
- Sử dụng `useMemo` để cache dữ liệu đã xử lý
- Chỉ fetch data một lần khi component mount
- Filter và sort trên client-side (nhanh với dữ liệu nhỏ)

### Data Consistency
- Tất cả giao dịch đều có timestamp chính xác
- Sử dụng ID duy nhất cho mỗi giao dịch
- Giữ nguyên dữ liệu gốc trong `originalData`

### Future Enhancements
- Thêm biểu đồ timeline
- Export PDF với logo công ty
- Filter theo cửa hàng (multi-store)
- Thêm loại giao dịch: Điều chỉnh kho, Chi phí khác
- Real-time updates với WebSocket
