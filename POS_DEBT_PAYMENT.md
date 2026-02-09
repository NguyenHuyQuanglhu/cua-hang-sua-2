# Thanh toán nợ cũ tại quầy POS

## ✅ Tính năng mới

Thêm checkbox cho phép thanh toán nợ cũ của khách hàng khi thanh toán tại quầy POS.

## 🎯 Cách hoạt động

### 1. Khi chọn khách hàng có nợ

```
Khách hàng: Nguyễn Văn A
Nợ cũ: 500.000 VND

Đơn hàng mới: 200.000 VND
```

### 2. Hiển thị checkbox

```
┌─────────────────────────────────────┐
│ Tổng tiền hàng:      200.000 VND    │
│                                      │
│ Nợ cũ:               500.000 VND    │
│                                      │
│ ☐ Thanh toán cả nợ cũ (500.000 VND) │ ← Checkbox
│                                      │
│ Tổng phải trả:       200.000 VND    │
│ Tiền khách đưa:      200.000 VND    │
│ Tiền thối lại:             0 VND    │
└─────────────────────────────────────┘
```

### 3. Khi tick checkbox

```
┌─────────────────────────────────────┐
│ Tổng tiền hàng:      200.000 VND    │
│                                      │
│ Nợ cũ:               500.000 VND    │
│                                      │
│ ☑ Thanh toán cả nợ cũ (500.000 VND) │ ← Checked
│                                      │
│ Tổng phải trả:       700.000 VND    │ ← Tăng lên
│ Tiền khách đưa:      700.000 VND    │ ← Auto-update
│ Tiền thối lại:             0 VND    │
└─────────────────────────────────────┘
```

## 📊 Các trường hợp

### Trường hợp 1: Không tick checkbox (mặc định)

```
Nợ cũ: 500.000 VND
Đơn hàng mới: 200.000 VND
Trả tiền: 200.000 VND
☐ Thanh toán cả nợ cũ

→ Tổng phải trả: 200.000 VND
→ Nợ sau giao dịch: 500.000 VND (không đổi)
→ Backend nhận: previousDebt = 0
```

### Trường hợp 2: Tick checkbox - Trả đủ

```
Nợ cũ: 500.000 VND
Đơn hàng mới: 200.000 VND
Trả tiền: 700.000 VND
☑ Thanh toán cả nợ cũ

→ Tổng phải trả: 700.000 VND
→ Nợ sau giao dịch: 0 VND (hết nợ!)
→ Backend nhận: previousDebt = 500.000
```

### Trường hợp 3: Tick checkbox - Trả một phần

```
Nợ cũ: 500.000 VND
Đơn hàng mới: 200.000 VND
Trả tiền: 500.000 VND
☑ Thanh toán cả nợ cũ

→ Tổng phải trả: 700.000 VND
→ Còn thiếu: 200.000 VND
→ Nợ sau giao dịch: 200.000 VND
→ Backend nhận: previousDebt = 500.000
```

### Trường hợp 4: Tick checkbox - Trả thừa

```
Nợ cũ: 500.000 VND
Đơn hàng mới: 200.000 VND
Trả tiền: 800.000 VND
☑ Thanh toán cả nợ cũ

→ Tổng phải trả: 700.000 VND
→ Tiền thối lại: 100.000 VND
→ Nợ sau giao dịch: 0 VND (hết nợ!)
→ Backend nhận: previousDebt = 500.000
```

## 💻 Code Implementation

### Frontend State

```typescript
const [includeDebtPayment, setIncludeDebtPayment] = useState(false)
```

### Calculation Logic

```typescript
// Calculate total payable based on checkbox
const totalPayable = includeDebtPayment 
  ? finalAmount + previousDebt  // Include debt
  : finalAmount;                 // Only order amount

const remainingDebt = totalPayable - customerPayment;
const changeAmount = customerPayment - totalPayable;
```

### Checkbox UI

```tsx
{previousDebt > 0 && (
  <>
    <div className="flex justify-between items-center text-sm text-destructive">
      <Label>Nợ cũ</Label>
      <p className="font-semibold">{formatCurrency(previousDebt)}</p>
    </div>
    
    <div className="flex items-center space-x-2 p-2 bg-orange-50 rounded">
      <Checkbox
        id="includeDebtPayment"
        checked={includeDebtPayment}
        onCheckedChange={(checked) => {
          setIncludeDebtPayment(checked as boolean);
          // Auto-update payment amount
          if (checked) {
            setCustomerPayment(finalAmount + previousDebt);
          } else {
            setCustomerPayment(finalAmount);
          }
        }}
      />
      <label htmlFor="includeDebtPayment">
        Thanh toán cả nợ cũ ({formatCurrency(previousDebt)})
      </label>
    </div>
  </>
)}
```

### Send to Backend

```typescript
const saleData = {
  // ... other fields
  customerPayment: customerPayment,
  previousDebt: includeDebtPayment ? previousDebt : 0, // Only if checked
  remainingDebt: remainingDebt,
}
```

## 🔄 Auto-behaviors

### 1. Auto-update payment amount

Khi tick/untick checkbox, số tiền khách đưa tự động cập nhật:
- Tick: `customerPayment = finalAmount + previousDebt`
- Untick: `customerPayment = finalAmount`

### 2. Auto-reset checkbox

Checkbox tự động reset về unchecked khi:
- Chọn khách hàng khác
- Hoàn thành thanh toán
- Xóa giỏ hàng

### 3. Auto-update suggestions

Các gợi ý số tiền tự động tính dựa trên `totalPayable`:
- Nếu không tick: Gợi ý dựa trên `finalAmount`
- Nếu tick: Gợi ý dựa trên `finalAmount + previousDebt`

## 🎨 UI/UX

### Màu sắc

- **Nợ cũ**: Màu đỏ (text-destructive)
- **Checkbox area**: Màu cam nhạt (bg-orange-50)
- **Border**: Màu cam (border-orange-200)

### Vị trí

Checkbox nằm ngay sau dòng "Nợ cũ" và trước "Tổng phải trả"

### Responsive

- Desktop: Hiển thị đầy đủ
- Mobile: Tự động wrap text nếu cần

## 🧪 Test Cases

### Test 1: Khách không có nợ
```
✓ Checkbox không hiển thị
✓ Tổng phải trả = finalAmount
```

### Test 2: Khách có nợ - Không tick
```
✓ Checkbox hiển thị
✓ Checkbox unchecked
✓ Tổng phải trả = finalAmount
✓ previousDebt = 0 gửi backend
```

### Test 3: Khách có nợ - Tick checkbox
```
✓ Checkbox checked
✓ Tổng phải trả = finalAmount + previousDebt
✓ Tiền khách đưa auto-update
✓ previousDebt = nợ cũ gửi backend
```

### Test 4: Đổi khách hàng
```
✓ Checkbox reset về unchecked
✓ Tính toán lại với nợ của khách mới
```

### Test 5: Hoàn thành thanh toán
```
✓ Checkbox reset về unchecked
✓ Nợ được cập nhật đúng trong DB
```

## 📝 Notes

1. **Không bắt buộc**: Checkbox không bắt buộc phải tick, nhân viên tự quyết định
2. **Linh hoạt**: Có thể trả một phần nợ bằng cách tick checkbox nhưng nhập số tiền nhỏ hơn
3. **Rõ ràng**: Luôn hiển thị số tiền nợ cụ thể trong label checkbox
4. **An toàn**: Backend vẫn validate và tính toán đúng dựa trên `previousDebt` nhận được

## 🚀 Benefits

1. ✅ **Tiện lợi**: Không cần vào trang Khách hàng để thanh toán nợ
2. ✅ **Nhanh chóng**: Thanh toán nợ ngay khi khách mua hàng
3. ✅ **Linh hoạt**: Có thể chọn thanh toán hoặc không
4. ✅ **Rõ ràng**: Hiển thị đầy đủ thông tin nợ và tổng phải trả
5. ✅ **Chính xác**: Backend tính toán đúng dựa trên checkbox

---

**Tóm tắt**: Thêm checkbox cho phép thanh toán nợ cũ tại quầy POS, tự động cập nhật số tiền và gửi đúng dữ liệu về backend! 🎉
