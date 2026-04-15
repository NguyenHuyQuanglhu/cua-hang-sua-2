"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mssql_1 = __importDefault(require("mssql"));
const auth_1 = require("../middleware/auth");
const loyalty_points_service_1 = require("../services/loyalty-points-service");
const loyalty_points_repository_1 = require("../repositories/loyalty-points-repository");
const connection_1 = require("../db/connection");
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
// POST /api/loyalty-points/recalculate-tiers - Recalculate loyalty tiers for all customers
router.post('/recalculate-tiers', async (req, res) => {
    try {
        const storeId = req.storeId;
        const result = await loyalty_points_service_1.loyaltyPointsService.recalculateAllTiers(storeId);
        res.json({
            success: true,
            message: `Updated ${result.updated} customers`,
            updated: result.updated
        });
    }
    catch (error) {
        console.error('Recalculate tiers error:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to recalculate tiers'
        });
    }
});
// GET /api/loyalty-points/tier-info/:tier - Get tier information
router.get('/tier-info/:tier', async (req, res) => {
    try {
        const { tier } = req.params;
        const tierInfo = loyalty_points_service_1.loyaltyPointsService.getTierInfo(tier);
        res.json(tierInfo);
    }
    catch (error) {
        console.error('Get tier info error:', error);
        res.status(500).json({ error: 'Failed to get tier info' });
    }
});
// POST /api/loyalty-points/deploy-sp - Deploy customer update stored procedure (admin only)
router.post('/deploy-sp', async (req, res) => {
    try {
        const { getConnection } = require('../db/connection');
        const fs = require('fs');
        const path = require('path');
        console.log('🚀 Deploying sp_Customers_Update stored procedure...');
        const pool = await getConnection();
        // Read the stored procedure file
        const spPath = path.join(__dirname, '../../scripts/stored-procedures/sp_Customers_Update.sql');
        const spContent = fs.readFileSync(spPath, 'utf8');
        // Execute the stored procedure
        await pool.request().query(spContent);
        console.log('✅ Successfully deployed sp_Customers_Update');
        res.json({
            success: true,
            message: 'Successfully deployed sp_Customers_Update stored procedure'
        });
    }
    catch (error) {
        console.error('Deploy SP error:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to deploy stored procedure'
        });
    }
});
// GET /api/loyalty-points/tier-history/:customerId - Get customer tier upgrade history
router.get('/tier-history/:customerId', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { customerId } = req.params;
        const limit = req.query.limit ? parseInt(req.query.limit) : 50;
        const pool = await (0, connection_1.getConnection)();
        // Query tier upgrade notifications for this customer
        const result = await pool
            .request()
            .input('storeId', mssql_1.default.UniqueIdentifier, storeId)
            .input('customerId', mssql_1.default.UniqueIdentifier, customerId)
            .input('limit', mssql_1.default.Int, limit)
            .query(`
        SELECT TOP (@limit)
          id,
          type,
          title,
          message,
          data,
          created_at as createdAt
        FROM Notifications
        WHERE store_id = @storeId
          AND type = 'tier_upgrade'
          AND JSON_VALUE(data, '$.customerId') = CONVERT(NVARCHAR(36), @customerId)
        ORDER BY created_at DESC
      `);
        // Parse the tier upgrade history from notifications
        const tierHistory = result.recordset.map((row) => {
            let data = {};
            try {
                data = JSON.parse(row.data || '{}');
            }
            catch (e) {
                // Keep empty object if parsing fails
            }
            return {
                id: row.id,
                type: row.type,
                title: row.title,
                message: row.message,
                customerId: data?.customerId || customerId,
                customerName: data?.customerName || '',
                oldTier: data?.oldTier || '',
                newTier: data?.newTier || '',
                lifetimePoints: data?.lifetimePoints || 0,
                createdAt: row.createdAt,
            };
        });
        res.json({
            success: true,
            data: tierHistory,
            total: tierHistory.length,
        });
    }
    catch (error) {
        console.error('Get tier history error:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to get tier history'
        });
    }
});
exports.default = router;
//# sourceMappingURL=loyalty-points.js.map