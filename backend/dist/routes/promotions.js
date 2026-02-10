"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const promotion_service_1 = require("../services/promotion-service");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use(auth_1.storeContext);
// GET /api/promotions - Get all promotions
router.get('/', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { status, type } = req.query;
        let sql = 'SELECT * FROM Promotions WHERE store_id = @storeId';
        const params = { storeId };
        if (status) {
            sql += ' AND status = @status';
            params.status = status;
        }
        if (type) {
            sql += ' AND type = @type';
            params.type = type;
        }
        sql += ' ORDER BY priority DESC, created_at DESC';
        const promotions = await (0, db_1.query)(sql, params);
        res.json({
            success: true,
            data: promotions.map((p) => ({
                id: p.id,
                storeId: p.store_id,
                name: p.name,
                description: p.description,
                type: p.type,
                status: p.status,
                startDate: p.start_date,
                endDate: p.end_date,
                discountType: p.discount_type,
                discountValue: p.discount_value,
                maxDiscountAmount: p.max_discount_amount,
                buyQuantity: p.buy_quantity,
                getQuantity: p.get_quantity,
                minPurchaseAmount: p.min_purchase_amount,
                minQuantity: p.min_quantity,
                usageLimit: p.usage_limit,
                usageCount: p.usage_count,
                usagePerCustomer: p.usage_per_customer,
                priority: p.priority,
                applyTo: p.apply_to,
                createdAt: p.created_at,
                updatedAt: p.updated_at,
            })),
        });
    }
    catch (error) {
        console.error('Get promotions error:', error);
        res.status(500).json({ error: 'Failed to get promotions' });
    }
});
// GET /api/promotions/active - Get active promotions
router.get('/active', async (req, res) => {
    try {
        const storeId = req.storeId;
        const promotions = await promotion_service_1.promotionService.getActivePromotions(storeId);
        res.json({
            success: true,
            data: promotions,
        });
    }
    catch (error) {
        console.error('Get active promotions error:', error);
        res.status(500).json({ error: 'Failed to get active promotions' });
    }
});
// POST /api/promotions - Create promotion
router.post('/', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { name, description, type, status, startDate, endDate, discountType, discountValue, maxDiscountAmount, buyQuantity, getQuantity, minPurchaseAmount, minQuantity, usageLimit, usagePerCustomer, priority, applyTo, productIds, categoryIds, customerIds, } = req.body;
        const id = crypto.randomUUID();
        await (0, db_1.query)(`INSERT INTO Promotions (
        id, store_id, name, description, type, status, start_date, end_date,
        discount_type, discount_value, max_discount_amount,
        buy_quantity, get_quantity, min_purchase_amount, min_quantity,
        usage_limit, usage_per_customer, priority, apply_to
      ) VALUES (
        @id, @storeId, @name, @description, @type, @status, @startDate, @endDate,
        @discountType, @discountValue, @maxDiscountAmount,
        @buyQuantity, @getQuantity, @minPurchaseAmount, @minQuantity,
        @usageLimit, @usagePerCustomer, @priority, @applyTo
      )`, {
            id,
            storeId,
            name,
            description,
            type,
            status: status || 'active',
            startDate,
            endDate,
            discountType,
            discountValue,
            maxDiscountAmount,
            buyQuantity,
            getQuantity,
            minPurchaseAmount,
            minQuantity,
            usageLimit,
            usagePerCustomer,
            priority: priority || 0,
            applyTo: applyTo || 'all',
        });
        // Add applicable products
        if (productIds && productIds.length > 0) {
            for (const productId of productIds) {
                await (0, db_1.query)('INSERT INTO PromotionProducts (id, promotion_id, product_id) VALUES (NEWID(), @promotionId, @productId)', { promotionId: id, productId });
            }
        }
        // Add applicable categories
        if (categoryIds && categoryIds.length > 0) {
            for (const categoryId of categoryIds) {
                await (0, db_1.query)('INSERT INTO PromotionCategories (id, promotion_id, category_id) VALUES (NEWID(), @promotionId, @categoryId)', { promotionId: id, categoryId });
            }
        }
        // Add applicable customers
        if (customerIds && customerIds.length > 0) {
            for (const customerId of customerIds) {
                await (0, db_1.query)('INSERT INTO PromotionCustomers (id, promotion_id, customer_id) VALUES (NEWID(), @promotionId, @customerId)', { promotionId: id, customerId });
            }
        }
        res.status(201).json({ success: true, id });
    }
    catch (error) {
        console.error('Create promotion error:', error);
        res.status(500).json({ error: 'Failed to create promotion' });
    }
});
// PUT /api/promotions/:id - Update promotion
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const { status, ...updates } = req.body;
        const fields = Object.keys(updates)
            .map((key) => {
            const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
            return `${snakeKey} = @${key}`;
        })
            .join(', ');
        if (fields) {
            await (0, db_1.query)(`UPDATE Promotions SET ${fields}, updated_at = GETDATE() WHERE id = @id AND store_id = @storeId`, { id, storeId, ...updates });
        }
        if (status) {
            await (0, db_1.query)('UPDATE Promotions SET status = @status, updated_at = GETDATE() WHERE id = @id AND store_id = @storeId', { id, storeId, status });
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Update promotion error:', error);
        res.status(500).json({ error: 'Failed to update promotion' });
    }
});
// DELETE /api/promotions/:id - Delete promotion
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        await (0, db_1.query)('DELETE FROM Promotions WHERE id = @id AND store_id = @storeId', { id, storeId });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Delete promotion error:', error);
        res.status(500).json({ error: 'Failed to delete promotion' });
    }
});
// POST /api/promotions/calculate - Calculate discount for cart
router.post('/calculate', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { items, customerId, subtotal } = req.body;
        console.log('[Promotions Calculate] Request:', { storeId, itemsCount: items?.length, customerId, subtotal });
        if (!items || !Array.isArray(items)) {
            res.status(400).json({ error: 'Items array is required' });
            return;
        }
        const result = await promotion_service_1.promotionService.calculateDiscount(storeId, items, customerId, subtotal);
        console.log('[Promotions Calculate] Result:', result);
        res.json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        console.error('Calculate discount error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to calculate discount';
        res.status(500).json({ error: errorMessage, details: error });
    }
});
exports.default = router;
//# sourceMappingURL=promotions.js.map