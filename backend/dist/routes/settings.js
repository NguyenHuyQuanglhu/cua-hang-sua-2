"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const loyalty_points_repository_1 = require("../repositories/loyalty-points-repository");
const settings_sp_repository_1 = require("../repositories/settings-sp-repository");
const db_1 = require("../db");
const global_cache_1 = require("../services/cache/global-cache");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use(auth_1.storeContext);
// GET /api/settings
// Requirements: 7.1 - Uses sp_Settings_GetByStore
router.get('/', async (req, res) => {
    try {
        const storeId = req.storeId;
        // Use SP Repository instead of inline query
        const settings = await settings_sp_repository_1.settingsSPRepository.getByStore(storeId);
        res.json({ settings });
    }
    catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Failed to get settings' });
    }
});
// PUT /api/settings
// Requirements: 7.2 - Uses sp_Settings_Upsert
router.put('/', async (req, res) => {
    try {
        const storeId = req.storeId;
        const settingsData = req.body;
        // Use SP Repository instead of inline query
        await settings_sp_repository_1.settingsSPRepository.upsert(storeId, settingsData);
        // If loyalty settings are included, update LoyaltyPointsSettings table (if table exists)
        if (settingsData.loyalty) {
            try {
                const loyaltySettings = settingsData.loyalty;
                // Check if loyalty settings exist
                const existingLoyalty = await loyalty_points_repository_1.loyaltyPointsRepository.getSettings(storeId);
                if (existingLoyalty) {
                    // Update existing settings
                    await loyalty_points_repository_1.loyaltyPointsRepository.updateSettings(storeId, {
                        enabled: loyaltySettings.enabled,
                        earnRate: loyaltySettings.pointsPerAmount ? 1 / loyaltySettings.pointsPerAmount : 0.00001,
                        redeemRate: loyaltySettings.pointsToVndRate || 1000,
                        minPointsToRedeem: 100,
                        maxRedeemPercentage: 50,
                    });
                }
                // Note: If no existing settings, skip - settings should be created via proper initialization
            }
            catch (loyaltyError) {
                // Ignore loyalty settings errors if table doesn't exist
                console.log('Loyalty settings update skipped:', loyaltyError instanceof Error ? loyaltyError.message : 'Unknown error');
            }
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});
// GET /api/settings/loyalty - Get loyalty points settings
router.get('/loyalty', async (req, res) => {
    try {
        const storeId = req.storeId;
        const settings = await loyalty_points_repository_1.loyaltyPointsRepository.getSettings(storeId);
        if (!settings) {
            res.status(404).json({ error: 'Loyalty settings not found' });
            return;
        }
        res.json(settings);
    }
    catch (error) {
        console.error('Get loyalty settings error:', error);
        res.status(500).json({ error: 'Failed to get loyalty settings' });
    }
});
// PUT /api/settings/loyalty - Update loyalty points settings
router.put('/loyalty', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { enabled, earnRate, redeemRate, minPointsToRedeem, maxRedeemPercentage, pointsExpiryDays } = req.body;
        const updated = await loyalty_points_repository_1.loyaltyPointsRepository.updateSettings(storeId, {
            enabled,
            earnRate,
            redeemRate,
            minPointsToRedeem,
            maxRedeemPercentage,
            pointsExpiryDays,
        });
        res.json({ success: true, settings: updated });
    }
    catch (error) {
        console.error('Update loyalty settings error:', error);
        res.status(500).json({ error: 'Failed to update loyalty settings' });
    }
});
// POST /api/settings/recalculate-tiers - Recalculate loyalty tiers for all customers
router.post('/recalculate-tiers', async (req, res) => {
    try {
        const storeId = req.storeId;
        // Get loyalty settings with tiers configuration
        const settings = await settings_sp_repository_1.settingsSPRepository.getByStore(storeId);
        const loyaltySettings = settings?.loyalty;
        if (!loyaltySettings || !loyaltySettings.enabled) {
            res.status(400).json({ error: 'Chương trình khách hàng thân thiết chưa được bật' });
            return;
        }
        const tiers = loyaltySettings.tiers || [];
        if (tiers.length === 0) {
            res.status(400).json({ error: 'Chưa cấu hình các hạng thành viên' });
            return;
        }
        // Sort tiers by threshold descending (highest first)
        const sortedTiers = [...tiers].sort((a, b) => b.threshold - a.threshold);
        // Get all customers with their actual total spent calculated from Sales table
        const customers = await (0, db_1.query)(`SELECT 
        c.id, 
        c.name, 
        ISNULL(SUM(s.final_amount), 0) as total_spent, 
        c.loyalty_tier 
       FROM Customers c
       LEFT JOIN Sales s ON c.id = s.customer_id AND s.store_id = c.store_id AND s.status != 'cancelled'
       WHERE c.store_id = @storeId AND c.status = 'active'
       GROUP BY c.id, c.name, c.loyalty_tier`, { storeId });
        let updatedCount = 0;
        const updates = [];
        for (const customer of customers) {
            // Determine new tier based on total_spent
            let newTier = 'bronze'; // Default tier
            for (const tier of sortedTiers) {
                if (customer.total_spent >= tier.threshold) {
                    newTier = tier.name;
                    break;
                }
            }
            // Always update to sync total_spent and tier
            await (0, db_1.query)(`UPDATE Customers 
         SET loyalty_tier = @newTier, 
             total_spent = @totalSpent,
             updated_at = GETDATE() 
         WHERE id = @id AND store_id = @storeId`, { id: customer.id, storeId, newTier, totalSpent: customer.total_spent });
            if (customer.loyalty_tier !== newTier) {
                updates.push({
                    name: customer.name,
                    oldTier: customer.loyalty_tier || 'bronze',
                    newTier,
                    totalSpent: customer.total_spent,
                });
                updatedCount++;
            }
        }
        res.json({
            success: true,
            message: `Đã cập nhật hạng cho ${updatedCount}/${customers.length} khách hàng`,
            totalCustomers: customers.length,
            updatedCount,
            updates,
        });
    }
    catch (error) {
        console.error('Recalculate tiers error:', error);
        res.status(500).json({ error: 'Không thể tính lại hạng khách hàng' });
    }
});
// GET /api/settings/cache-stats - Get cache statistics
router.get('/cache-stats', async (req, res) => {
    try {
        const stats = (0, global_cache_1.getAllCacheStats)();
        res.json({ success: true, stats });
    }
    catch (error) {
        console.error('Get cache stats error:', error);
        res.status(500).json({ error: 'Failed to get cache stats' });
    }
});
// POST /api/settings/clear-cache - Clear all caches for current store
router.post('/clear-cache', async (req, res) => {
    try {
        const storeId = req.storeId;
        await (0, global_cache_1.invalidateAllCaches)(storeId);
        res.json({ success: true, message: 'Cache cleared successfully' });
    }
    catch (error) {
        console.error('Clear cache error:', error);
        res.status(500).json({ error: 'Failed to clear cache' });
    }
});
exports.default = router;
//# sourceMappingURL=settings.js.map