"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const unit_conversion_service_1 = require("../services/unit-conversion-service");
const router = (0, express_1.Router)();
// GET /api/products/:productId/units - Get available units for product
router.get('/products/:productId/units', async (req, res) => {
    try {
        const { productId } = req.params;
        const result = await unit_conversion_service_1.unitConversionService.getProductUnits(productId);
        res.json({ success: true, ...result });
    }
    catch (error) {
        console.error('Get product units error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// POST /api/units/convert - Convert quantity between units
router.post('/units/convert', async (req, res) => {
    try {
        const { productId, fromUnitId, toUnitId, quantity } = req.body;
        if (!productId || !fromUnitId || !toUnitId || quantity === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }
        const result = await unit_conversion_service_1.unitConversionService.convertQuantity(productId, fromUnitId, toUnitId, Number(quantity));
        res.json({ success: true, ...result });
    }
    catch (error) {
        console.error('Convert quantity error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// POST /api/products/:productId/calculate-price - Calculate price in different units
router.post('/products/:productId/calculate-price', async (req, res) => {
    try {
        const { productId } = req.params;
        const { unitId, quantity, priceType = 'cost' } = req.body;
        if (!unitId || quantity === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }
        const result = await unit_conversion_service_1.unitConversionService.calculatePrice(productId, unitId, Number(quantity), priceType);
        res.json({ success: true, ...result });
    }
    catch (error) {
        console.error('Calculate price error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=unit-conversion.js.map