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
const db_1 = require("../db");
const emailNotificationService = __importStar(require("../services/email-notification-service"));
const permissions_1 = require("../auth/permissions");
const router = (0, express_1.Router)();
// Apply authentication and store context to all routes
router.use(auth_1.authenticate);
router.use(auth_1.storeContext);
// Permission check middleware
const checkDebtReminderPermission = (req, res, next) => {
    const userRole = req.userRole;
    const userPermissions = req.userPermissions;
    if (!(0, permissions_1.hasPermission)(userPermissions, userRole, 'debt_reminder', 'add')) {
        res.status(403).json({
            error: 'Bạn không có quyền gửi thông báo nhắc nợ',
            code: 'PERMISSION_DENIED'
        });
        return;
    }
    next();
};
/**
 * POST /api/debt-reminder/send
 * Send debt reminder to a customer via email or SMS
 */
router.post('/send', checkDebtReminderPermission, async (req, res) => {
    try {
        const storeId = req.storeId;
        const { customerId, message } = req.body;
        if (!customerId) {
            res.status(400).json({ error: 'Customer ID is required' });
            return;
        }
        // Get customer info
        const customer = await (0, db_1.query)(`SELECT 
        c.id,
        c.name,
        c.email,
        c.phone,
        c.total_debt as currentDebt,
        c.total_paid as totalPaid,
        s.name as storeName
      FROM Customers c
      LEFT JOIN Stores s ON c.store_id = s.id
      WHERE c.id = @customerId AND c.store_id = @storeId`, { customerId, storeId });
        if (!customer || customer.length === 0) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        const customerData = customer[0];
        const debt = customerData.currentDebt || 0;
        if (debt <= 0) {
            res.status(400).json({ error: 'Customer has no debt' });
            return;
        }
        const result = {
            success: false,
            method: 'none',
            message: '',
            customerName: customerData.name,
        };
        // Try email first
        if (customerData.email) {
            try {
                const emailMessage = message ||
                    `Kính gửi ${customerData.name},\n\n` +
                        `Cửa hàng ${customerData.storeName} xin thông báo bạn đang có khoản nợ: ${formatCurrency(debt)}.\n\n` +
                        `Vui lòng thanh toán để tiếp tục sử dụng dịch vụ.\n\n` +
                        `Trân trọng,\n${customerData.storeName}`;
                await emailNotificationService.sendEmail({
                    to: customerData.email,
                    subject: `Thông báo nhắc nợ - ${customerData.storeName}`,
                    text: emailMessage,
                    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Thông báo nhắc nợ</h2>
              <p>Kính gửi <strong>${customerData.name}</strong>,</p>
              <p>Cửa hàng <strong>${customerData.storeName}</strong> xin thông báo bạn đang có khoản nợ:</p>
              <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="font-size: 24px; color: #e74c3c; margin: 0; font-weight: bold;">
                  ${formatCurrency(debt)}
                </p>
              </div>
              <p>Vui lòng thanh toán để tiếp tục sử dụng dịch vụ.</p>
              <p style="margin-top: 30px;">Trân trọng,<br><strong>${customerData.storeName}</strong></p>
            </div>
          `,
                });
                result.success = true;
                result.method = 'email';
                result.message = 'Đã gửi email nhắc nợ thành công';
                result.contact = customerData.email;
                // Log the reminder
                await (0, db_1.query)(`INSERT INTO AuditLogs (id, user_id, action, table_name, record_id, details, created_at)
           VALUES (NEWID(), @userId, 'DEBT_REMINDER_EMAIL', 'Customers', @customerId, @details, GETDATE())`, {
                    userId: req.userId,
                    customerId,
                    details: JSON.stringify({
                        email: customerData.email,
                        debt,
                        storeName: customerData.storeName,
                    }),
                });
                res.json(result);
                return;
            }
            catch (emailError) {
                console.error('Email sending failed:', emailError);
                // Continue to try SMS
            }
        }
        // Try SMS if email failed or not available
        if (customerData.phone) {
            // TODO: Implement SMS service integration
            // For now, just return that SMS would be sent
            result.success = true;
            result.method = 'sms';
            result.message = 'Chức năng gửi SMS đang được phát triển. Vui lòng liên hệ khách hàng qua số điện thoại.';
            result.contact = customerData.phone;
            // Log the reminder attempt
            await (0, db_1.query)(`INSERT INTO AuditLogs (id, user_id, action, table_name, record_id, details, created_at)
         VALUES (NEWID(), @userId, 'DEBT_REMINDER_SMS_PENDING', 'Customers', @customerId, @details, GETDATE())`, {
                userId: req.userId,
                customerId,
                details: JSON.stringify({
                    phone: customerData.phone,
                    debt,
                    storeName: customerData.storeName,
                }),
            });
            res.json(result);
            return;
        }
        // No contact method available
        result.success = false;
        result.method = 'none';
        result.message = 'Khách hàng không có email và số điện thoại';
        res.status(400).json(result);
    }
    catch (error) {
        console.error('Debt reminder error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: `Failed to send debt reminder: ${errorMessage}` });
    }
});
/**
 * POST /api/debt-reminder/send-bulk
 * Send debt reminders to multiple customers
 */
router.post('/send-bulk', checkDebtReminderPermission, async (req, res) => {
    try {
        const storeId = req.storeId;
        const { customerIds, message } = req.body;
        if (!customerIds || customerIds.length === 0) {
            res.status(400).json({ error: 'Customer IDs are required' });
            return;
        }
        const results = [];
        for (const customerId of customerIds) {
            try {
                // Reuse the single send logic
                const customer = await (0, db_1.query)(`SELECT 
            c.id,
            c.name,
            c.email,
            c.phone,
            c.total_debt as currentDebt,
            s.name as storeName
          FROM Customers c
          LEFT JOIN Stores s ON c.store_id = s.id
          WHERE c.id = @customerId AND c.store_id = @storeId`, { customerId, storeId });
                if (!customer || customer.length === 0) {
                    results.push({
                        success: false,
                        method: 'none',
                        message: 'Không tìm thấy khách hàng',
                        customerName: 'Unknown',
                    });
                    continue;
                }
                const customerData = customer[0];
                const debt = customerData.currentDebt || 0;
                if (debt <= 0) {
                    results.push({
                        success: false,
                        method: 'none',
                        message: 'Khách hàng không có nợ',
                        customerName: customerData.name,
                    });
                    continue;
                }
                // Try email first
                if (customerData.email) {
                    try {
                        const emailMessage = message ||
                            `Kính gửi ${customerData.name},\n\n` +
                                `Cửa hàng ${customerData.storeName} xin thông báo bạn đang có khoản nợ: ${formatCurrency(debt)}.\n\n` +
                                `Vui lòng thanh toán để tiếp tục sử dụng dịch vụ.\n\n` +
                                `Trân trọng,\n${customerData.storeName}`;
                        await emailNotificationService.sendEmail({
                            to: customerData.email,
                            subject: `Thông báo nhắc nợ - ${customerData.storeName}`,
                            text: emailMessage,
                            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #333;">Thông báo nhắc nợ</h2>
                  <p>Kính gửi <strong>${customerData.name}</strong>,</p>
                  <p>Cửa hàng <strong>${customerData.storeName}</strong> xin thông báo bạn đang có khoản nợ:</p>
                  <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="font-size: 24px; color: #e74c3c; margin: 0; font-weight: bold;">
                      ${formatCurrency(debt)}
                    </p>
                  </div>
                  <p>Vui lòng thanh toán để tiếp tục sử dụng dịch vụ.</p>
                  <p style="margin-top: 30px;">Trân trọng,<br><strong>${customerData.storeName}</strong></p>
                </div>
              `,
                        });
                        results.push({
                            success: true,
                            method: 'email',
                            message: 'Đã gửi email',
                            customerName: customerData.name,
                            contact: customerData.email,
                        });
                        continue;
                    }
                    catch (emailError) {
                        console.error('Email failed for customer:', customerData.name, emailError);
                    }
                }
                // Try SMS
                if (customerData.phone) {
                    results.push({
                        success: true,
                        method: 'sms',
                        message: 'Cần gửi SMS (chức năng đang phát triển)',
                        customerName: customerData.name,
                        contact: customerData.phone,
                    });
                    continue;
                }
                // No contact
                results.push({
                    success: false,
                    method: 'none',
                    message: 'Không có email và số điện thoại',
                    customerName: customerData.name,
                });
            }
            catch (error) {
                console.error('Error processing customer:', customerId, error);
                results.push({
                    success: false,
                    method: 'none',
                    message: 'Lỗi xử lý',
                    customerName: 'Unknown',
                });
            }
        }
        res.json({
            total: customerIds.length,
            results,
            summary: {
                email: results.filter(r => r.method === 'email' && r.success).length,
                sms: results.filter(r => r.method === 'sms' && r.success).length,
                failed: results.filter(r => !r.success).length,
            },
        });
    }
    catch (error) {
        console.error('Bulk debt reminder error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: `Failed to send bulk debt reminders: ${errorMessage}` });
    }
});
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(amount);
}
exports.default = router;
//# sourceMappingURL=debt-reminder.js.map