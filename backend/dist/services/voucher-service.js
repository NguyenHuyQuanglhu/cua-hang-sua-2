"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voucherService = exports.VoucherService = void 0;
const db_1 = require("../db");
class VoucherService {
    /**
     * Validate and apply voucher
     */
    async validateVoucher(code, storeId, subtotal, customerId) {
        console.log('[VoucherService] Validating voucher:', { code, storeId, subtotal, customerId });
        const now = new Date();
        const result = await (0, db_1.queryOne)(`SELECT * FROM Vouchers 
       WHERE code = @code 
         AND store_id = @storeId 
         AND status = 'active'
         AND start_date <= @now 
         AND end_date >= @now`, { code, storeId, now }).catch(err => {
            console.error('[VoucherService] Query error:', err);
            return null;
        });
        console.log('[VoucherService] Query result:', result);
        if (!result) {
            return { valid: false, error: 'Mã giảm giá không hợp lệ hoặc đã hết hạn' };
        }
        const voucher = {
            id: result.id,
            storeId: result.store_id,
            promotionId: result.promotion_id,
            code: result.code,
            name: result.name,
            description: result.description,
            discountType: result.discount_type,
            discountValue: result.discount_value,
            maxDiscountAmount: result.max_discount_amount,
            minPurchaseAmount: result.min_purchase_amount,
            startDate: result.start_date,
            endDate: result.end_date,
            usageLimit: result.usage_limit,
            usageCount: result.usage_count,
            usagePerCustomer: result.usage_per_customer,
            status: result.status,
        };
        // Check usage limit
        if (voucher.usageLimit && voucher.usageCount >= voucher.usageLimit) {
            return { valid: false, error: 'Mã giảm giá đã hết lượt sử dụng' };
        }
        // Check minimum purchase amount
        if (voucher.minPurchaseAmount && subtotal < voucher.minPurchaseAmount) {
            return {
                valid: false,
                error: `Đơn hàng tối thiểu ${voucher.minPurchaseAmount.toLocaleString()}đ để sử dụng mã này`,
            };
        }
        // Check usage per customer
        if (customerId && voucher.usagePerCustomer) {
            const usageCount = await (0, db_1.queryOne)(`SELECT COUNT(*) as count FROM VoucherUsage 
         WHERE voucher_id = @voucherId AND customer_id = @customerId`, { voucherId: voucher.id, customerId });
            if (usageCount && usageCount.count >= voucher.usagePerCustomer) {
                return { valid: false, error: 'Bạn đã sử dụng hết lượt cho mã này' };
            }
        }
        // Calculate discount
        let discount = 0;
        if (voucher.discountType === 'percentage') {
            discount = subtotal * (voucher.discountValue / 100);
            if (voucher.maxDiscountAmount) {
                discount = Math.min(discount, voucher.maxDiscountAmount);
            }
        }
        else {
            discount = voucher.discountValue;
        }
        return { valid: true, voucher, discount };
    }
    /**
     * Record voucher usage
     */
    async recordUsage(voucherId, saleId, discountAmount, customerId) {
        await (0, db_1.query)(`INSERT INTO VoucherUsage (id, voucher_id, customer_id, sale_id, discount_amount)
       VALUES (NEWID(), @voucherId, @customerId, @saleId, @discountAmount)`, { voucherId, customerId, saleId, discountAmount });
        await (0, db_1.query)(`UPDATE Vouchers SET usage_count = usage_count + 1 WHERE id = @voucherId`, { voucherId });
    }
    /**
     * Generate random voucher code
     */
    generateCode(prefix = 'SALE', length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = prefix;
        for (let i = 0; i < length; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
}
exports.VoucherService = VoucherService;
exports.voucherService = new VoucherService();
//# sourceMappingURL=voucher-service.js.map