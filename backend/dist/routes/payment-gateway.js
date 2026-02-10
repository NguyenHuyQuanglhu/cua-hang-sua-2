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
const paymentGatewayService = __importStar(require("../services/payment-gateway-service"));
const router = (0, express_1.Router)();
// GET /api/payment-gateway/available - Get available payment gateways
router.get('/available', (req, res) => {
    const gateways = paymentGatewayService.getAvailableGateways();
    res.json({ success: true, gateways });
});
// POST /api/payment-gateway/vnpay/create - Create VNPay payment
router.post('/vnpay/create', auth_1.authenticate, auth_1.storeContext, async (req, res) => {
    try {
        const { orderId, amount, orderInfo, bankCode, locale } = req.body;
        if (!orderId || !amount) {
            return res.status(400).json({ error: 'Order ID and amount are required' });
        }
        const ipAddress = req.headers['x-forwarded-for']?.toString().split(',')[0] ||
            req.socket.remoteAddress ||
            '127.0.0.1';
        const result = await paymentGatewayService.createVNPayPayment({
            orderId,
            amount,
            orderInfo: orderInfo || `Thanh toan don hang ${orderId}`,
            bankCode,
            locale: locale || 'vn',
            ipAddress,
        });
        if (result.success) {
            res.json({ success: true, paymentUrl: result.paymentUrl });
        }
        else {
            res.status(400).json({ success: false, error: result.error });
        }
    }
    catch (error) {
        console.error('Create VNPay payment error:', error);
        res.status(500).json({ error: 'Failed to create payment' });
    }
});
// GET /api/payment-gateway/vnpay/return - VNPay return URL handler
router.get('/vnpay/return', async (req, res) => {
    try {
        const vnpParams = {};
        for (const [key, value] of Object.entries(req.query)) {
            vnpParams[key] = String(value);
        }
        const result = await paymentGatewayService.verifyVNPayReturn(vnpParams);
        // Redirect to frontend with result
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const redirectUrl = new URL(`${frontendUrl}/payment/result`);
        redirectUrl.searchParams.set('success', String(result.success));
        redirectUrl.searchParams.set('orderId', result.orderId);
        redirectUrl.searchParams.set('amount', String(result.amount));
        redirectUrl.searchParams.set('transactionId', result.transactionId);
        redirectUrl.searchParams.set('message', result.message);
        res.redirect(redirectUrl.toString());
    }
    catch (error) {
        console.error('VNPay return error:', error);
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/result?success=false&message=Error`);
    }
});
// POST /api/payment-gateway/momo/create - Create MoMo payment
router.post('/momo/create', auth_1.authenticate, auth_1.storeContext, async (req, res) => {
    try {
        const { orderId, amount, orderInfo } = req.body;
        if (!orderId || !amount) {
            return res.status(400).json({ error: 'Order ID and amount are required' });
        }
        const result = await paymentGatewayService.createMoMoPayment({
            orderId,
            amount,
            orderInfo: orderInfo || `Thanh toan don hang ${orderId}`,
        });
        if (result.success) {
            res.json({ success: true, paymentUrl: result.paymentUrl });
        }
        else {
            res.status(400).json({ success: false, error: result.error });
        }
    }
    catch (error) {
        console.error('Create MoMo payment error:', error);
        res.status(500).json({ error: 'Failed to create payment' });
    }
});
// POST /api/payment-gateway/momo/notify - MoMo IPN (Instant Payment Notification)
router.post('/momo/notify', async (req, res) => {
    try {
        const momoParams = {};
        for (const [key, value] of Object.entries(req.body)) {
            momoParams[key] = String(value);
        }
        const result = await paymentGatewayService.verifyMoMoCallback(momoParams);
        // MoMo expects a specific response format
        res.json({
            partnerCode: momoParams.partnerCode,
            requestId: momoParams.requestId,
            orderId: momoParams.orderId,
            resultCode: result.success ? 0 : 1,
            message: result.message,
            responseTime: Date.now(),
        });
    }
    catch (error) {
        console.error('MoMo notify error:', error);
        res.status(500).json({ resultCode: 1, message: 'Error' });
    }
});
// GET /api/payment-gateway/momo/return - MoMo return URL handler
router.get('/momo/return', async (req, res) => {
    try {
        const momoParams = {};
        for (const [key, value] of Object.entries(req.query)) {
            momoParams[key] = String(value);
        }
        const result = await paymentGatewayService.verifyMoMoCallback(momoParams);
        // Redirect to frontend with result
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const redirectUrl = new URL(`${frontendUrl}/payment/result`);
        redirectUrl.searchParams.set('success', String(result.success));
        redirectUrl.searchParams.set('orderId', result.orderId);
        redirectUrl.searchParams.set('amount', String(result.amount));
        redirectUrl.searchParams.set('transactionId', result.transactionId);
        redirectUrl.searchParams.set('message', result.message);
        res.redirect(redirectUrl.toString());
    }
    catch (error) {
        console.error('MoMo return error:', error);
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/result?success=false&message=Error`);
    }
});
// POST /api/payment-gateway/zalopay/create - Create ZaloPay payment
router.post('/zalopay/create', auth_1.authenticate, auth_1.storeContext, async (req, res) => {
    try {
        const { orderId, amount, orderInfo, bankCode } = req.body;
        if (!orderId || !amount) {
            return res.status(400).json({ error: 'Order ID and amount are required' });
        }
        const result = await paymentGatewayService.createZaloPayPayment({
            orderId,
            amount,
            orderInfo: orderInfo || `Thanh toan don hang ${orderId}`,
            bankCode,
        });
        if (result.success) {
            res.json({ success: true, paymentUrl: result.paymentUrl });
        }
        else {
            res.status(400).json({ success: false, error: result.error });
        }
    }
    catch (error) {
        console.error('Create ZaloPay payment error:', error);
        res.status(500).json({ error: 'Failed to create payment' });
    }
});
// POST /api/payment-gateway/zalopay/callback - ZaloPay callback handler
router.post('/zalopay/callback', async (req, res) => {
    try {
        const result = await paymentGatewayService.verifyZaloPayCallback(req.body);
        // ZaloPay expects specific response format
        res.json({
            return_code: result.success ? 1 : 2,
            return_message: result.message,
        });
    }
    catch (error) {
        console.error('ZaloPay callback error:', error);
        res.status(500).json({ return_code: 0, return_message: 'Error' });
    }
});
// GET /api/payment-gateway/zalopay/return - ZaloPay return URL handler
router.get('/zalopay/return', async (req, res) => {
    try {
        // ZaloPay returns status in query params
        const { status, apptransid, amount } = req.query;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const redirectUrl = new URL(`${frontendUrl}/payment/result`);
        redirectUrl.searchParams.set('success', status === '1' ? 'true' : 'false');
        redirectUrl.searchParams.set('orderId', String(apptransid || ''));
        redirectUrl.searchParams.set('amount', String(amount || '0'));
        redirectUrl.searchParams.set('message', status === '1' ? 'Payment successful' : 'Payment failed');
        res.redirect(redirectUrl.toString());
    }
    catch (error) {
        console.error('ZaloPay return error:', error);
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/result?success=false&message=Error`);
    }
});
// GET /api/payment-gateway/installment/options - Get installment options
router.get('/installment/options', auth_1.authenticate, auth_1.storeContext, async (req, res) => {
    try {
        const { amount } = req.query;
        if (!amount) {
            return res.status(400).json({ error: 'Amount is required' });
        }
        const options = paymentGatewayService.getInstallmentOptions(Number(amount));
        res.json({ success: true, options });
    }
    catch (error) {
        console.error('Get installment options error:', error);
        res.status(500).json({ error: 'Failed to get installment options' });
    }
});
// POST /api/payment-gateway/installment/create - Create installment payment
router.post('/installment/create', auth_1.authenticate, auth_1.storeContext, async (req, res) => {
    try {
        const { orderId, amount, orderInfo, provider, term, bankCode } = req.body;
        if (!orderId || !amount || !provider || !term) {
            return res.status(400).json({ error: 'Order ID, amount, provider, and term are required' });
        }
        // Create payment with installment info
        // For VNPay, we can pass installment info in the payment request
        const result = await paymentGatewayService.createVNPayPayment({
            orderId,
            amount,
            orderInfo: orderInfo || `Thanh toan tra gop ${term} thang - Don hang ${orderId}`,
            bankCode: bankCode || provider,
            installment: {
                term,
                provider,
            },
        });
        if (result.success) {
            res.json({ success: true, paymentUrl: result.paymentUrl });
        }
        else {
            res.status(400).json({ success: false, error: result.error });
        }
    }
    catch (error) {
        console.error('Create installment payment error:', error);
        res.status(500).json({ error: 'Failed to create installment payment' });
    }
});
exports.default = router;
//# sourceMappingURL=payment-gateway.js.map