"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const auth_1 = require("../middleware/auth");
const units_sp_repository_1 = require("../repositories/units-sp-repository");
const product_units_repository_1 = require("../repositories/product-units-repository");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use(auth_1.storeContext);
// GET /api/units
// Requirements: 8.4 - Uses sp_Units_GetByStore
router.get('/', async (req, res) => {
    try {
        const storeId = req.storeId;
        // Use SP Repository instead of inline query
        const units = await units_sp_repository_1.unitsSPRepository.getByStore(storeId);
        console.log('[Units API] Store:', storeId, 'Units count:', units.length);
        console.log('[Units API] Units:', JSON.stringify(units, null, 2));
        res.json(units.map(u => ({
            id: u.id,
            name: u.name,
            description: u.description,
            baseUnitId: u.baseUnitId,
            conversionFactor: u.conversionFactor,
        })));
    }
    catch (error) {
        console.error('Get units error:', error);
        res.status(500).json({ error: 'Failed to get units' });
    }
});
// GET /api/units/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        // Use SP Repository instead of inline query
        const unit = await units_sp_repository_1.unitsSPRepository.getById(id, storeId);
        if (!unit) {
            res.status(404).json({ error: 'Không tìm thấy đơn vị' });
            return;
        }
        res.json({
            id: unit.id,
            name: unit.name,
            description: unit.description,
            baseUnitId: unit.baseUnitId,
            conversionFactor: unit.conversionFactor,
        });
    }
    catch (error) {
        console.error('Get unit error:', error);
        res.status(500).json({ error: 'Failed to get unit' });
    }
});
// POST /api/units
// Requirements: 8.1 - Uses sp_Units_Create
router.post('/', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { name, description, baseUnitId, conversionFactor } = req.body;
        if (!name) {
            res.status(400).json({ error: 'Name is required' });
            return;
        }
        // Use SP Repository instead of inline query
        const unit = await units_sp_repository_1.unitsSPRepository.create({
            id: (0, uuid_1.v4)(),
            storeId,
            name,
            description: description || null,
            baseUnitId: baseUnitId || null,
            conversionFactor: conversionFactor ?? 1,
        });
        res.status(201).json({
            id: unit.id,
            name: unit.name,
            description: unit.description,
            baseUnitId: unit.baseUnitId,
            conversionFactor: unit.conversionFactor,
        });
    }
    catch (error) {
        console.error('Create unit error:', error);
        res.status(500).json({ error: 'Failed to create unit' });
    }
});
// PUT /api/units/:id
// Requirements: 8.2 - Uses sp_Units_Update
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const { name, description, baseUnitId, conversionFactor } = req.body;
        // Use SP Repository instead of inline query
        const unit = await units_sp_repository_1.unitsSPRepository.update(id, storeId, {
            name: name !== undefined ? name : undefined,
            description: description !== undefined ? description : undefined,
            baseUnitId: baseUnitId !== undefined ? baseUnitId : undefined,
            conversionFactor: conversionFactor !== undefined ? conversionFactor : undefined,
        });
        if (!unit) {
            res.status(404).json({ error: 'Unit not found' });
            return;
        }
        res.json({
            id: unit.id,
            name: unit.name,
            description: unit.description,
            baseUnitId: unit.baseUnitId,
            conversionFactor: unit.conversionFactor,
        });
    }
    catch (error) {
        console.error('Update unit error:', error);
        res.status(500).json({ error: 'Failed to update unit' });
    }
});
// DELETE /api/units/:id
// Requirements: 8.3 - Uses sp_Units_Delete
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        // Use SP Repository instead of inline query
        const deleted = await units_sp_repository_1.unitsSPRepository.delete(id, storeId);
        if (!deleted) {
            res.status(404).json({ error: 'Unit not found' });
            return;
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Delete unit error:', error);
        res.status(500).json({ error: 'Failed to delete unit' });
    }
});
// ==================== Product Unit Configurations ====================
// GET /api/units/product-configs - Get all product unit configurations
router.get('/product-configs', async (req, res) => {
    try {
        const storeId = req.storeId;
        const configs = await product_units_repository_1.productUnitsRepository.findAllProductsWithConversion(storeId);
        res.json({ success: true, data: configs });
    }
    catch (error) {
        console.error('Get product unit configs error:', error);
        res.status(500).json({ success: false, error: 'Failed to get product unit configurations' });
    }
});
// GET /api/units/product-configs/:productId - Get product unit configuration by product ID
router.get('/product-configs/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const storeId = req.storeId;
        const config = await product_units_repository_1.productUnitsRepository.findByProductWithNames(productId, storeId);
        res.json({ success: true, data: config });
    }
    catch (error) {
        console.error('Get product unit config error:', error);
        res.status(500).json({ success: false, error: 'Failed to get product unit configuration' });
    }
});
// POST /api/units/product-configs - Create or update product unit configuration
router.post('/product-configs', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { productId, baseUnitId, conversionUnitId, conversionRate, baseUnitPrice, conversionUnitPrice } = req.body;
        if (!productId || !baseUnitId || !conversionUnitId || !conversionRate) {
            res.status(400).json({ success: false, error: 'Missing required fields' });
            return;
        }
        // Check if configuration already exists
        const existing = await product_units_repository_1.productUnitsRepository.findByProduct(productId, storeId);
        if (existing) {
            // Update existing configuration
            const updated = await product_units_repository_1.productUnitsRepository.update(existing.id, {
                baseUnitId,
                conversionUnitId,
                conversionRate: Number(conversionRate),
                baseUnitPrice: Number(baseUnitPrice) || 0,
                conversionUnitPrice: Number(conversionUnitPrice) || 0,
            }, storeId);
            res.json({ success: true, data: updated });
        }
        else {
            // Create new configuration
            const created = await product_units_repository_1.productUnitsRepository.create({
                productId,
                storeId,
                baseUnitId,
                conversionUnitId,
                conversionRate: Number(conversionRate),
                baseUnitPrice: Number(baseUnitPrice) || 0,
                conversionUnitPrice: Number(conversionUnitPrice) || 0,
                isActive: true,
            }, storeId);
            res.status(201).json({ success: true, data: created });
        }
    }
    catch (error) {
        console.error('Upsert product unit config error:', error);
        res.status(500).json({ success: false, error: 'Failed to save product unit configuration' });
    }
});
// DELETE /api/units/product-configs/:productId - Delete product unit configuration
router.delete('/product-configs/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const storeId = req.storeId;
        const existing = await product_units_repository_1.productUnitsRepository.findByProduct(productId, storeId);
        if (!existing) {
            res.status(404).json({ success: false, error: 'Product unit configuration not found' });
            return;
        }
        await product_units_repository_1.productUnitsRepository.delete(existing.id, storeId);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Delete product unit config error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete product unit configuration' });
    }
});
exports.default = router;
//# sourceMappingURL=units.js.map