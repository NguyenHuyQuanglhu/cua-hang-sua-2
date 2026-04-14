"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const cash_transaction_repository_1 = require("../repositories/cash-transaction-repository");
const loyalty_points_service_1 = require("../services/loyalty-points-service");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use(auth_1.storeContext);
// GET /api/customer-payments (alias for /api/payments)
router.get('/', async (req, res) => {
    try {
        const storeId = req.storeId;
        const payments = await (0, db_1.query)(`SELECT 
         p.id,
         p.store_id,
         p.customer_id,
         p.amount,
         p.payment_date,
         p.notes,
         p.created_at,
         c.full_name as customer_name
       FROM Payments p
       LEFT JOIN Customers c ON p.customer_id = c.id
       WHERE p.store_id = @storeId
       ORDER BY p.created_at DESC`, { storeId });
        res.json(payments.map((p) => ({
            id: p.id,
            storeId: p.store_id,
            customerId: p.customer_id,
            customerName: p.customer_name,
            amount: p.amount,
            paymentDate: p.payment_date,
            paymentMethod: 'cash', // Default since not in schema
            notes: p.notes,
            createdAt: p.created_at,
        })));
    }
    catch (error) {
        console.error('Get customer payments error:', error);
        res.status(500).json({ error: 'Failed to get customer payments' });
    }
});
// POST /api/customer-payments (alias for /api/payments)
router.post('/', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { customerId, amount, paymentDate, notes } = req.body;
        const paymentAmount = Number(amount);
        if (!customerId) {
            res.status(400).json({ error: 'customerId is required' });
            return;
        }
        if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
            res.status(400).json({ error: 'Số tiền thanh toán không hợp lệ' });
            return;
        }
        const paymentId = crypto.randomUUID();
        const paymentDateValue = paymentDate || new Date();
        // Insert payment record
        await (0, db_1.query)(`INSERT INTO Payments (id, store_id, customer_id, amount, payment_date, notes, created_at)
       VALUES (@paymentId, @storeId, @customerId, @amount, @paymentDate, @notes, GETDATE())`, {
            paymentId,
            storeId,
            customerId,
            amount: paymentAmount,
            paymentDate: paymentDateValue,
            notes: notes || null
        });
        // Update customer debt
        if (customerId) {
            await (0, db_1.query)(`UPDATE Customers
         SET total_debt = CASE
           WHEN total_debt - @amount < 0 THEN 0
           ELSE total_debt - @amount
         END,
         total_paid = ISNULL(total_paid, 0) + @amount,
         updated_at = GETDATE()
         WHERE id = @customerId AND store_id = @storeId`, { customerId, amount: paymentAmount, storeId });
        }
        let loyaltyResult = {
            points: 0,
            newBalance: 0,
        };
        // Award points for direct customer debt payments
        try {
            loyaltyResult = await loyalty_points_service_1.loyaltyPointsService.earnPointsFromPayment(customerId, storeId, paymentAmount, paymentId, req.user?.id);
            if (loyaltyResult.points > 0) {
                console.log(`[CustomerPayments] Customer ${customerId} earned ${loyaltyResult.points} points from payment ${paymentId}`);
            }
        }
        catch (loyaltyError) {
            // Do not block payment flow if loyalty processing fails
            console.error('[CustomerPayments] Failed to award loyalty points:', loyaltyError);
        }
        // Get customer name for cash transaction description
        const customer = await (0, db_1.queryOne)(`SELECT full_name FROM Customers WHERE id = @customerId AND store_id = @storeId`, { customerId, storeId });
        const customerName = customer?.full_name || 'Khách hàng';
        // Create cash transaction for the payment (income)
        try {
            await cash_transaction_repository_1.cashTransactionRepository.create({
                storeId,
                type: 'thu',
                transactionDate: paymentDateValue instanceof Date ? paymentDateValue.toISOString() : new Date(paymentDateValue).toISOString(),
                amount: paymentAmount,
                reason: `Thu tiền từ ${customerName}${notes ? ` - ${notes}` : ''}`,
                category: 'Thu tiền khách hàng',
                relatedInvoiceId: paymentId,
            }, storeId);
            console.log(`[CustomerPayments] Created cash transaction for payment from ${customerName}: ${paymentAmount}`);
        }
        catch (cashError) {
            // Log but don't fail the payment if cash transaction fails
            console.error('[CustomerPayments] Failed to create cash transaction:', cashError);
        }
        res.status(201).json({
            success: true,
            pointsEarned: loyaltyResult.points,
            loyaltyBalance: loyaltyResult.newBalance,
            newTier: loyaltyResult.newTier,
            tierUpgraded: loyaltyResult.tierUpgraded,
        });
    }
    catch (error) {
        console.error('Create customer payment error:', error);
        res.status(500).json({ error: 'Failed to create customer payment' });
    }
});
exports.default = router;
/** */ 
//# sourceMappingURL=customer-payments.js.map