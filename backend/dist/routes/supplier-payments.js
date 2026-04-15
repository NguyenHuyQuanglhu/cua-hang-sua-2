"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const cash_transaction_repository_1 = require("../repositories/cash-transaction-repository");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use(auth_1.storeContext);
// GET /api/supplier-payments
router.get('/', async (req, res) => {
    try {
        const storeId = req.storeId;
        const payments = await (0, db_1.query)(`SELECT sp.*, s.name as supplier_name
       FROM SupplierPayments sp
       LEFT JOIN Suppliers s ON sp.supplier_id = s.id
       WHERE sp.store_id = @storeId
       ORDER BY sp.created_at DESC`, { storeId });
        res.json(payments.map((p) => ({
            id: p.id,
            storeId: p.store_id,
            supplierId: p.supplier_id,
            supplierName: p.supplier_name,
            purchaseId: p.purchase_id,
            amount: p.amount,
            paymentDate: p.payment_date,
            paymentMethod: p.payment_method,
            notes: p.notes,
            createdAt: p.created_at,
        })));
    }
    catch (error) {
        console.error('Get supplier payments error:', error);
        res.status(500).json({ error: 'Failed to get supplier payments' });
    }
});
// POST /api/supplier-payments
router.post('/', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { supplierId, purchaseId, amount, paymentDate, paymentMethod, notes } = req.body;
        const paymentId = crypto.randomUUID();
        const paymentDateValue = paymentDate || new Date();
        // Insert payment record
        await (0, db_1.query)(`INSERT INTO SupplierPayments (id, store_id, supplier_id, purchase_id, amount, payment_date, payment_method, notes, created_at)
       VALUES (@paymentId, @storeId, @supplierId, @purchaseId, @amount, @paymentDate, @paymentMethod, @notes, GETDATE())`, {
            paymentId,
            storeId,
            supplierId,
            purchaseId: purchaseId || null,
            amount,
            paymentDate: paymentDateValue,
            paymentMethod: paymentMethod || 'cash',
            notes
        });
        // Update remaining_debt in PurchaseOrders table
        // If purchaseId is provided, update that specific purchase
        // Otherwise, distribute payment across all unpaid purchases for this supplier (oldest first)
        if (purchaseId) {
            // Update specific purchase
            await (0, db_1.query)(`UPDATE PurchaseOrders
         SET remaining_debt = CASE
           WHEN remaining_debt - @amount < 0 THEN 0
           ELSE remaining_debt - @amount
         END,
         paid_amount = ISNULL(paid_amount, 0) + @amount,
         payment_status = CASE
           WHEN remaining_debt - @amount <= 0 THEN 'paid'
           WHEN ISNULL(paid_amount, 0) + @amount > 0 THEN 'partial'
           ELSE 'unpaid'
         END,
         updated_at = GETDATE()
         WHERE id = @purchaseId AND store_id = @storeId`, { purchaseId, amount, storeId });
        }
        else {
            // Distribute payment across all unpaid purchases for this supplier (oldest first)
            await (0, db_1.query)(`WITH PaymentDistribution AS (
          SELECT
            id,
            remaining_debt,
            SUM(remaining_debt) OVER (ORDER BY created_at ASC ROWS UNBOUNDED PRECEDING) as running_total
          FROM PurchaseOrders
          WHERE supplier_id = @supplierId
            AND store_id = @storeId
            AND remaining_debt > 0
        )
        UPDATE p
        SET
          p.remaining_debt = CASE
            WHEN pd.running_total <= @amount THEN 0
            WHEN pd.running_total - p.remaining_debt < @amount THEN pd.running_total - @amount
            ELSE p.remaining_debt
          END,
          p.paid_amount = ISNULL(p.paid_amount, 0) + CASE
            WHEN pd.running_total <= @amount THEN p.remaining_debt
            WHEN pd.running_total - p.remaining_debt < @amount THEN @amount - (pd.running_total - p.remaining_debt)
            ELSE 0
          END,
          p.payment_status = CASE
            WHEN pd.running_total <= @amount THEN 'paid'
            WHEN pd.running_total - p.remaining_debt < @amount THEN 'partial'
            ELSE p.payment_status
          END,
          p.updated_at = GETDATE()
        FROM PurchaseOrders p
        INNER JOIN PaymentDistribution pd ON p.id = pd.id
        WHERE pd.running_total - p.remaining_debt < @amount`, { supplierId, storeId, amount });
        }
        // Get supplier name for cash transaction description
        const supplier = await (0, db_1.queryOne)(`SELECT name FROM Suppliers WHERE id = @supplierId AND store_id = @storeId`, { supplierId, storeId });
        const supplierName = supplier?.name || 'Nhà cung cấp';
        // Create cash transaction for the payment (expense)
        try {
            await cash_transaction_repository_1.cashTransactionRepository.create({
                storeId,
                type: 'chi',
                transactionDate: paymentDateValue instanceof Date ? paymentDateValue.toISOString() : new Date(paymentDateValue).toISOString(),
                amount: amount,
                reason: `Thanh toán cho ${supplierName}${notes ? ` - ${notes}` : ''}`,
                category: 'Thanh toán nhà cung cấp',
                relatedInvoiceId: paymentId,
            }, storeId);
            console.log(`[SupplierPayments] Created cash transaction for payment to ${supplierName}: ${amount}`);
        }
        catch (cashError) {
            // Log but don't fail the payment if cash transaction fails
            console.error('[SupplierPayments] Failed to create cash transaction:', cashError);
        }
        res.status(201).json({ success: true });
    }
    catch (error) {
        console.error('Create supplier payment error:', error);
        res.status(500).json({ error: 'Failed to create supplier payment' });
    }
});
exports.default = router;
//# sourceMappingURL=supplier-payments.js.map