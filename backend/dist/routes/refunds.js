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
const refundService = __importStar(require("../services/refund-service"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use(auth_1.storeContext);
// GET /api/refunds - Get all refunds
router.get('/', async (req, res) => {
    try {
        const storeId = req.storeId;
        const tenantId = req.user?.tenantId;
        if (!storeId || !tenantId) {
            return res.status(400).json({ error: 'Store context required' });
        }
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const saleId = req.query.saleId ? parseInt(req.query.saleId) : undefined;
        const result = await refundService.getRefunds(storeId, tenantId, {
            page,
            pageSize,
            saleId,
        });
        res.json({
            success: true,
            data: result.refunds.map((r) => ({
                id: r.RefundID,
                refundNumber: r.RefundNumber,
                saleId: r.SaleID,
                invoiceNumber: r.InvoiceNumber,
                refundType: r.RefundType,
                refundMethod: r.RefundMethod,
                totalAmount: r.TotalAmount,
                reason: r.Reason,
                notes: r.Notes,
                status: r.Status,
                createdBy: r.CreatedByName,
                createdAt: r.CreatedAt,
            })),
            total: result.total,
            page,
            pageSize,
            totalPages: Math.ceil(result.total / pageSize),
        });
    }
    catch (error) {
        console.error('Get refunds error:', error);
        res.status(500).json({ error: 'Failed to get refunds' });
    }
});
// GET /api/refunds/:id - Get refund by ID
router.get('/:id', async (req, res) => {
    try {
        const storeId = req.storeId;
        const tenantId = req.user?.tenantId;
        const refundId = parseInt(req.params.id);
        if (!storeId || !tenantId) {
            return res.status(400).json({ error: 'Store context required' });
        }
        const result = await refundService.getRefundById(refundId, storeId, tenantId);
        if (!result) {
            return res.status(404).json({ error: 'Refund not found' });
        }
        res.json({
            success: true,
            refund: {
                id: result.refund.RefundID,
                refundNumber: result.refund.RefundNumber,
                saleId: result.refund.SaleID,
                invoiceNumber: result.refund.InvoiceNumber,
                refundType: result.refund.RefundType,
                refundMethod: result.refund.RefundMethod,
                totalAmount: result.refund.TotalAmount,
                reason: result.refund.Reason,
                notes: result.refund.Notes,
                status: result.refund.Status,
                createdBy: result.refund.CreatedByName,
                createdAt: result.refund.CreatedAt,
            },
            items: result.items.map((i) => ({
                id: i.RefundItemID,
                saleItemId: i.SaleItemID,
                productId: i.ProductID,
                productName: i.ProductName,
                unitId: i.UnitID,
                unitName: i.UnitName,
                quantity: i.Quantity,
                unitPrice: i.UnitPrice,
                refundAmount: i.RefundAmount,
                reason: i.Reason,
            })),
        });
    }
    catch (error) {
        console.error('Get refund error:', error);
        res.status(500).json({ error: 'Failed to get refund' });
    }
});
// POST /api/refunds - Create refund
router.post('/', async (req, res) => {
    try {
        const storeId = req.storeId;
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        if (!storeId || !tenantId || !userId) {
            return res.status(400).json({ error: 'Authentication required' });
        }
        const { saleId, items, refundType, refundMethod, reason, notes } = req.body;
        // Validate request
        if (!saleId) {
            return res.status(400).json({ error: 'Sale ID is required' });
        }
        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'At least one item is required' });
        }
        if (!['full', 'partial'].includes(refundType)) {
            return res.status(400).json({ error: 'Invalid refund type' });
        }
        if (!['cash', 'store_credit', 'original_payment'].includes(refundMethod)) {
            return res.status(400).json({ error: 'Invalid refund method' });
        }
        if (!reason) {
            return res.status(400).json({ error: 'Reason is required' });
        }
        const result = await refundService.createRefund({
            saleId,
            items,
            refundType,
            refundMethod,
            reason,
            notes,
        }, storeId, tenantId, userId);
        res.status(201).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        console.error('Create refund error:', error);
        const message = error instanceof Error ? error.message : 'Failed to create refund';
        res.status(400).json({ error: message });
    }
});
exports.default = router;
//# sourceMappingURL=refunds.js.map