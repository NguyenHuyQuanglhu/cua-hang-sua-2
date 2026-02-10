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
const shippingService = __importStar(require("../services/shipping-service"));
const router = (0, express_1.Router)();
// GET /api/shipping/providers - Get available shipping providers
router.get('/providers', (req, res) => {
    const providers = shippingService.getAvailableProviders();
    res.json({ success: true, providers });
});
// POST /api/shipping/calculate-fee - Calculate shipping fee
router.post('/calculate-fee', auth_1.authenticate, auth_1.storeContext, async (req, res) => {
    try {
        const { provider, sender, receiver, items, totalWeight, codAmount } = req.body;
        if (!provider || !sender || !receiver || !totalWeight) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const request = {
            orderId: '',
            sender,
            receiver,
            items: items || [],
            totalWeight,
            codAmount,
        };
        let result;
        switch (provider.toLowerCase()) {
            case 'ghn':
                result = await shippingService.calculateGHNFee(request);
                break;
            case 'ghtk':
                result = await shippingService.calculateGHTKFee(request);
                break;
            default:
                return res.status(400).json({ error: 'Invalid shipping provider' });
        }
        if (result.success) {
            res.json({
                success: true,
                fee: result.fee,
                expectedDays: result.expectedDays,
            });
        }
        else {
            res.status(400).json({ success: false, error: result.error });
        }
    }
    catch (error) {
        console.error('Calculate shipping fee error:', error);
        res.status(500).json({ error: 'Failed to calculate shipping fee' });
    }
});
// POST /api/shipping/create-order - Create shipping order
router.post('/create-order', auth_1.authenticate, auth_1.storeContext, async (req, res) => {
    try {
        const { provider, orderId, sender, receiver, items, totalWeight, codAmount, note } = req.body;
        if (!provider || !orderId || !sender || !receiver || !totalWeight) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const request = {
            orderId,
            sender,
            receiver,
            items: items || [],
            totalWeight,
            codAmount,
            note,
        };
        let result;
        switch (provider.toLowerCase()) {
            case 'ghn':
                result = await shippingService.createGHNOrder(request);
                break;
            case 'ghtk':
                result = await shippingService.createGHTKOrder(request);
                break;
            default:
                return res.status(400).json({ error: 'Invalid shipping provider' });
        }
        if (result.success) {
            res.json({
                success: true,
                trackingCode: result.trackingCode,
                shippingOrderId: result.shippingOrderId,
                fee: result.fee,
                expectedDelivery: result.expectedDelivery,
            });
        }
        else {
            res.status(400).json({ success: false, error: result.error });
        }
    }
    catch (error) {
        console.error('Create shipping order error:', error);
        res.status(500).json({ error: 'Failed to create shipping order' });
    }
});
// GET /api/shipping/track/:provider/:trackingCode - Track shipping order
router.get('/track/:provider/:trackingCode', auth_1.authenticate, async (req, res) => {
    try {
        const { provider, trackingCode } = req.params;
        if (!provider || !trackingCode) {
            return res.status(400).json({ error: 'Provider and tracking code are required' });
        }
        let result;
        switch (provider.toLowerCase()) {
            case 'ghn':
                result = await shippingService.trackGHNOrder(trackingCode);
                break;
            case 'ghtk':
                result = await shippingService.trackGHTKOrder(trackingCode);
                break;
            default:
                return res.status(400).json({ error: 'Invalid shipping provider' });
        }
        if (result.success) {
            res.json({
                success: true,
                status: result.status,
                statusText: result.statusText,
                location: result.location,
                updatedAt: result.updatedAt,
                history: result.history,
            });
        }
        else {
            res.status(400).json({ success: false, error: result.error });
        }
    }
    catch (error) {
        console.error('Track shipping order error:', error);
        res.status(500).json({ error: 'Failed to track shipping order' });
    }
});
// POST /api/shipping/webhook/ghn - GHN webhook for status updates
router.post('/webhook/ghn', async (req, res) => {
    try {
        const { OrderCode, Status } = req.body;
        if (OrderCode && Status) {
            await shippingService.updateShippingStatus(OrderCode, Status);
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('GHN webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});
// POST /api/shipping/webhook/ghtk - GHTK webhook for status updates
router.post('/webhook/ghtk', async (req, res) => {
    try {
        const { label_id, status_id } = req.body;
        if (label_id && status_id) {
            await shippingService.updateShippingStatus(label_id, String(status_id));
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('GHTK webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});
exports.default = router;
//# sourceMappingURL=shipping.js.map