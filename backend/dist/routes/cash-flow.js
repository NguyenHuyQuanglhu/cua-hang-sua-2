"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const cash_transaction_repository_1 = require("../repositories/cash-transaction-repository");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use(auth_1.storeContext);
// GET /api/cash-flow
router.get('/', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { page, pageSize, type, category, dateFrom, dateTo, orderBy, orderDirection, includeSummary } = req.query;
        const result = await cash_transaction_repository_1.cashTransactionRepository.findAllFiltered(storeId, {
            page: page ? parseInt(page, 10) : undefined,
            pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
            type: type,
            category: category,
            dateFrom: dateFrom,
            dateTo: dateTo,
            orderBy: orderBy,
            orderDirection: orderDirection,
        });
        // Include summary if requested
        if (includeSummary === 'true') {
            const summary = await cash_transaction_repository_1.cashTransactionRepository.getSummary(storeId, dateFrom, dateTo);
            res.json({ ...result, summary });
            return;
        }
        res.json(result);
    }
    catch (error) {
        console.error('Get cash flow error:', error);
        res.status(500).json({ error: 'Failed to get cash flow' });
    }
});
// GET /api/cash-flow/summary
router.get('/summary', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { dateFrom, dateTo } = req.query;
        const summary = await cash_transaction_repository_1.cashTransactionRepository.getSummary(storeId, dateFrom, dateTo);
        res.json(summary);
    }
    catch (error) {
        console.error('Get cash flow summary error:', error);
        res.status(500).json({ error: 'Failed to get cash flow summary' });
    }
});
// GET /api/cash-flow/categories
router.get('/categories', async (req, res) => {
    try {
        const storeId = req.storeId;
        const categories = await cash_transaction_repository_1.cashTransactionRepository.getCategories(storeId);
        res.json(categories);
    }
    catch (error) {
        console.error('Get cash flow categories error:', error);
        res.status(500).json({ error: 'Failed to get categories' });
    }
});
// GET /api/cash-flow/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const transaction = await cash_transaction_repository_1.cashTransactionRepository.findById(id, storeId);
        if (!transaction) {
            res.status(404).json({ error: 'Không tìm thấy giao dịch' });
            return;
        }
        res.json(transaction);
    }
    catch (error) {
        console.error('Get cash transaction error:', error);
        res.status(500).json({ error: 'Failed to get cash transaction' });
    }
});
// POST /api/cash-flow
router.post('/', async (req, res) => {
    try {
        const storeId = req.storeId;
        const userId = req.user.id;
        const { type, transactionDate, amount, reason, category, relatedInvoiceId } = req.body;
        if (!type || !['thu', 'chi'].includes(type)) {
            res.status(400).json({ error: 'Loại giao dịch không hợp lệ (thu/chi)' });
            return;
        }
        if (!amount || amount <= 0) {
            res.status(400).json({ error: 'Số tiền phải lớn hơn 0' });
            return;
        }
        if (!reason) {
            res.status(400).json({ error: 'Lý do là bắt buộc' });
            return;
        }
        const transaction = await cash_transaction_repository_1.cashTransactionRepository.create({
            storeId,
            type,
            transactionDate: transactionDate || new Date().toISOString(),
            amount,
            reason,
            category,
            relatedInvoiceId,
            createdBy: userId,
        }, storeId);
        res.status(201).json(transaction);
    }
    catch (error) {
        console.error('Create cash transaction error:', error);
        res.status(500).json({ error: 'Failed to create cash transaction' });
    }
});
// PUT /api/cash-flow/:id
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const { type, transactionDate, amount, reason, category, relatedInvoiceId } = req.body;
        if (type && !['thu', 'chi'].includes(type)) {
            res.status(400).json({ error: 'Loại giao dịch không hợp lệ (thu/chi)' });
            return;
        }
        if (amount !== undefined && amount <= 0) {
            res.status(400).json({ error: 'Số tiền phải lớn hơn 0' });
            return;
        }
        const transaction = await cash_transaction_repository_1.cashTransactionRepository.update(id, { type, transactionDate, amount, reason, category, relatedInvoiceId }, storeId);
        res.json(transaction);
    }
    catch (error) {
        console.error('Update cash transaction error:', error);
        if (error.message === 'Cash transaction not found') {
            res.status(404).json({ error: 'Không tìm thấy giao dịch' });
            return;
        }
        res.status(500).json({ error: 'Failed to update cash transaction' });
    }
});
// DELETE /api/cash-flow/:id
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const deleted = await cash_transaction_repository_1.cashTransactionRepository.delete(id, storeId);
        if (!deleted) {
            res.status(404).json({ error: 'Không tìm thấy giao dịch' });
            return;
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Delete cash transaction error:', error);
        res.status(500).json({ error: 'Failed to delete cash transaction' });
    }
});
exports.default = router;
//# sourceMappingURL=cash-flow.js.map