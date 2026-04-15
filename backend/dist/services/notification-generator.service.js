"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationGeneratorService = void 0;
const mssql_1 = __importDefault(require("mssql"));
const uuid_1 = require("uuid");
const connection_1 = require("../db/connection");
const node_cron_1 = __importDefault(require("node-cron"));
class NotificationGeneratorService {
    cronJob = null;
    start() {
        // Run every hour
        this.cronJob = node_cron_1.default.schedule('0 * * * *', async () => {
            console.log('[NotificationGenerator] Running scheduled checks...');
            await this.checkLowStock();
            await this.checkDebtReminders();
            await this.checkShiftEnding();
        });
        console.log('[NotificationGenerator] Service started');
    }
    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            console.log('[NotificationGenerator] Service stopped');
        }
    }
    async checkLowStock() {
        try {
            const pool = await (0, connection_1.getConnection)();
            // Get products with low stock
            const result = await pool.request().query(`
        SELECT 
          p.id as product_id,
          p.name as product_name,
          p.store_id,
          ISNULL(SUM(i.quantity), 0) as current_stock
        FROM Products p
        LEFT JOIN Inventory i ON p.id = i.product_id
        WHERE p.status = 'active'
        GROUP BY p.id, p.name, p.store_id
        HAVING ISNULL(SUM(i.quantity), 0) <= 10
      `);
            for (const product of result.recordset) {
                // Check if notification already exists for this product (within last 24 hours)
                const existingNotif = await pool
                    .request()
                    .input('storeId', mssql_1.default.UniqueIdentifier, product.store_id)
                    .input('type', mssql_1.default.NVarChar(50), 'low_stock')
                    .input('productId', mssql_1.default.NVarChar(mssql_1.default.MAX), `%"productId":"${product.product_id}"%`)
                    .query(`
            SELECT id FROM Notifications
            WHERE store_id = @storeId
            AND type = @type
            AND data LIKE @productId
            AND created_at > DATEADD(HOUR, -24, GETDATE())
          `);
                if (existingNotif.recordset.length === 0) {
                    // Create notification
                    await pool
                        .request()
                        .input('id', mssql_1.default.UniqueIdentifier, (0, uuid_1.v4)())
                        .input('storeId', mssql_1.default.UniqueIdentifier, product.store_id)
                        .input('type', mssql_1.default.NVarChar(50), 'low_stock')
                        .input('title', mssql_1.default.NVarChar(255), 'Cảnh báo tồn kho thấp')
                        .input('message', mssql_1.default.NVarChar(mssql_1.default.MAX), `Sản phẩm "${product.product_name}" chỉ còn ${product.current_stock} sản phẩm trong kho`)
                        .input('data', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify({
                        productId: product.product_id,
                        productName: product.product_name,
                        currentStock: product.current_stock,
                    }))
                        .input('priority', mssql_1.default.NVarChar(20), 'high')
                        .input('actionUrl', mssql_1.default.NVarChar(500), '/products')
                        .query(`
              INSERT INTO Notifications (
                id, store_id, user_id, type, title, message, data, priority, action_url
              ) VALUES (
                @id, @storeId, NULL, @type, @title, @message, @data, @priority, @actionUrl
              )
            `);
                    console.log(`[NotificationGenerator] Created low stock notification for ${product.product_name}`);
                }
            }
        }
        catch (error) {
            console.error('[NotificationGenerator] Error checking low stock:', error);
        }
    }
    async checkDebtReminders() {
        try {
            const pool = await (0, connection_1.getConnection)();
            // Get customers with debt > 0
            const result = await pool.request().query(`
        SELECT 
          c.id as customer_id,
          c.name as customer_name,
          c.store_id,
          c.totalDebt as debt_amount
        FROM Customers c
        WHERE c.totalDebt > 0
        AND c.status = 'active'
      `);
            for (const customer of result.recordset) {
                // Check if notification already exists for this customer (within last 7 days)
                const existingNotif = await pool
                    .request()
                    .input('storeId', mssql_1.default.UniqueIdentifier, customer.store_id)
                    .input('type', mssql_1.default.NVarChar(50), 'debt_reminder')
                    .input('customerId', mssql_1.default.NVarChar(mssql_1.default.MAX), `%"customerId":"${customer.customer_id}"%`)
                    .query(`
            SELECT id FROM Notifications
            WHERE store_id = @storeId
            AND type = @type
            AND data LIKE @customerId
            AND created_at > DATEADD(DAY, -7, GETDATE())
          `);
                if (existingNotif.recordset.length === 0) {
                    // Create notification
                    await pool
                        .request()
                        .input('id', mssql_1.default.UniqueIdentifier, (0, uuid_1.v4)())
                        .input('storeId', mssql_1.default.UniqueIdentifier, customer.store_id)
                        .input('type', mssql_1.default.NVarChar(50), 'debt_reminder')
                        .input('title', mssql_1.default.NVarChar(255), 'Nhắc nhở công nợ')
                        .input('message', mssql_1.default.NVarChar(mssql_1.default.MAX), `Khách hàng "${customer.customer_name}" đang nợ ${customer.debt_amount.toLocaleString('vi-VN')}đ`)
                        .input('data', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify({
                        customerId: customer.customer_id,
                        customerName: customer.customer_name,
                        debtAmount: customer.debt_amount,
                    }))
                        .input('priority', mssql_1.default.NVarChar(20), 'normal')
                        .input('actionUrl', mssql_1.default.NVarChar(500), '/reports/debt')
                        .query(`
              INSERT INTO Notifications (
                id, store_id, user_id, type, title, message, data, priority, action_url
              ) VALUES (
                @id, @storeId, NULL, @type, @title, @message, @data, @priority, @actionUrl
              )
            `);
                    console.log(`[NotificationGenerator] Created debt reminder for ${customer.customer_name}`);
                }
            }
        }
        catch (error) {
            console.error('[NotificationGenerator] Error checking debt reminders:', error);
        }
    }
    async checkShiftEnding() {
        try {
            const pool = await (0, connection_1.getConnection)();
            // Get active shifts that will end in 30 minutes
            const result = await pool.request().query(`
        SELECT 
          s.id as shift_id,
          s.user_id,
          s.store_id,
          u.name as user_name,
          u.maxShiftHours,
          s.start_time
        FROM Shifts s
        INNER JOIN Users u ON s.user_id = u.id
        WHERE s.status = 'active'
        AND u.maxShiftHours IS NOT NULL
        AND u.maxShiftHours > 0
        AND DATEADD(HOUR, u.maxShiftHours, s.start_time) <= DATEADD(MINUTE, 30, GETDATE())
        AND DATEADD(HOUR, u.maxShiftHours, s.start_time) > GETDATE()
      `);
            for (const shift of result.recordset) {
                // Check if notification already exists for this shift
                const existingNotif = await pool
                    .request()
                    .input('storeId', mssql_1.default.UniqueIdentifier, shift.store_id)
                    .input('userId', mssql_1.default.UniqueIdentifier, shift.user_id)
                    .input('type', mssql_1.default.NVarChar(50), 'shift_ending')
                    .input('shiftId', mssql_1.default.NVarChar(mssql_1.default.MAX), `%"shiftId":"${shift.shift_id}"%`)
                    .query(`
            SELECT id FROM Notifications
            WHERE store_id = @storeId
            AND user_id = @userId
            AND type = @type
            AND data LIKE @shiftId
            AND created_at > DATEADD(HOUR, -1, GETDATE())
          `);
                if (existingNotif.recordset.length === 0) {
                    // Create notification
                    await pool
                        .request()
                        .input('id', mssql_1.default.UniqueIdentifier, (0, uuid_1.v4)())
                        .input('storeId', mssql_1.default.UniqueIdentifier, shift.store_id)
                        .input('userId', mssql_1.default.UniqueIdentifier, shift.user_id)
                        .input('type', mssql_1.default.NVarChar(50), 'shift_ending')
                        .input('title', mssql_1.default.NVarChar(255), 'Ca làm việc sắp kết thúc')
                        .input('message', mssql_1.default.NVarChar(mssql_1.default.MAX), `Ca làm việc của bạn sẽ tự động đóng trong 30 phút nữa`)
                        .input('data', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify({
                        shiftId: shift.shift_id,
                        userName: shift.user_name,
                        maxShiftHours: shift.maxShiftHours,
                    }))
                        .input('priority', mssql_1.default.NVarChar(20), 'high')
                        .input('actionUrl', mssql_1.default.NVarChar(500), '/shifts')
                        .query(`
              INSERT INTO Notifications (
                id, store_id, user_id, type, title, message, data, priority, action_url
              ) VALUES (
                @id, @storeId, @userId, @type, @title, @message, @data, @priority, @actionUrl
              )
            `);
                    console.log(`[NotificationGenerator] Created shift ending notification for ${shift.user_name}`);
                }
            }
        }
        catch (error) {
            console.error('[NotificationGenerator] Error checking shift ending:', error);
        }
    }
    /**
     * Create notification when customer tier is upgraded
     */
    async createTierUpgradeNotification(customerId, customerName, storeId, oldTier, newTier, lifetimePoints) {
        try {
            const pool = await (0, connection_1.getConnection)();
            const tierNames = {
                bronze: 'Đồng',
                silver: 'Bạc',
                gold: 'Vàng',
                diamond: 'Kim Cương'
            };
            const oldTierName = tierNames[oldTier] || oldTier;
            const newTierName = tierNames[newTier] || newTier;
            // Create notification
            await pool
                .request()
                .input('id', mssql_1.default.UniqueIdentifier, (0, uuid_1.v4)())
                .input('storeId', mssql_1.default.UniqueIdentifier, storeId)
                .input('type', mssql_1.default.NVarChar(50), 'tier_upgrade')
                .input('title', mssql_1.default.NVarChar(255), 'Chúc mừng! Khách hàng lên hạng')
                .input('message', mssql_1.default.NVarChar(mssql_1.default.MAX), `Khách hàng "${customerName}" đã lên hạng từ ${oldTierName} lên ${newTierName} với ${lifetimePoints.toLocaleString('vi-VN')} điểm tích lũy`)
                .input('data', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify({
                customerId,
                customerName,
                oldTier,
                newTier,
                lifetimePoints,
            }))
                .input('priority', mssql_1.default.NVarChar(20), 'normal')
                .input('actionUrl', mssql_1.default.NVarChar(500), `/customers`)
                .query(`
          INSERT INTO Notifications (
            id, store_id, user_id, type, title, message, data, priority, action_url
          ) VALUES (
            @id, @storeId, NULL, @type, @title, @message, @data, @priority, @actionUrl
          )
        `);
            console.log(`[NotificationGenerator] Created tier upgrade notification for ${customerName}: ${oldTier} -> ${newTier}`);
        }
        catch (error) {
            console.error('[NotificationGenerator] Error creating tier upgrade notification:', error);
        }
    }
}
exports.notificationGeneratorService = new NotificationGeneratorService();
//# sourceMappingURL=notification-generator.service.js.map