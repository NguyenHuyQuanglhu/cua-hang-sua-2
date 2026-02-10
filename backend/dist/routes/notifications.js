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
const notificationService = __importStar(require("../services/notification-service"));
const db_1 = require("../db");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use(auth_1.storeContext);
// POST /api/notifications/send - Send a notification
router.post('/send', async (req, res) => {
    try {
        const { email, type, data } = req.body;
        if (!email || !type) {
            return res.status(400).json({ error: 'Email and type are required' });
        }
        const validTypes = [
            'order_confirmation',
            'order_shipped',
            'order_delivered',
            'low_stock_alert',
            'payment_received',
            'refund_processed',
            'welcome_customer',
            'password_reset',
        ];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: 'Invalid notification type' });
        }
        const result = await notificationService.sendEmailNotification(email, type, data);
        if (result.success) {
            res.json({ success: true, message: 'Notification sent successfully' });
        }
        else {
            res.status(500).json({ success: false, error: result.error });
        }
    }
    catch (error) {
        console.error('Send notification error:', error);
        res.status(500).json({ error: 'Failed to send notification' });
    }
});
// POST /api/notifications/check-low-stock - Check and send low stock alerts
router.post('/check-low-stock', async (req, res) => {
    try {
        const storeId = req.storeId;
        const tenantId = req.user?.tenantId;
        const { alertEmail } = req.body;
        if (!storeId || !tenantId) {
            return res.status(400).json({ error: 'Store context required' });
        }
        if (!alertEmail) {
            return res.status(400).json({ error: 'Alert email is required' });
        }
        const result = await notificationService.checkAndSendLowStockAlerts(storeId, tenantId, alertEmail);
        res.json({
            success: true,
            message: result.sent
                ? `Low stock alert sent for ${result.productCount} products`
                : 'No low stock products found',
            ...result,
        });
    }
    catch (error) {
        console.error('Check low stock error:', error);
        res.status(500).json({ error: 'Failed to check low stock' });
    }
});
// GET /api/notifications/logs - Get notification logs
router.get('/logs', async (req, res) => {
    try {
        const { page = '1', pageSize = '20', type, status } = req.query;
        const pageNum = parseInt(page);
        const pageSizeNum = parseInt(pageSize);
        const offset = (pageNum - 1) * pageSizeNum;
        let whereClause = '1=1';
        const params = { offset, pageSize: pageSizeNum };
        if (type) {
            whereClause += ' AND Type = @type';
            params.type = type;
        }
        if (status) {
            whereClause += ' AND Status = @status';
            params.status = status;
        }
        const countResult = await (0, db_1.executeQuery)(`SELECT COUNT(*) as total FROM NotificationLogs WHERE ${whereClause}`, params);
        const total = countResult.recordset?.[0]?.total || 0;
        const logsResult = await (0, db_1.executeQuery)(`SELECT * FROM NotificationLogs
       WHERE ${whereClause}
       ORDER BY CreatedAt DESC
       OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`, params);
        res.json({
            success: true,
            data: logsResult.recordset || [],
            total,
            page: pageNum,
            pageSize: pageSizeNum,
            totalPages: Math.ceil(total / pageSizeNum),
        });
    }
    catch (error) {
        // Table may not exist
        res.json({
            success: true,
            data: [],
            total: 0,
            page: 1,
            pageSize: 20,
            totalPages: 0,
        });
    }
});
exports.default = router;
//# sourceMappingURL=notifications.js.map