"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const loyalty_points_repository_1 = require("../repositories/loyalty-points-repository");
const settings_sp_repository_1 = require("../repositories/settings-sp-repository");
const customers_sp_repository_1 = require("../repositories/customers-sp-repository");
const db_1 = require("../db");
const global_cache_1 = require("../services/cache/global-cache");
const xlsx = __importStar(require("xlsx"));
const TIER_ALIAS_MAP = {
    bronze: 'bronze',
    dong: 'bronze',
    silver: 'silver',
    bac: 'silver',
    gold: 'gold',
    vang: 'gold',
    diamond: 'diamond',
    kimcuong: 'diamond',
};
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use(auth_1.storeContext);
const toExcelSafeSheetName = (name) => {
    const cleaned = name.replace(/[\\/*?:\[\]]/g, '_').trim();
    return cleaned.slice(0, 31) || 'Sheet';
};
const toSerializableValue = (value) => {
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (typeof value === 'bigint') {
        return value.toString();
    }
    return value;
};
const toSerializableRows = (rows) => rows.map((row) => {
    const converted = {};
    for (const [key, value] of Object.entries(row)) {
        converted[key] = toSerializableValue(value);
    }
    return converted;
});
const buildBackupFileName = (now) => {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    return `backup_giao_dich_${year}${month}${day}_${hour}${minute}${second}.xlsx`;
};
const tableExists = async (tableName) => {
    const result = await (0, db_1.queryOne)(`SELECT COUNT(*) AS total FROM sys.tables WHERE name = @tableName`, { tableName });
    return Number(result?.total || 0) > 0;
};
const countRows = async (sql, params) => {
    const result = await (0, db_1.queryOne)(sql, params);
    return Number(result?.total || 0);
};
const toSafePositiveNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const normalizeTierName = (value) => {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) {
        return null;
    }
    const compactRaw = raw.replace(/\s+/g, '');
    const ascii = compactRaw
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z]/g, '');
    return TIER_ALIAS_MAP[compactRaw] || TIER_ALIAS_MAP[ascii] || null;
};
const buildLoyaltyPointsConfig = (loyaltySettings) => {
    const pointsPerAmount = toSafePositiveNumber(loyaltySettings.pointsPerAmount, 100000);
    const pointsToVndRate = toSafePositiveNumber(loyaltySettings.pointsToVndRate, 1000);
    return {
        enabled: Boolean(loyaltySettings.enabled),
        earnRate: loyaltySettings.earnRate && Number(loyaltySettings.earnRate) > 0
            ? Number(loyaltySettings.earnRate)
            : 1 / pointsPerAmount,
        redeemRate: loyaltySettings.redeemRate && Number(loyaltySettings.redeemRate) > 0
            ? Number(loyaltySettings.redeemRate)
            : pointsToVndRate,
        minPointsToRedeem: toSafePositiveNumber(loyaltySettings.minPointsToRedeem, 100),
        maxRedeemPercentage: toSafePositiveNumber(loyaltySettings.maxRedeemPercentage, 50),
        pointsExpiryDays: loyaltySettings.pointsExpiryDays ?? null,
    };
};
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
                const mapped = buildLoyaltyPointsConfig(loyaltySettings);
                const loyaltySettingsTableExists = await tableExists('LoyaltyPointsSettings');
                if (!loyaltySettingsTableExists) {
                    throw new Error('LoyaltyPointsSettings table not found');
                }
                const existingLoyalty = await loyalty_points_repository_1.loyaltyPointsRepository.getSettings(storeId);
                if (existingLoyalty) {
                    await loyalty_points_repository_1.loyaltyPointsRepository.updateSettings(storeId, {
                        enabled: mapped.enabled,
                        earnRate: mapped.earnRate,
                        redeemRate: mapped.redeemRate,
                        minPointsToRedeem: mapped.minPointsToRedeem,
                        maxRedeemPercentage: mapped.maxRedeemPercentage,
                        pointsExpiryDays: mapped.pointsExpiryDays ?? undefined,
                    });
                }
                else {
                    await (0, db_1.query)(`INSERT INTO LoyaltyPointsSettings
              (id, store_id, enabled, earn_rate, redeem_rate, min_points_to_redeem, max_redeem_percentage, points_expiry_days, created_at, updated_at)
             VALUES
              (NEWID(), @storeId, @enabled, @earnRate, @redeemRate, @minPointsToRedeem, @maxRedeemPercentage, @pointsExpiryDays, GETDATE(), GETDATE())`, {
                        storeId,
                        enabled: mapped.enabled,
                        earnRate: mapped.earnRate,
                        redeemRate: mapped.redeemRate,
                        minPointsToRedeem: mapped.minPointsToRedeem,
                        maxRedeemPercentage: mapped.maxRedeemPercentage,
                        pointsExpiryDays: mapped.pointsExpiryDays,
                    });
                }
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
        const tierThresholdMap = new Map();
        for (const tier of loyaltySettings.tiers || []) {
            const normalizedName = normalizeTierName(tier.name);
            const threshold = Number(tier.threshold || 0);
            if (!normalizedName || !Number.isFinite(threshold)) {
                continue;
            }
            const currentThreshold = tierThresholdMap.get(normalizedName);
            if (currentThreshold === undefined || threshold > currentThreshold) {
                tierThresholdMap.set(normalizedName, threshold);
            }
        }
        if (tierThresholdMap.size === 0) {
            res.status(400).json({ error: 'Chưa cấu hình các hạng thành viên' });
            return;
        }
        // Always keep bronze baseline so customers can be assigned safely.
        if (!tierThresholdMap.has('bronze')) {
            tierThresholdMap.set('bronze', 0);
        }
        // Sort tiers by threshold descending (highest first)
        const sortedTiers = Array.from(tierThresholdMap.entries())
            .map(([name, threshold]) => ({ name, threshold }))
            .sort((a, b) => b.threshold - a.threshold);
        const customers = await customers_sp_repository_1.customersSPRepository.getByStore(storeId);
        const activeCustomers = customers.filter((customer) => !customer.status || customer.status === 'active');
        let updatedCount = 0;
        const updates = [];
        const failedUpdates = [];
        for (const customer of activeCustomers) {
            const lifetimePoints = Number(customer.lifetimePoints ?? customer.loyaltyPoints ?? 0);
            // Determine new tier based on points threshold from settings
            let newTier = 'bronze'; // Default tier
            for (const tier of sortedTiers) {
                if (lifetimePoints >= tier.threshold) {
                    newTier = tier.name;
                    break;
                }
            }
            if (customer.loyaltyTier !== newTier) {
                try {
                    const updated = await customers_sp_repository_1.customersSPRepository.update(customer.id, storeId, {
                        loyaltyTier: newTier,
                    });
                    if (!updated) {
                        throw new Error('Không cập nhật được khách hàng');
                    }
                    updates.push({
                        name: customer.name,
                        oldTier: customer.loyaltyTier || 'bronze',
                        newTier,
                        lifetimePoints,
                    });
                    updatedCount++;
                }
                catch (updateError) {
                    failedUpdates.push({
                        customerId: customer.id,
                        name: customer.name,
                        error: updateError instanceof Error ? updateError.message : 'Unknown error',
                    });
                }
            }
        }
        if (failedUpdates.length > 0) {
            console.error('[Settings] Loyalty tier recalculation had failed updates:', failedUpdates);
        }
        const message = failedUpdates.length > 0
            ? `Đã cập nhật hạng cho ${updatedCount}/${activeCustomers.length} khách hàng. ${failedUpdates.length} khách hàng không cập nhật được.`
            : `Đã cập nhật hạng cho ${updatedCount}/${activeCustomers.length} khách hàng`;
        res.json({
            success: true,
            message,
            totalCustomers: activeCustomers.length,
            updatedCount,
            failedCount: failedUpdates.length,
            failedUpdates,
            updates,
        });
    }
    catch (error) {
        console.error('Recalculate tiers error:', error);
        res.status(500).json({
            error: 'Không thể tính lại hạng khách hàng',
            detail: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// POST /api/settings/backup-transactional-data - Export transactional data to Excel (base64)
router.post('/backup-transactional-data', async (req, res) => {
    try {
        const storeId = req.storeId;
        const now = new Date();
        const sources = [
            {
                sheetName: 'Sales',
                requiredTables: ['Sales'],
                querySql: `SELECT * FROM Sales WHERE store_id = @storeId ORDER BY transaction_date DESC`,
            },
            {
                sheetName: 'SalesItems',
                requiredTables: ['SalesItems', 'Sales'],
                querySql: `
          SELECT si.*
          FROM SalesItems si
          WHERE si.sales_transaction_id IN (
            SELECT s.id FROM Sales s WHERE s.store_id = @storeId
          )
        `,
            },
            {
                sheetName: 'PurchaseOrders',
                requiredTables: ['PurchaseOrders'],
                querySql: `SELECT * FROM PurchaseOrders WHERE store_id = @storeId ORDER BY import_date DESC`,
            },
            {
                sheetName: 'PurchaseOrderItems',
                requiredTables: ['PurchaseOrderItems', 'PurchaseOrders'],
                querySql: `
          SELECT poi.*
          FROM PurchaseOrderItems poi
          WHERE poi.purchase_order_id IN (
            SELECT po.id FROM PurchaseOrders po WHERE po.store_id = @storeId
          )
        `,
            },
            {
                sheetName: 'PurchaseLots',
                requiredTables: ['PurchaseLots'],
                querySql: `SELECT * FROM PurchaseLots WHERE store_id = @storeId ORDER BY import_date DESC`,
            },
            {
                sheetName: 'Payments',
                requiredTables: ['Payments'],
                querySql: `SELECT * FROM Payments WHERE store_id = @storeId ORDER BY payment_date DESC`,
            },
            {
                sheetName: 'SupplierPayments',
                requiredTables: ['SupplierPayments'],
                querySql: `SELECT * FROM SupplierPayments WHERE store_id = @storeId ORDER BY payment_date DESC`,
            },
            {
                sheetName: 'CashTransactions',
                requiredTables: ['CashTransactions'],
                querySql: `SELECT * FROM CashTransactions WHERE store_id = @storeId ORDER BY transaction_date DESC`,
            },
            {
                sheetName: 'Shifts',
                requiredTables: ['Shifts'],
                querySql: `SELECT * FROM Shifts WHERE store_id = @storeId ORDER BY start_time DESC`,
            },
            {
                sheetName: 'LoyaltyPointsTransactions',
                requiredTables: ['LoyaltyPointsTransactions'],
                querySql: `SELECT * FROM LoyaltyPointsTransactions WHERE store_id = @storeId ORDER BY created_at DESC`,
            },
            {
                sheetName: 'CustomerDiscountTransactions',
                requiredTables: ['CustomerDiscountTransactions'],
                querySql: `SELECT * FROM CustomerDiscountTransactions WHERE store_id = @storeId ORDER BY created_at DESC`,
            },
            {
                sheetName: 'CustomerDiscountPayouts',
                requiredTables: ['CustomerDiscountPayouts'],
                querySql: `SELECT * FROM CustomerDiscountPayouts WHERE store_id = @storeId ORDER BY created_at DESC`,
            },
            {
                sheetName: 'UnitConversionLog',
                requiredTables: ['UnitConversionLog'],
                querySql: `SELECT * FROM UnitConversionLog WHERE StoreId = @storeId ORDER BY ConversionDate DESC`,
            },
        ];
        const requiredTableSet = new Set(sources.flatMap((source) => source.requiredTables));
        const tableStatesEntries = await Promise.all(Array.from(requiredTableSet).map(async (table) => [table, await tableExists(table)]));
        const tableStates = Object.fromEntries(tableStatesEntries);
        const workbook = xlsx.utils.book_new();
        const summaryRows = [];
        for (const source of sources) {
            const canExport = source.requiredTables.every((table) => tableStates[table]);
            if (!canExport) {
                summaryRows.push({
                    sheet: source.sheetName,
                    exported: false,
                    rows: 0,
                    note: `Bỏ qua vì thiếu bảng: ${source.requiredTables.filter((table) => !tableStates[table]).join(', ')}`,
                });
                continue;
            }
            try {
                const rows = await (0, db_1.query)(source.querySql, { storeId });
                const serializableRows = toSerializableRows(rows);
                const sheetData = serializableRows.length > 0 ? serializableRows : [{ _info: 'Không có dữ liệu' }];
                const worksheet = xlsx.utils.json_to_sheet(sheetData);
                xlsx.utils.book_append_sheet(workbook, worksheet, toExcelSafeSheetName(source.sheetName));
                summaryRows.push({
                    sheet: source.sheetName,
                    exported: true,
                    rows: rows.length,
                    note: '',
                });
            }
            catch (sheetError) {
                console.error(`[Settings Backup] Failed to export ${source.sheetName}:`, sheetError);
                summaryRows.push({
                    sheet: source.sheetName,
                    exported: false,
                    rows: 0,
                    note: sheetError instanceof Error ? sheetError.message : 'Unknown error',
                });
            }
        }
        const metaRows = [
            { key: 'generated_at', value: now.toISOString() },
            { key: 'store_id', value: storeId },
            { key: 'sheet_count', value: workbook.SheetNames.length },
        ];
        const metaSheet = xlsx.utils.json_to_sheet(metaRows);
        xlsx.utils.book_append_sheet(workbook, metaSheet, toExcelSafeSheetName('BackupInfo'));
        const summarySheet = xlsx.utils.json_to_sheet(summaryRows);
        xlsx.utils.book_append_sheet(workbook, summarySheet, toExcelSafeSheetName('BackupSummary'));
        const fileBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.json({
            success: true,
            fileName: buildBackupFileName(now),
            data: fileBuffer.toString('base64'),
            sheets: summaryRows,
        });
    }
    catch (error) {
        console.error('Backup transactional data error:', error);
        res.status(500).json({ error: 'Không thể sao lưu dữ liệu giao dịch' });
    }
});
// POST /api/settings/delete-transactional-data - Delete transactional data and reset aggregates
router.post('/delete-transactional-data', async (req, res) => {
    try {
        const storeId = req.storeId;
        const deleteSteps = [
            {
                key: 'SalesItems',
                requiredTables: ['SalesItems', 'Sales'],
                countSql: `
          SELECT COUNT(*) AS total
          FROM SalesItems
          WHERE sales_transaction_id IN (
            SELECT id FROM Sales WHERE store_id = @storeId
          )
        `,
                deleteSql: `
          DELETE FROM SalesItems
          WHERE sales_transaction_id IN (
            SELECT id FROM Sales WHERE store_id = @storeId
          )
        `,
            },
            {
                key: 'PurchaseOrderItems',
                requiredTables: ['PurchaseOrderItems', 'PurchaseOrders'],
                countSql: `
          SELECT COUNT(*) AS total
          FROM PurchaseOrderItems
          WHERE purchase_order_id IN (
            SELECT id FROM PurchaseOrders WHERE store_id = @storeId
          )
        `,
                deleteSql: `
          DELETE FROM PurchaseOrderItems
          WHERE purchase_order_id IN (
            SELECT id FROM PurchaseOrders WHERE store_id = @storeId
          )
        `,
            },
            {
                key: 'Payments',
                requiredTables: ['Payments'],
                countSql: `SELECT COUNT(*) AS total FROM Payments WHERE store_id = @storeId`,
                deleteSql: `DELETE FROM Payments WHERE store_id = @storeId`,
            },
            {
                key: 'SupplierPayments',
                requiredTables: ['SupplierPayments'],
                countSql: `SELECT COUNT(*) AS total FROM SupplierPayments WHERE store_id = @storeId`,
                deleteSql: `DELETE FROM SupplierPayments WHERE store_id = @storeId`,
            },
            {
                key: 'CashTransactions',
                requiredTables: ['CashTransactions'],
                countSql: `SELECT COUNT(*) AS total FROM CashTransactions WHERE store_id = @storeId`,
                deleteSql: `DELETE FROM CashTransactions WHERE store_id = @storeId`,
            },
            {
                key: 'Shifts',
                requiredTables: ['Shifts'],
                countSql: `SELECT COUNT(*) AS total FROM Shifts WHERE store_id = @storeId`,
                deleteSql: `DELETE FROM Shifts WHERE store_id = @storeId`,
            },
            {
                key: 'LoyaltyPointsTransactions',
                requiredTables: ['LoyaltyPointsTransactions'],
                countSql: `SELECT COUNT(*) AS total FROM LoyaltyPointsTransactions WHERE store_id = @storeId`,
                deleteSql: `DELETE FROM LoyaltyPointsTransactions WHERE store_id = @storeId`,
            },
            {
                key: 'CustomerDiscountTransactions',
                requiredTables: ['CustomerDiscountTransactions'],
                countSql: `SELECT COUNT(*) AS total FROM CustomerDiscountTransactions WHERE store_id = @storeId`,
                deleteSql: `DELETE FROM CustomerDiscountTransactions WHERE store_id = @storeId`,
            },
            {
                key: 'CustomerDiscountPayouts',
                requiredTables: ['CustomerDiscountPayouts'],
                countSql: `SELECT COUNT(*) AS total FROM CustomerDiscountPayouts WHERE store_id = @storeId`,
                deleteSql: `DELETE FROM CustomerDiscountPayouts WHERE store_id = @storeId`,
            },
            {
                key: 'UnitConversionLog',
                requiredTables: ['UnitConversionLog'],
                countSql: `SELECT COUNT(*) AS total FROM UnitConversionLog WHERE StoreId = @storeId`,
                deleteSql: `DELETE FROM UnitConversionLog WHERE StoreId = @storeId`,
            },
            {
                key: 'Sales',
                requiredTables: ['Sales'],
                countSql: `SELECT COUNT(*) AS total FROM Sales WHERE store_id = @storeId`,
                deleteSql: `DELETE FROM Sales WHERE store_id = @storeId`,
            },
            {
                key: 'PurchaseLots',
                requiredTables: ['PurchaseLots'],
                countSql: `SELECT COUNT(*) AS total FROM PurchaseLots WHERE store_id = @storeId`,
                deleteSql: `DELETE FROM PurchaseLots WHERE store_id = @storeId`,
            },
            {
                key: 'PurchaseOrders',
                requiredTables: ['PurchaseOrders'],
                countSql: `SELECT COUNT(*) AS total FROM PurchaseOrders WHERE store_id = @storeId`,
                deleteSql: `DELETE FROM PurchaseOrders WHERE store_id = @storeId`,
            },
            {
                key: 'ProductInventory',
                requiredTables: ['ProductInventory'],
                countSql: `SELECT COUNT(*) AS total FROM ProductInventory WHERE StoreId = @storeId`,
                deleteSql: `DELETE FROM ProductInventory WHERE StoreId = @storeId`,
            },
        ];
        const requiredTableSet = new Set(deleteSteps.flatMap((step) => step.requiredTables).concat(['Customers', 'Products']));
        const tableStatesEntries = await Promise.all(Array.from(requiredTableSet).map(async (table) => [table, await tableExists(table)]));
        const tableStates = Object.fromEntries(tableStatesEntries);
        const deleted = {};
        for (const step of deleteSteps) {
            const canDelete = step.requiredTables.every((table) => tableStates[table]);
            if (!canDelete) {
                deleted[step.key] = 0;
                continue;
            }
            const total = await countRows(step.countSql, { storeId });
            if (total > 0) {
                await (0, db_1.query)(step.deleteSql, { storeId });
            }
            deleted[step.key] = total;
        }
        if (tableStates.Customers) {
            const customersTotal = await countRows(`SELECT COUNT(*) AS total FROM Customers WHERE store_id = @storeId`, { storeId });
            await (0, db_1.query)(`
          IF COL_LENGTH('Customers', 'total_debt') IS NOT NULL
            UPDATE Customers SET total_debt = 0 WHERE store_id = @storeId;

          IF COL_LENGTH('Customers', 'total_paid') IS NOT NULL
            UPDATE Customers SET total_paid = 0 WHERE store_id = @storeId;

          IF COL_LENGTH('Customers', 'total_spent') IS NOT NULL
            UPDATE Customers SET total_spent = 0 WHERE store_id = @storeId;

          IF COL_LENGTH('Customers', 'loyalty_points') IS NOT NULL
            UPDATE Customers SET loyalty_points = 0 WHERE store_id = @storeId;

          IF COL_LENGTH('Customers', 'loyalty_tier') IS NOT NULL
            UPDATE Customers SET loyalty_tier = 'bronze' WHERE store_id = @storeId;

          IF COL_LENGTH('Customers', 'updated_at') IS NOT NULL
            UPDATE Customers SET updated_at = GETDATE() WHERE store_id = @storeId;
        `, { storeId });
            deleted.CustomersReset = customersTotal;
        }
        if (tableStates.Products) {
            const productsTotal = await countRows(`SELECT COUNT(*) AS total FROM Products WHERE store_id = @storeId`, { storeId });
            await (0, db_1.query)(`
          IF COL_LENGTH('Products', 'stock_quantity') IS NOT NULL
            UPDATE Products SET stock_quantity = 0 WHERE store_id = @storeId;

          IF COL_LENGTH('Products', 'updated_at') IS NOT NULL
            UPDATE Products SET updated_at = GETDATE() WHERE store_id = @storeId;
        `, { storeId });
            deleted.ProductsReset = productsTotal;
        }
        const totalDeleted = Object.values(deleted).reduce((sum, count) => sum + count, 0);
        res.json({
            success: true,
            message: 'Đã xóa toàn bộ dữ liệu giao dịch và reset dữ liệu liên quan.',
            deleted,
            totalDeleted,
        });
    }
    catch (error) {
        console.error('Delete transactional data error:', error);
        res.status(500).json({ error: 'Không thể xóa dữ liệu giao dịch' });
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