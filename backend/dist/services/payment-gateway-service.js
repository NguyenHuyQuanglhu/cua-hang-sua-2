"use strict";
/**
 * Payment Gateway Service
 *
 * Integrates with VNPay and MoMo payment gateways for online payments.
 * Supports payment creation, verification, and refunds.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVNPayPayment = createVNPayPayment;
exports.verifyVNPayReturn = verifyVNPayReturn;
exports.createMoMoPayment = createMoMoPayment;
exports.verifyMoMoCallback = verifyMoMoCallback;
exports.getAvailableGateways = getAvailableGateways;
exports.createZaloPayPayment = createZaloPayPayment;
exports.verifyZaloPayCallback = verifyZaloPayCallback;
exports.calculateInstallment = calculateInstallment;
exports.getInstallmentOptions = getInstallmentOptions;
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../db");
// Get VNPay configuration from environment
function getVNPayConfig() {
    const tmnCode = process.env.VNPAY_TMN_CODE;
    const hashSecret = process.env.VNPAY_HASH_SECRET;
    if (!tmnCode || !hashSecret) {
        return null;
    }
    return {
        tmnCode,
        hashSecret,
        vnpUrl: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
        returnUrl: process.env.VNPAY_RETURN_URL || 'http://localhost:3000/payment/vnpay-return',
    };
}
// Get MoMo configuration from environment
function getMoMoConfig() {
    const partnerCode = process.env.MOMO_PARTNER_CODE;
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;
    if (!partnerCode || !accessKey || !secretKey) {
        return null;
    }
    return {
        partnerCode,
        accessKey,
        secretKey,
        endpoint: process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create',
        returnUrl: process.env.MOMO_RETURN_URL || 'http://localhost:3000/payment/momo-return',
        notifyUrl: process.env.MOMO_NOTIFY_URL || 'http://localhost:3001/api/payments/momo-notify',
    };
}
// Get ZaloPay configuration from environment
function getZaloPayConfig() {
    const appId = process.env.ZALOPAY_APP_ID;
    const key1 = process.env.ZALOPAY_KEY1;
    const key2 = process.env.ZALOPAY_KEY2;
    if (!appId || !key1 || !key2) {
        return null;
    }
    return {
        appId,
        key1,
        key2,
        endpoint: process.env.ZALOPAY_ENDPOINT || 'https://sb-openapi.zalopay.vn/v2/create',
        callbackUrl: process.env.ZALOPAY_CALLBACK_URL || 'http://localhost:3001/api/payments/zalopay-callback',
    };
}
// Get installment configuration
function getInstallmentConfig() {
    return {
        enabled: process.env.INSTALLMENT_ENABLED === 'true',
        minAmount: parseInt(process.env.INSTALLMENT_MIN_AMOUNT || '5000000'), // 5 million VND
        providers: [
            {
                code: 'VISA',
                name: 'Visa',
                terms: [3, 6, 9, 12],
                interestRate: 0, // 0% for promotional period
            },
            {
                code: 'MASTERCARD',
                name: 'Mastercard',
                terms: [3, 6, 9, 12],
                interestRate: 0,
            },
            {
                code: 'JCB',
                name: 'JCB',
                terms: [3, 6, 12],
                interestRate: 0,
            },
        ],
    };
}
// Sort object keys
function sortObject(obj) {
    const sorted = {};
    const keys = Object.keys(obj).sort();
    keys.forEach(key => {
        sorted[key] = obj[key];
    });
    return sorted;
}
// Create VNPay payment URL
async function createVNPayPayment(request) {
    const config = getVNPayConfig();
    if (!config) {
        return { success: false, error: 'VNPay not configured' };
    }
    try {
        const date = new Date();
        const createDate = date.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
        const vnpParams = {
            vnp_Version: '2.1.0',
            vnp_Command: 'pay',
            vnp_TmnCode: config.tmnCode,
            vnp_Locale: request.locale || 'vn',
            vnp_CurrCode: 'VND',
            vnp_TxnRef: request.orderId,
            vnp_OrderInfo: request.orderInfo,
            vnp_OrderType: 'other',
            vnp_Amount: String(request.amount * 100), // VNPay uses amount in cents
            vnp_ReturnUrl: config.returnUrl,
            vnp_IpAddr: request.ipAddress || '127.0.0.1',
            vnp_CreateDate: createDate,
        };
        if (request.bankCode) {
            vnpParams.vnp_BankCode = request.bankCode;
        }
        const sortedParams = sortObject(vnpParams);
        const signData = new URLSearchParams(sortedParams).toString();
        const hmac = crypto_1.default.createHmac('sha512', config.hashSecret);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
        sortedParams.vnp_SecureHash = signed;
        const paymentUrl = `${config.vnpUrl}?${new URLSearchParams(sortedParams).toString()}`;
        // Log payment attempt
        await logPaymentAttempt({
            orderId: request.orderId,
            gateway: 'vnpay',
            amount: request.amount,
            status: 'pending',
        });
        return { success: true, paymentUrl };
    }
    catch (error) {
        console.error('VNPay payment error:', error);
        return { success: false, error: 'Failed to create VNPay payment' };
    }
}
// Verify VNPay payment return
async function verifyVNPayReturn(vnpParams) {
    const config = getVNPayConfig();
    if (!config) {
        return {
            success: false,
            orderId: '',
            amount: 0,
            transactionId: '',
            responseCode: '99',
            message: 'VNPay not configured',
        };
    }
    try {
        const secureHash = vnpParams.vnp_SecureHash;
        delete vnpParams.vnp_SecureHash;
        delete vnpParams.vnp_SecureHashType;
        const sortedParams = sortObject(vnpParams);
        const signData = new URLSearchParams(sortedParams).toString();
        const hmac = crypto_1.default.createHmac('sha512', config.hashSecret);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
        if (secureHash !== signed) {
            return {
                success: false,
                orderId: vnpParams.vnp_TxnRef,
                amount: 0,
                transactionId: '',
                responseCode: '97',
                message: 'Invalid signature',
            };
        }
        const responseCode = vnpParams.vnp_ResponseCode;
        const success = responseCode === '00';
        const amount = parseInt(vnpParams.vnp_Amount) / 100;
        // Update payment log
        await updatePaymentLog({
            orderId: vnpParams.vnp_TxnRef,
            transactionId: vnpParams.vnp_TransactionNo,
            status: success ? 'completed' : 'failed',
            responseCode,
        });
        return {
            success,
            orderId: vnpParams.vnp_TxnRef,
            amount,
            transactionId: vnpParams.vnp_TransactionNo,
            responseCode,
            message: success ? 'Payment successful' : `Payment failed: ${responseCode}`,
        };
    }
    catch (error) {
        console.error('VNPay verify error:', error);
        return {
            success: false,
            orderId: '',
            amount: 0,
            transactionId: '',
            responseCode: '99',
            message: 'Verification error',
        };
    }
}
// Create MoMo payment
async function createMoMoPayment(request) {
    const config = getMoMoConfig();
    if (!config) {
        return { success: false, error: 'MoMo not configured' };
    }
    try {
        const requestId = `${Date.now()}`;
        const orderId = request.orderId;
        const orderInfo = request.orderInfo;
        const amount = String(request.amount);
        const extraData = '';
        const rawSignature = `accessKey=${config.accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${config.notifyUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${config.partnerCode}&redirectUrl=${config.returnUrl}&requestId=${requestId}&requestType=captureWallet`;
        const signature = crypto_1.default
            .createHmac('sha256', config.secretKey)
            .update(rawSignature)
            .digest('hex');
        const requestBody = {
            partnerCode: config.partnerCode,
            accessKey: config.accessKey,
            requestId,
            amount,
            orderId,
            orderInfo,
            redirectUrl: config.returnUrl,
            ipnUrl: config.notifyUrl,
            extraData,
            requestType: 'captureWallet',
            signature,
            lang: 'vi',
        };
        const response = await fetch(config.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });
        const data = await response.json();
        if (data.resultCode === 0) {
            await logPaymentAttempt({
                orderId: request.orderId,
                gateway: 'momo',
                amount: request.amount,
                status: 'pending',
            });
            return { success: true, paymentUrl: data.payUrl };
        }
        return { success: false, error: data.message || 'MoMo payment failed' };
    }
    catch (error) {
        console.error('MoMo payment error:', error);
        return { success: false, error: 'Failed to create MoMo payment' };
    }
}
// Verify MoMo payment callback
async function verifyMoMoCallback(momoParams) {
    const config = getMoMoConfig();
    if (!config) {
        return {
            success: false,
            orderId: '',
            amount: 0,
            transactionId: '',
            responseCode: '99',
            message: 'MoMo not configured',
        };
    }
    try {
        const { orderId, amount, resultCode, transId, signature } = momoParams;
        // Verify signature
        const rawSignature = `accessKey=${config.accessKey}&amount=${amount}&extraData=&message=${momoParams.message}&orderId=${orderId}&orderInfo=${momoParams.orderInfo}&orderType=${momoParams.orderType}&partnerCode=${config.partnerCode}&payType=${momoParams.payType}&requestId=${momoParams.requestId}&responseTime=${momoParams.responseTime}&resultCode=${resultCode}&transId=${transId}`;
        const expectedSignature = crypto_1.default
            .createHmac('sha256', config.secretKey)
            .update(rawSignature)
            .digest('hex');
        if (signature !== expectedSignature) {
            return {
                success: false,
                orderId,
                amount: parseInt(amount),
                transactionId: transId,
                responseCode: '97',
                message: 'Invalid signature',
            };
        }
        const success = resultCode === '0';
        await updatePaymentLog({
            orderId,
            transactionId: transId,
            status: success ? 'completed' : 'failed',
            responseCode: resultCode,
        });
        return {
            success,
            orderId,
            amount: parseInt(amount),
            transactionId: transId,
            responseCode: resultCode,
            message: success ? 'Payment successful' : `Payment failed: ${resultCode}`,
        };
    }
    catch (error) {
        console.error('MoMo verify error:', error);
        return {
            success: false,
            orderId: '',
            amount: 0,
            transactionId: '',
            responseCode: '99',
            message: 'Verification error',
        };
    }
}
// Log payment attempt
async function logPaymentAttempt(data) {
    try {
        await (0, db_1.executeQuery)(`INSERT INTO PaymentLogs (OrderID, Gateway, Amount, Status, CreatedAt)
       VALUES (@orderId, @gateway, @amount, @status, GETDATE())`, data);
    }
    catch (error) {
        console.error('Failed to log payment:', error);
    }
}
// Update payment log
async function updatePaymentLog(data) {
    try {
        await (0, db_1.executeQuery)(`UPDATE PaymentLogs
       SET TransactionID = @transactionId, Status = @status, ResponseCode = @responseCode, UpdatedAt = GETDATE()
       WHERE OrderID = @orderId`, data);
    }
    catch (error) {
        console.error('Failed to update payment log:', error);
    }
}
// Get available payment gateways
function getAvailableGateways() {
    const gateways = [];
    if (getVNPayConfig())
        gateways.push('vnpay');
    if (getMoMoConfig())
        gateways.push('momo');
    if (getZaloPayConfig())
        gateways.push('zalopay');
    return gateways;
}
// Create ZaloPay payment
async function createZaloPayPayment(request) {
    const config = getZaloPayConfig();
    if (!config) {
        return { success: false, error: 'ZaloPay not configured' };
    }
    try {
        const transId = `${Date.now()}`;
        const appTransId = `${new Date().format('yyMMdd')}_${transId}`;
        const embedData = JSON.stringify({
            redirecturl: process.env.ZALOPAY_RETURN_URL || 'http://localhost:3000/payment/zalopay-return',
        });
        const items = JSON.stringify([
            {
                itemid: request.orderId,
                itemname: request.orderInfo,
                itemprice: request.amount,
                itemquantity: 1,
            },
        ]);
        const orderData = {
            app_id: config.appId,
            app_trans_id: appTransId,
            app_user: 'user123',
            app_time: String(Date.now()),
            amount: String(request.amount),
            item: items,
            embed_data: embedData,
            description: request.orderInfo,
            bank_code: request.bankCode || '',
            callback_url: config.callbackUrl,
        };
        // Create MAC
        const data = `${orderData.app_id}|${orderData.app_trans_id}|${orderData.app_user}|${orderData.amount}|${orderData.app_time}|${orderData.embed_data}|${orderData.item}`;
        const mac = crypto_1.default.createHmac('sha256', config.key1).update(data).digest('hex');
        orderData.mac = mac;
        const response = await fetch(config.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(orderData).toString(),
        });
        const result = await response.json();
        if (result.return_code === 1) {
            await logPaymentAttempt({
                orderId: request.orderId,
                gateway: 'zalopay',
                amount: request.amount,
                status: 'pending',
            });
            return { success: true, paymentUrl: result.order_url };
        }
        return { success: false, error: result.return_message || 'ZaloPay payment failed' };
    }
    catch (error) {
        console.error('ZaloPay payment error:', error);
        return { success: false, error: 'Failed to create ZaloPay payment' };
    }
}
// Verify ZaloPay callback
async function verifyZaloPayCallback(callbackData) {
    const config = getZaloPayConfig();
    if (!config) {
        return {
            success: false,
            orderId: '',
            amount: 0,
            transactionId: '',
            responseCode: '99',
            message: 'ZaloPay not configured',
        };
    }
    try {
        const { data: dataStr, mac } = callbackData;
        const data = JSON.parse(dataStr);
        // Verify MAC
        const expectedMac = crypto_1.default
            .createHmac('sha256', config.key2)
            .update(dataStr)
            .digest('hex');
        if (mac !== expectedMac) {
            return {
                success: false,
                orderId: data.app_trans_id,
                amount: 0,
                transactionId: '',
                responseCode: '97',
                message: 'Invalid signature',
            };
        }
        const success = data.status === 1;
        await updatePaymentLog({
            orderId: data.app_trans_id,
            transactionId: data.zp_trans_id,
            status: success ? 'completed' : 'failed',
            responseCode: String(data.status),
        });
        return {
            success,
            orderId: data.app_trans_id,
            amount: data.amount,
            transactionId: data.zp_trans_id,
            responseCode: String(data.status),
            message: success ? 'Payment successful' : 'Payment failed',
        };
    }
    catch (error) {
        console.error('ZaloPay verify error:', error);
        return {
            success: false,
            orderId: '',
            amount: 0,
            transactionId: '',
            responseCode: '99',
            message: 'Verification error',
        };
    }
}
// Calculate installment details
function calculateInstallment(amount, term, interestRate = 0) {
    const monthlyInterestRate = interestRate / 100;
    let monthlyPayment;
    let totalAmount;
    if (monthlyInterestRate === 0) {
        // No interest
        monthlyPayment = amount / term;
        totalAmount = amount;
    }
    else {
        // With interest
        monthlyPayment =
            (amount * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, term)) /
                (Math.pow(1 + monthlyInterestRate, term) - 1);
        totalAmount = monthlyPayment * term;
    }
    return {
        monthlyPayment: Math.round(monthlyPayment),
        totalAmount: Math.round(totalAmount),
        totalInterest: Math.round(totalAmount - amount),
    };
}
// Get installment options
function getInstallmentOptions(amount) {
    const config = getInstallmentConfig();
    if (!config.enabled || amount < config.minAmount) {
        return [];
    }
    const options = [];
    config.providers.forEach((provider) => {
        provider.terms.forEach((term) => {
            const calculation = calculateInstallment(amount, term, provider.interestRate);
            options.push({
                provider: provider.code,
                providerName: provider.name,
                term,
                monthlyPayment: calculation.monthlyPayment,
                totalAmount: calculation.totalAmount,
                totalInterest: calculation.totalInterest,
                interestRate: provider.interestRate,
            });
        });
    });
    return options;
}
Date.prototype.format = function (format) {
    const year = this.getFullYear().toString().slice(-2);
    const month = String(this.getMonth() + 1).padStart(2, '0');
    const day = String(this.getDate()).padStart(2, '0');
    return format
        .replace('yy', year)
        .replace('MM', month)
        .replace('dd', day);
};
//# sourceMappingURL=payment-gateway-service.js.map