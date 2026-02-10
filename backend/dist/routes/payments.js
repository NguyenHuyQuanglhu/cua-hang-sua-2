"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use(auth_1.storeContext);
// GET /api/payments
router.get('/', async (req, res) => {
    try {
        const storeId = req.storeId;
        const payments = await (0, db_1.query)(`SELECT p.*, c.full_name as customer_name
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
            notes: p.notes,
            createdAt: p.created_at,
        })));
    }
    catch (error) {
        console.error('Get payments error:', error);
        res.status(500).json({ error: 'Failed to get payments' });
    }
});
// POST /api/payments
router.post('/', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { customerId, amount, paymentDate, notes } = req.body;
        await (0, db_1.query)(`INSERT INTO Payments (id, store_id, customer_id, amount, payment_date, notes, created_at)
       VALUES (NEWID(), @storeId, @customerId, @amount, @paymentDate, @notes, GETDATE())`, { storeId, customerId, amount, paymentDate: paymentDate || new Date(), notes });
        res.status(201).json({ success: true });
    }
    catch (error) {
        console.error('Create payment error:', error);
        res.status(500).json({ error: 'Failed to create payment' });
    }
});
exports.default = router;
//# sourceMappingURL=payments.js.map