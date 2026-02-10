"use strict";
/**
 * Notification Service
 *
 * Handles email and SMS notifications for the system.
 * Supports templates for common notifications.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmailNotification = sendEmailNotification;
exports.checkAndSendLowStockAlerts = checkAndSendLowStockAlerts;
const nodemailer_1 = __importDefault(require("nodemailer"));
const db_1 = require("../db");
// Get email configuration from environment or database
function getEmailConfig() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || 'noreply@example.com';
    if (!host || !user || !pass) {
        return null;
    }
    return {
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        from,
    };
}
// Create email transporter
function createTransporter() {
    const config = getEmailConfig();
    if (!config) {
        console.warn('Email configuration not found. Email notifications disabled.');
        return null;
    }
    return nodemailer_1.default.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.auth,
    });
}
// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(amount);
}
// Email templates
const templates = {
    order_confirmation: (data) => ({
        subject: `Xac nhan don hang #${data.orderNumber} - ${data.storeName}`,
        html: `
      <h2>Xac nhan don hang</h2>
      <p>Kinh gui ${data.customerName},</p>
      <p>Cam on ban da mua hang tai ${data.storeName}. Don hang cua ban da duoc xac nhan.</p>
      <h3>Chi tiet don hang #${data.orderNumber}</h3>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
        <tr><th>San pham</th><th>So luong</th><th>Gia</th></tr>
        ${data.items.map(item => `<tr><td>${item.name}</td><td>${item.quantity}</td><td>${formatCurrency(item.price)}</td></tr>`).join('')}
      </table>
      <p><strong>Tong cong: ${formatCurrency(data.total)}</strong></p>
      ${data.storePhone ? `<p>Lien he: ${data.storePhone}</p>` : ''}
      <p>Tran trong,<br/>${data.storeName}</p>
    `,
    }),
    order_shipped: (data) => ({
        subject: `Don hang #${data.orderNumber} da duoc gui - ${data.storeName}`,
        html: `
      <h2>Don hang da duoc gui</h2>
      <p>Kinh gui ${data.customerName},</p>
      <p>Don hang #${data.orderNumber} cua ban da duoc gui di.</p>
      <p>Tran trong,<br/>${data.storeName}</p>
    `,
    }),
    order_delivered: (data) => ({
        subject: `Don hang #${data.orderNumber} da giao thanh cong - ${data.storeName}`,
        html: `
      <h2>Don hang da giao thanh cong</h2>
      <p>Kinh gui ${data.customerName},</p>
      <p>Don hang #${data.orderNumber} cua ban da duoc giao thanh cong.</p>
      <p>Cam on ban da mua hang!</p>
      <p>Tran trong,<br/>${data.storeName}</p>
    `,
    }),
    low_stock_alert: (data) => ({
        subject: `Canh bao ton kho thap - ${data.storeName}`,
        html: `
      <h2>Canh bao ton kho thap</h2>
      <p>Cac san pham sau day can nhap them hang:</p>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
        <tr><th>San pham</th><th>Ton kho</th><th>Toi thieu</th></tr>
        ${data.products.map(p => `<tr><td>${p.name}</td><td style="color: red;">${p.currentStock}</td><td>${p.minStock}</td></tr>`).join('')}
      </table>
      <p>Vui long kiem tra va nhap them hang.</p>
    `,
    }),
    payment_received: (data) => ({
        subject: `Thanh toan thanh cong - ${data.invoiceNumber}`,
        html: `
      <h2>Xac nhan thanh toan</h2>
      <p>Kinh gui ${data.customerName},</p>
      <p>Chung toi da nhan duoc thanh toan cua ban:</p>
      <ul>
        <li>Ma hoa don: ${data.invoiceNumber}</li>
        <li>So tien: ${formatCurrency(data.amount)}</li>
        <li>Phuong thuc: ${data.paymentMethod}</li>
      </ul>
      <p>Cam on ban!</p>
      <p>Tran trong,<br/>${data.storeName}</p>
    `,
    }),
    refund_processed: (data) => ({
        subject: `Hoan tien thanh cong - ${data.refundNumber}`,
        html: `
      <h2>Xac nhan hoan tien</h2>
      <p>Kinh gui ${data.customerName},</p>
      <p>Yeu cau hoan tien cua ban da duoc xu ly:</p>
      <ul>
        <li>Ma hoan tien: ${data.refundNumber}</li>
        <li>So tien: ${formatCurrency(data.amount)}</li>
        <li>Ly do: ${data.reason}</li>
      </ul>
      <p>Tran trong,<br/>${data.storeName}</p>
    `,
    }),
    welcome_customer: (data) => ({
        subject: `Chao mung ban den voi ${data.storeName}`,
        html: `
      <h2>Chao mung ${data.customerName}!</h2>
      <p>Cam on ban da dang ky tai khoan tai ${data.storeName}.</p>
      ${data.loyaltyInfo ? `<p>${data.loyaltyInfo}</p>` : ''}
      <p>Chuc ban mua sam vui ve!</p>
      <p>Tran trong,<br/>${data.storeName}</p>
    `,
    }),
    password_reset: (data) => ({
        subject: 'Dat lai mat khau',
        html: `
      <h2>Dat lai mat khau</h2>
      <p>Kinh gui ${data.userName},</p>
      <p>Ban da yeu cau dat lai mat khau. Click vao link sau de tiep tuc:</p>
      <p><a href="${data.resetLink}">${data.resetLink}</a></p>
      <p>Link nay se het han sau ${data.expiresIn}.</p>
      <p>Neu ban khong yeu cau dat lai mat khau, vui long bo qua email nay.</p>
    `,
    }),
};
// Send email notification
async function sendEmailNotification(to, type, data) {
    const transporter = createTransporter();
    if (!transporter) {
        return { success: false, error: 'Email not configured' };
    }
    const config = getEmailConfig();
    const template = templates[type](data);
    try {
        await transporter.sendMail({
            from: config.from,
            to,
            subject: template.subject,
            html: template.html,
        });
        // Log notification
        await logNotification({
            type,
            channel: 'email',
            recipient: to,
            subject: template.subject,
            status: 'sent',
        });
        return { success: true };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Failed to send email:', errorMessage);
        await logNotification({
            type,
            channel: 'email',
            recipient: to,
            subject: template.subject,
            status: 'failed',
            error: errorMessage,
        });
        return { success: false, error: errorMessage };
    }
}
// Log notification to database
async function logNotification(data) {
    try {
        await (0, db_1.executeQuery)(`INSERT INTO NotificationLogs (Type, Channel, Recipient, Subject, Status, Error, CreatedAt)
       VALUES (@type, @channel, @recipient, @subject, @status, @error, GETDATE())`, {
            type: data.type,
            channel: data.channel,
            recipient: data.recipient,
            subject: data.subject,
            status: data.status,
            error: data.error || null,
        });
    }
    catch (error) {
        // Ignore logging errors - table may not exist
        console.error('Failed to log notification:', error);
    }
}
// Check for low stock products and send alerts
async function checkAndSendLowStockAlerts(storeId, tenantId, alertEmail) {
    try {
        const result = await (0, db_1.executeQuery)(`SELECT p.ProductName, ISNULL(pi.Quantity, 0) as CurrentStock, p.MinStockLevel
       FROM Products p
       LEFT JOIN ProductInventory pi ON p.ProductID = pi.ProductID AND pi.StoreID = @storeId
       WHERE p.TenantID = @tenantId AND p.IsActive = 1
         AND ISNULL(pi.Quantity, 0) <= p.MinStockLevel
         AND p.MinStockLevel > 0`, { storeId, tenantId });
        const products = result.recordset || [];
        if (products.length === 0) {
            return { sent: false, productCount: 0 };
        }
        // Get store name
        const storeResult = await (0, db_1.executeQuery)(`SELECT StoreName FROM Stores WHERE StoreID = @storeId`, { storeId });
        const storeName = storeResult.recordset?.[0]?.StoreName || 'Store';
        await sendEmailNotification(alertEmail, 'low_stock_alert', {
            storeName,
            products: products.map((p) => ({
                name: p.ProductName,
                currentStock: p.CurrentStock,
                minStock: p.MinStockLevel,
            })),
        });
        return { sent: true, productCount: products.length };
    }
    catch (error) {
        console.error('Failed to check low stock:', error);
        return { sent: false, productCount: 0 };
    }
}
//# sourceMappingURL=notification-service.js.map