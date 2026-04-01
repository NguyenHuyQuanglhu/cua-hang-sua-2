"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const inventory_transfer_service_1 = require("../services/inventory-transfer-service");
const sync_data_service_1 = require("../services/sync-data-service");
const inventory_service_1 = require("../services/inventory-service");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use(auth_1.storeContext);
// POST /api/sync-data - Đồng bộ và tạo dữ liệu mẫu
router.post('/', async (req, res) => {
    try {
        const storeId = req.storeId;
        const results = await sync_data_service_1.syncDataService.syncAllData(storeId);
        res.json({
            success: true,
            message: 'Đồng bộ dữ liệu thành công',
            results,
        });
    }
    catch (error) {
        console.error('Sync data error:', error);
        res.status(500).json({ error: 'Failed to sync data' });
    }
});
// POST /api/sync-data/customers - Đồng bộ tài khoản khách hàng (tính lại công nợ từ Sales)
router.post('/customers', async (req, res) => {
    try {
        const storeId = req.storeId;
        const result = await sync_data_service_1.syncDataService.syncCustomerAccounts(storeId);
        res.json({
            success: true,
            message: `Đồng bộ tài khoản khách hàng thành công. Đã cập nhật ${result.updatedCustomers}/${result.totalCustomers} khách hàng.`,
            ...result,
        });
    }
    catch (error) {
        console.error('Sync customer accounts error:', error);
        res.status(500).json({ error: 'Failed to sync customer accounts' });
    }
});
// POST /api/sync-data/inventory - Sync inventory from Products to ProductInventory
// Uses sp_Inventory_Sync stored procedure
// Requirements: 4.4
router.post('/inventory', async (req, res) => {
    try {
        const storeId = req.storeId;
        // Use SP Repository for inventory sync
        const syncedCount = await inventory_service_1.inventoryService.syncAllInventory(storeId);
        res.json({
            success: true,
            message: `Đồng bộ tồn kho thành công`,
            syncedCount,
        });
    }
    catch (error) {
        console.error('Sync inventory error:', error);
        res.status(500).json({ error: 'Failed to sync inventory' });
    }
});
// POST /api/sync-data/inventory-transfer - Transfer inventory between stores
router.post('/inventory-transfer', async (req, res) => {
    try {
        const { sourceStoreId, destinationStoreId, items, notes } = req.body;
        const userId = req.user?.id;
        // Validate required fields
        if (!sourceStoreId || !destinationStoreId) {
            return res.status(400).json({
                error: 'Source and destination store IDs are required',
                code: 'MISSING_STORE_IDS',
            });
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                error: 'At least one item is required for transfer',
                code: 'MISSING_ITEMS',
            });
        }
        // Validate each item
        for (const item of items) {
            if (!item.productId || !item.quantity || item.quantity <= 0 || !item.unitId) {
                return res.status(400).json({
                    error: 'Each item must have productId, quantity (> 0), and unitId',
                    code: 'INVALID_ITEM',
                });
            }
        }
        // Validate stores belong to same tenant
        const validation = await inventory_transfer_service_1.inventoryTransferService.validateStoresSameTenant(sourceStoreId, destinationStoreId);
        if (!validation.valid) {
            return res.status(400).json({
                error: validation.error,
                code: 'STORES_NOT_SAME_TENANT',
            });
        }
        // Perform the transfer
        const result = await inventory_transfer_service_1.inventoryTransferService.transferInventory({
            sourceStoreId,
            destinationStoreId,
            items,
            notes,
            createdBy: userId,
        });
        res.json(result);
    }
    catch (error) {
        console.error('Inventory transfer error:', error);
        if (error instanceof inventory_transfer_service_1.InsufficientStockException) {
            return res.status(400).json({
                error: error.message,
                code: 'INSUFFICIENT_STOCK',
                details: error.errors,
            });
        }
        const errorMessage = error instanceof Error ? error.message : 'Failed to transfer inventory';
        res.status(500).json({ error: errorMessage, code: 'TRANSFER_FAILED' });
    }
});
exports.default = router;
//# sourceMappingURL=sync-data.js.map