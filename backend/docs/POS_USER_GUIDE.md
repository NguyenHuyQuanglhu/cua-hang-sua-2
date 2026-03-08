# Hướng dẫn Sử dụng - Cải tiến Giao diện POS

## Giới thiệu

Tài liệu này hướng dẫn nhân viên sử dụng các tính năng mới trong hệ thống POS:
- **Kiểm soát In hóa đơn**: Tùy chọn in hoặc bỏ qua in hóa đơn sau khi thanh toán
- **Hệ thống Trạng thái Đơn giản**: Chỉ còn 2 trạng thái đơn hàng dễ hiểu
- **Bộ lọc Trạng thái**: Tìm kiếm đơn hàng nhanh chóng theo trạng thái

---

## 1. Tính năng Kiểm soát In hóa đơn

### 1.1 Tổng quan

Tính năng này cho phép bạn chọn có in hóa đơn hay không sau khi hoàn tất thanh toán. Điều này giúp tiết kiệm thời gian khi khách hàng không cần hóa đơn giấy.

### 1.2 Cách sử dụng

#### Bước 1: Tìm checkbox "In hóa đơn"

Khi bạn vào màn hình thanh toán trong POS, bạn sẽ thấy một checkbox có nhãn **"In hóa đơn"** trong khu vực thanh toán.

![Vị trí checkbox In hóa đơn](images/print-checkbox-location.png)

#### Bước 2: Chọn tùy chọn in

- **Tích vào checkbox** (✓): Sau khi thanh toán thành công, hệ thống sẽ hiển thị hộp thoại in hóa đơn
- **Bỏ tích checkbox** (☐): Sau khi thanh toán thành công, hệ thống sẽ bỏ qua in hóa đơn và chuyển thẳng đến màn hình tiếp theo

#### Bước 3: Hoàn tất thanh toán

Tiến hành thanh toán như bình thường. Hệ thống sẽ tự động xử lý theo lựa chọn của bạn.

### 1.3 Lưu ý quan trọng

✅ **Mặc định**: Checkbox luôn được tích sẵn khi bạn mở màn hình thanh toán

✅ **Ghi nhớ lựa chọn**: Hệ thống sẽ nhớ lựa chọn cuối cùng của bạn. Nếu bạn bỏ tích checkbox, lần thanh toán tiếp theo checkbox vẫn sẽ ở trạng thái bỏ tích

✅ **Tooltip hướng dẫn**: Di chuột lên checkbox để xem thêm thông tin hướng dẫn

### 1.4 Khi nào nên sử dụng

| Tình huống | Nên chọn |
|-----------|----------|
| Khách hàng yêu cầu hóa đơn giấy | ✓ Tích checkbox |
| Khách hàng không cần hóa đơn | ☐ Bỏ tích checkbox |
| Giao dịch nội bộ/test | ☐ Bỏ tích checkbox |
| Khách hàng chỉ cần hóa đơn điện tử | ☐ Bỏ tích checkbox |

### 1.5 Xử lý sự cố

**Vấn đề**: Checkbox không lưu lựa chọn của tôi

**Giải pháp**: 
- Kiểm tra trình duyệt có cho phép lưu dữ liệu cục bộ (localStorage)
- Nếu đang dùng chế độ duyệt web riêng tư, hệ thống sẽ không lưu được lựa chọn
- Liên hệ bộ phận IT nếu vấn đề vẫn tiếp diễn

---

## 2. Hệ thống Trạng thái Đơn hàng Mới

### 2.1 Tổng quan

Hệ thống trạng thái đơn hàng đã được đơn giản hóa từ 4 trạng thái xuống còn **2 trạng thái** dễ hiểu:

| Trạng thái | Ý nghĩa | Màu hiển thị |
|-----------|---------|--------------|
| **Chưa xử lý** | Đơn hàng đang chờ xử lý hoặc chưa hoàn tất | 🟡 Vàng |
| **Đã xử lý** | Đơn hàng đã hoàn tất (thanh toán thành công hoặc đã hủy) | 🟢 Xanh lá |

### 2.2 Vòng đời đơn hàng

```
┌─────────────────┐
│  Tạo đơn hàng   │
└────────┬────────┘
         │
         ▼
   ┌──────────────┐
   │  Chưa xử lý  │ ◄─── Đơn hàng mới tạo
   └──────┬───────┘
          │
          │ (Thanh toán thành công HOẶC Hủy đơn)
          │
          ▼
   ┌──────────────┐
   │   Đã xử lý   │ ◄─── Đơn hàng đã hoàn tất
   └──────────────┘
```

### 2.3 Chi tiết từng trạng thái

#### Trạng thái "Chưa xử lý" (Pending)

**Khi nào đơn hàng có trạng thái này?**
- Đơn hàng vừa được tạo mới
- Đơn hàng đang chờ thanh toán
- Đơn hàng đang trong quá trình xử lý

**Màu hiển thị**: 🟡 Vàng/Cam

**Hành động có thể thực hiện**:
- Tiếp tục xử lý đơn hàng
- Thanh toán đơn hàng
- Hủy đơn hàng

#### Trạng thái "Đã xử lý" (Processed)

**Khi nào đơn hàng có trạng thái này?**
- Đơn hàng đã thanh toán thành công
- Đơn hàng đã bị hủy

**Màu hiển thị**: 🟢 Xanh lá

**Hành động có thể thực hiện**:
- Xem lại thông tin đơn hàng
- In lại hóa đơn (nếu cần)
- Xuất báo cáo

### 2.4 So sánh với hệ thống cũ

Nếu bạn đã quen với hệ thống trạng thái cũ, đây là cách ánh xạ:

| Trạng thái cũ | Trạng thái mới |
|--------------|---------------|
| Draft (Nháp) | Chưa xử lý |
| Printed (Đã in) | Chưa xử lý |
| Completed (Hoàn tất) | Đã xử lý |
| Cancelled (Đã hủy) | Đã xử lý |

---

## 3. Sử dụng Bộ lọc Trạng thái

### 3.1 Tổng quan

Bộ lọc trạng thái giúp bạn nhanh chóng tìm kiếm đơn hàng theo trạng thái xử lý. Tính năng này có sẵn trong trang **Danh sách Đơn hàng**.

### 3.2 Cách sử dụng

#### Bước 1: Mở trang Danh sách Đơn hàng

Từ menu chính, chọn **Bán hàng** → **Danh sách Đơn hàng**

#### Bước 2: Chọn bộ lọc

Bạn sẽ thấy 3 tùy chọn lọc ở đầu trang:

```
┌─────────────────────────────────────────────────┐
│  ○ Tất cả (150)                                 │
│  ○ Chưa xử lý (25)                              │
│  ○ Đã xử lý (125)                               │
└─────────────────────────────────────────────────┘
```

- **Tất cả**: Hiển thị tất cả đơn hàng (mặc định)
- **Chưa xử lý**: Chỉ hiển thị đơn hàng đang chờ xử lý
- **Đã xử lý**: Chỉ hiển thị đơn hàng đã hoàn tất

**Lưu ý**: Số trong ngoặc () cho biết số lượng đơn hàng trong mỗi trạng thái

#### Bước 3: Xem kết quả

Danh sách đơn hàng sẽ tự động cập nhật theo bộ lọc bạn chọn. Mỗi đơn hàng sẽ hiển thị badge trạng thái với màu tương ứng.

### 3.3 Ví dụ sử dụng thực tế

#### Ví dụ 1: Kiểm tra đơn hàng chưa xử lý

**Tình huống**: Bạn muốn xem tất cả đơn hàng đang chờ xử lý để ưu tiên xử lý

**Cách làm**:
1. Vào trang Danh sách Đơn hàng
2. Chọn bộ lọc **"Chưa xử lý"**
3. Hệ thống hiển thị tất cả đơn hàng có badge 🟡 "Chưa xử lý"
4. Xử lý từng đơn hàng theo thứ tự ưu tiên

#### Ví dụ 2: Xem đơn hàng đã hoàn tất trong ngày

**Tình huống**: Cuối ngày, bạn muốn xem tất cả đơn hàng đã xử lý để đối chiếu doanh thu

**Cách làm**:
1. Vào trang Danh sách Đơn hàng
2. Chọn bộ lọc **"Đã xử lý"**
3. Kết hợp với bộ lọc ngày (nếu có) để xem đơn hàng trong ngày
4. Xuất báo cáo hoặc đối chiếu thủ công

#### Ví dụ 3: Tổng quan toàn bộ đơn hàng

**Tình huống**: Bạn muốn xem tổng quan tất cả đơn hàng

**Cách làm**:
1. Vào trang Danh sách Đơn hàng
2. Chọn bộ lọc **"Tất cả"**
3. Quan sát số lượng đơn hàng trong từng trạng thái qua số trong ngoặc
4. Đánh giá tình hình xử lý đơn hàng

### 3.4 Mẹo sử dụng hiệu quả

✅ **Kiểm tra số lượng**: Luôn chú ý đến số lượng đơn hàng "Chưa xử lý" để không bỏ sót đơn hàng

✅ **Kết hợp bộ lọc**: Sử dụng bộ lọc trạng thái kết hợp với bộ lọc ngày, khách hàng để tìm kiếm chính xác hơn

✅ **Ưu tiên xử lý**: Tập trung vào đơn hàng "Chưa xử lý" trước, sau đó mới xem lại đơn hàng "Đã xử lý"

✅ **Đối chiếu cuối ngày**: Sử dụng bộ lọc "Đã xử lý" để đối chiếu doanh thu cuối ca/cuối ngày

---

## 4. Câu hỏi Thường gặp (FAQ)

### Q1: Tôi có thể thay đổi trạng thái đơn hàng thủ công không?

**A**: Không. Trạng thái đơn hàng được hệ thống tự động cập nhật dựa trên hành động của bạn:
- Tạo đơn mới → Tự động "Chưa xử lý"
- Thanh toán thành công → Tự động "Đã xử lý"
- Hủy đơn → Tự động "Đã xử lý"

### Q2: Tại sao đơn hàng đã hủy lại có trạng thái "Đã xử lý"?

**A**: Trạng thái "Đã xử lý" có nghĩa là đơn hàng đã hoàn tất quá trình xử lý, bất kể kết quả là thanh toán thành công hay hủy đơn. Điều này giúp phân biệt rõ đơn hàng nào còn cần xử lý và đơn hàng nào đã xong.

### Q3: Checkbox "In hóa đơn" có ảnh hưởng đến trạng thái đơn hàng không?

**A**: Không. Checkbox chỉ kiểm soát việc hiển thị hộp thoại in hóa đơn. Trạng thái đơn hàng vẫn được cập nhật thành "Đã xử lý" sau khi thanh toán thành công, bất kể bạn có chọn in hay không.

### Q4: Tôi có thể in lại hóa đơn cho đơn hàng đã xử lý không?

**A**: Có. Bạn có thể vào chi tiết đơn hàng và chọn chức năng "In lại hóa đơn" bất cứ lúc nào, ngay cả khi đơn hàng đã ở trạng thái "Đã xử lý".

### Q5: Dữ liệu đơn hàng cũ có bị ảnh hưởng không?

**A**: Không. Tất cả đơn hàng cũ đã được tự động chuyển đổi sang hệ thống trạng thái mới:
- Đơn hàng cũ có trạng thái "Draft" hoặc "Printed" → Hiện tại là "Chưa xử lý"
- Đơn hàng cũ có trạng thái "Completed" hoặc "Cancelled" → Hiện tại là "Đã xử lý"

### Q6: Tôi không thấy checkbox "In hóa đơn" ở đâu cả?

**A**: Checkbox chỉ xuất hiện trong màn hình thanh toán của POS. Nếu bạn không thấy:
1. Đảm bảo bạn đang ở màn hình thanh toán (không phải màn hình tạo đơn hàng)
2. Thử làm mới trang (F5)
3. Xóa cache trình duyệt
4. Liên hệ bộ phận IT nếu vấn đề vẫn tiếp diễn

### Q7: Số lượng trong bộ lọc không khớp với số đơn hàng hiển thị?

**A**: Điều này có thể xảy ra nếu:
- Có bộ lọc khác đang được áp dụng (ngày, khách hàng, v.v.)
- Trang đang hiển thị phân trang (chỉ hiển thị một phần đơn hàng)
- Thử bỏ tất cả bộ lọc khác và chỉ giữ bộ lọc trạng thái

### Q8: Tôi có thể xuất báo cáo theo trạng thái không?

**A**: Có. Khi bạn chọn bộ lọc trạng thái, chức năng xuất báo cáo sẽ chỉ xuất các đơn hàng đang được hiển thị theo bộ lọc đó.

---

## 5. Liên hệ Hỗ trợ

Nếu bạn gặp vấn đề hoặc có câu hỏi về các tính năng mới, vui lòng liên hệ:

- **Bộ phận IT**: [Số điện thoại/Email]
- **Quản lý cửa hàng**: [Số điện thoại/Email]
- **Tài liệu kỹ thuật**: Xem file `API_DOCUMENTATION.md` trong thư mục `docs/`

---

## 6. Lịch sử Cập nhật

| Ngày | Phiên bản | Nội dung thay đổi |
|------|-----------|-------------------|
| [Ngày triển khai] | 1.0 | Phát hành tính năng kiểm soát in hóa đơn và hệ thống trạng thái mới |

---

**Lưu ý**: Tài liệu này dành cho nhân viên sử dụng hệ thống POS. Để biết thông tin kỹ thuật chi tiết, vui lòng tham khảo tài liệu dành cho nhà phát triển.
