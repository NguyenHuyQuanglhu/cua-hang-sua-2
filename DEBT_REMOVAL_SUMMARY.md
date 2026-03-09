# Tóm tắt xóa chức năng công nợ khách hàng

## Đã thực hiện

### Backend
1. **Đã xóa các routes:**
   - `/api/payments` - Thanh toán nợ khách hàng
   - `/api/debt-reminder` - Gửi nhắc nợ
   - `/api/debug-debt` - Debug công nợ
   - `/api/fix-debt` - Sửa công nợ
   - `/api/clear-debts` - Xóa tất cả công nợ
   - `/api/refunds` - Hoàn tiền

2. **Đã xóa endpoint trong reports:**
   - `GET /api/reports/debt` - Báo cáo công nợ khách hàng

3. **Đã xóa các services và repositories:**
   - `payment-repository.ts`
   - `refund-service.ts`

4. **Đã xóa scripts:**
   - `create-debt-history-sp.js`

### Frontend
1. **Đã xóa các pages:**
   - `/reports/debt` - Trang báo cáo công nợ
   - `/reports/debt-tracking` - Trang đối soát công nợ

2. **Đã xóa các components:**
   - `DebtPaymentDialog` - Dialog thanh toán nợ
   - `DebtReminderDialog` - Dialog nhắc nợ
   - `DebtOverview` - Tổng quan công nợ trong dashboard
   - `RefundDialog` - Dialog hoàn tiền

3. **Đã xóa các hooks:**
   - `use-debt-reminder-permission.ts`

4. **Đã xóa AI flows:**
   - `predict-debt-risk.ts`

5. **Đã cập nhật:**
   - `api-client.ts` - Xóa các methods liên quan đến payments và debt
   - `main-nav.tsx` - Xóa menu items công nợ khách hàng
   - `command-menu.tsx` - Xóa command items công nợ khách hàng
   - `dashboard/page.tsx` - Xóa DebtOverview component
   - `customers/page.tsx` - Xóa các buttons và dialogs thanh toán nợ

## Cần thực hiện thủ công

### Database
Khi database đã kết nối, chạy script sau để xóa dữ liệu nợ:

```bash
cd cua-hang-sua-2/backend
npx ts-node scripts/clear-all-customer-debts.ts
```

Hoặc chạy SQL trực tiếp:

```sql
-- Xóa remaining_debt trong bảng Sales
UPDATE Sales
SET remaining_debt = 0,
    updated_at = GETDATE()
WHERE remaining_debt > 0;

-- Xóa total_debt trong bảng Customers
UPDATE Customers
SET total_debt = 0,
    updated_at = GETDATE()
WHERE total_debt != 0;

-- Xóa bảng Payments (nếu muốn)
-- DROP TABLE IF EXISTS Payments;
```

### Lưu ý
- Các chức năng công nợ nhà cung cấp (supplier debt) vẫn được giữ lại
- Payment gateway (MoMo, ZaloPay) cho online orders vẫn hoạt động bình thường
- Supplier payments vẫn hoạt động bình thường
