"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const loyalty_points_service_1 = require("../services/loyalty-points-service");
const loyalty_points_repository_1 = require("../repositories/loyalty-points-repository");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use(auth_1.storeContext);
// GET /api/loyalty-points/balance/:customerId - Get customer points balance
router.get('/balance/:customerId', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { customerId } = req.params;
        const balance = await loyalty_points_service_1.loyaltyPointsService.getBalance(customerId, storeId);
        res.json({ balance });
    }
    catch (error) {
        console.error('Get balance error:', error);
        res.status(500).json({ error: 'Failed to get points balance' });
    }
});
// GET /api/loyalty-points/history/:customerId - Get customer points history
router.get('/history/:customerId', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { customerId } = req.params;
        const limit = req.query.limit ? parseInt(req.query.limit) : 50;
        const history = await loyalty_points_service_1.loyaltyPointsService.getHistory(customerId, storeId, limit);
        res.json(history);
    }
    catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ error: 'Failed to get points history' });
    }
});
// POST /api/loyalty-points/adjust - Manually adjust points (admin only)
router.post('/adjust', async (req, res) => {
    try {
        const storeId = req.storeId;
        const userId = req.user.id;
        const { customerId, points, reason } = req.body;
        if (!customerId || points === undefined || !reason) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }
        const result = await loyalty_points_service_1.loyaltyPointsService.adjustPoints(customerId, storeId, points, reason, userId);
        res.json({ success: true, newBalance: result.newBalance });
    }
    catch (error) {
        console.error('Adjust points error:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to adjust points'
        });
    }
});
// POST /api/loyalty-points/validate-redemption - Validate points redemption
router.post('/validate-redemption', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { customerId, pointsToRedeem, orderAmount } = req.body;
        if (!customerId || !pointsToRedeem || !orderAmount) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }
        const validation = await loyalty_points_service_1.loyaltyPointsService.validateRedemption(customerId, storeId, pointsToRedeem, orderAmount);
        res.json(validation);
    }
    catch (error) {
        console.error('Validate redemption error:', error);
        res.status(500).json({ error: 'Failed to validate redemption' });
    }
});
// GET /api/loyalty-points/transaction/:transactionId - Get transaction details
router.get('/transaction/:transactionId', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { transactionId } = req.params;
        const transaction = await loyalty_points_repository_1.loyaltyPointsRepository.getTransactionById(transactionId, storeId);
        if (!transaction) {
            res.status(404).json({ error: 'Transaction not found' });
            return;
        }
        res.json(transaction);
    }
    catch (error) {
        console.error('Get transaction error:', error);
        res.status(500).json({ error: 'Failed to get transaction' });
    }
});
// GET /api/loyalty-points/settings - Get loyalty points settings
router.get('/settings', async (req, res) => {
    try {
        const storeId = req.storeId;
        const settings = await loyalty_points_service_1.loyaltyPointsService.getSettings(storeId);
        if (!settings) {
            res.status(404).json({ error: 'Settings not found' });
            return;
        }
        res.json(settings);
    }
    catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Failed to get settings' });
    }
});
// PUT /api/loyalty-points/settings - Update loyalty points settings
router.put('/settings', async (req, res) => {
    try {
        const storeId = req.storeId;
        const settings = req.body;
        const updated = await loyalty_points_service_1.loyaltyPointsService.updateSettings(storeId, settings);
        res.json({ success: true, settings: updated });
    }
    catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to update settings'
        });
    }
});
exports.default = router;
//# sourceMappingURL=loyalty-points.js.map