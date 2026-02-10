"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const repositories_1 = require("../repositories");
const products_sp_repository_1 = require("../repositories/products-sp-repository");
const services_1 = require("../services");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use(auth_1.storeContext);
// GET /api/products
router.get('/', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { page = '1', pageSize = '50', search, categoryId, status } = req.query;
        const pageNum = parseInt(page);
        const pageSizeNum = parseInt(pageSize);
        // Use SP Repository instead of inline query
        let products = await products_sp_repository_1.productsSPRepository.getByStore(storeId);
        // Apply filters
        if (search) {
            const searchLower = search.toLowerCase();
            products = products.filter((p) => p.name?.toLowerCase().includes(searchLower) ||
                p.sku?.toLowerCase().includes(searchLower));
        }
        if (categoryId && categoryId !== 'all') {
            products = products.filter((p) => p.categoryId === categoryId);
        }
        if (status && status !== 'all') {
            products = products.filter((p) => p.status === status);
        }
        // Calculate pagination
        const total = products.length;
        const totalPages = Math.ceil(total / pageSizeNum);
        const offset = (pageNum - 1) * pageSizeNum;
        const paginatedProducts = products.slice(offset, offset + pageSizeNum);
        res.json({
            success: true,
            data: paginatedProducts.map((p) => {
                // Parse avgCostByUnit JSON if exists
                let avgCostByUnit = [];
                if (p.avgCostByUnit) {
                    try {
                        const parsed = JSON.parse(p.avgCostByUnit);
                        avgCostByUnit = Array.isArray(parsed) ? parsed : [];
                    }
                    catch (e) {
                        console.error('Failed to parse avgCostByUnit:', e);
                        avgCostByUnit = [];
                    }
                }
                return {
                    id: p.id,
                    storeId: p.storeId,
                    categoryId: p.categoryId,
                    categoryName: p.categoryName,
                    name: p.name,
                    description: p.description,
                    price: p.price,
                    costPrice: p.costPrice,
                    sku: p.sku,
                    barcode: p.sku, // Use sku as barcode for now
                    stockQuantity: p.currentStock ?? p.stockQuantity ?? 0, // Use ProductInventory first, fallback to Products
                    currentStock: p.currentStock ?? p.stockQuantity ?? 0, // Add currentStock for POS compatibility
                    unitId: p.unitId,
                    images: p.images,
                    status: p.status,
                    purchaseLots: [], // Empty array for now
                    avgCostByUnit, // Add average cost by unit
                    createdAt: p.createdAt,
                    updatedAt: p.updatedAt,
                };
            }),
            total,
            page: pageNum,
            pageSize: pageSizeNum,
            totalPages,
        });
    }
    catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Failed to get products' });
    }
});
// GET /api/products/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        // Use SP Repository instead of inline query
        const product = await products_sp_repository_1.productsSPRepository.getById(id, storeId);
        if (!product) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        // Get purchase lots for this product
        const lotsQuery = `
      SELECT 
        pl.id,
        pl.import_date,
        pl.quantity,
        pl.remaining_quantity,
        pl.cost,
        pl.unit_id,
        u.name as unit_name,
        pl.purchase_order_id,
        po.order_number
      FROM PurchaseLots pl
      LEFT JOIN Units u ON pl.unit_id = u.id
      LEFT JOIN PurchaseOrders po ON pl.purchase_order_id = po.id
      WHERE pl.product_id = @productId AND pl.store_id = @storeId AND pl.remaining_quantity > 0
      ORDER BY pl.import_date DESC
    `;
        const lotsResult = await (0, db_1.query)(lotsQuery, { productId: id, storeId });
        // Map to camelCase for frontend
        const lots = lotsResult.map((lot) => ({
            id: lot.id,
            importDate: lot.import_date,
            quantity: lot.quantity,
            remainingQuantity: lot.remaining_quantity,
            cost: lot.cost,
            unitId: lot.unit_id,
            unitName: lot.unit_name,
            purchaseOrderId: lot.purchase_order_id,
            orderNumber: lot.order_number,
        }));
        res.json({
            id: product.id,
            storeId: product.storeId,
            categoryId: product.categoryId,
            categoryName: product.categoryName,
            name: product.name,
            description: product.description,
            price: product.price,
            costPrice: product.costPrice,
            sku: product.sku,
            stockQuantity: product.currentStock ?? product.stockQuantity,
            unitId: product.unitId,
            images: product.images,
            status: product.status,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
            purchaseLots: lots || [],
        });
    }
    catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ error: 'Failed to get product' });
    }
});
// POST /api/products
router.post('/', async (req, res) => {
    try {
        const storeId = req.storeId;
        const { name, description, categoryId, price, costPrice, sku, stockQuantity, unitId, images, status } = req.body;
        if (!name) {
            res.status(400).json({ error: 'Tên sản phẩm là bắt buộc' });
            return;
        }
        // Validate unit_id is required
        if (!unitId) {
            res.status(400).json({ error: 'Đơn vị tính là bắt buộc' });
            return;
        }
        // Use SP Repository instead of inline query
        const product = await products_sp_repository_1.productsSPRepository.create({
            storeId,
            categoryId: categoryId || null,
            name,
            description: description || null,
            price: price || 0,
            costPrice: costPrice || 0,
            sku: sku || null,
            unitId: unitId, // Now required, no fallback to null
            stockQuantity: stockQuantity || 0,
            images: images ? JSON.stringify(images) : null,
            status: status || 'active',
        });
        res.status(201).json({
            id: product.id,
            storeId: product.storeId,
            categoryId: product.categoryId,
            name: product.name,
            description: product.description,
            price: product.price,
            costPrice: product.costPrice,
            sku: product.sku,
            stockQuantity: product.stockQuantity,
            unitId: product.unitId,
            images: product.images,
            status: product.status,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
        });
    }
    catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});
// PUT /api/products/:id
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const { name, description, categoryId, price, costPrice, sku, unitId, images, status } = req.body;
        // Use SP Repository instead of inline query
        const product = await products_sp_repository_1.productsSPRepository.update(id, storeId, {
            name,
            description: description !== undefined ? description : undefined,
            categoryId: categoryId !== undefined ? categoryId : undefined,
            price,
            costPrice,
            sku: sku !== undefined ? sku : undefined,
            unitId: unitId !== undefined ? unitId : undefined,
            images: images ? JSON.stringify(images) : undefined,
            status,
        });
        if (!product) {
            res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
            return;
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});
// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        // Use SP Repository instead of inline query (soft delete)
        const deleted = await products_sp_repository_1.productsSPRepository.delete(id, storeId);
        if (!deleted) {
            res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
            return;
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});
// =============================================
// Unit Conversion Routes
// =============================================
// GET /api/products/:id/units - Get unit conversion configuration
router.get('/:id/units', async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const productUnit = await repositories_1.productUnitsRepository.findByProductWithNames(id, storeId);
        if (!productUnit) {
            res.json({ productUnit: null });
            return;
        }
        res.json({
            productUnit: {
                id: productUnit.id,
                productId: productUnit.productId,
                storeId: productUnit.storeId,
                baseUnitId: productUnit.baseUnitId,
                baseUnitName: productUnit.baseUnitName,
                conversionUnitId: productUnit.conversionUnitId,
                conversionUnitName: productUnit.conversionUnitName,
                conversionRate: productUnit.conversionRate,
                baseUnitPrice: productUnit.baseUnitPrice,
                conversionUnitPrice: productUnit.conversionUnitPrice,
                isActive: productUnit.isActive,
                createdAt: productUnit.createdAt,
                updatedAt: productUnit.updatedAt,
            },
        });
    }
    catch (error) {
        console.error('Get product units error:', error);
        res.status(500).json({ error: 'Failed to get product units configuration' });
    }
});
// POST /api/products/:id/units - Create or update unit conversion configuration
router.post('/:id/units', async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const { baseUnitId, conversionUnitId, conversionRate, baseUnitPrice, conversionUnitPrice, } = req.body;
        // Validation
        if (!baseUnitId || !conversionUnitId || !conversionRate) {
            res.status(400).json({
                error: 'baseUnitId, conversionUnitId và conversionRate là bắt buộc',
            });
            return;
        }
        if (conversionRate < 2) {
            res.status(400).json({
                error: 'Tỷ lệ quy đổi phải lớn hơn hoặc bằng 2',
            });
            return;
        }
        if (baseUnitId === conversionUnitId) {
            res.status(400).json({
                error: 'Đơn vị cơ bản và đơn vị quy đổi phải khác nhau',
            });
            return;
        }
        // Check if product exists using SP Repository
        const product = await products_sp_repository_1.productsSPRepository.getById(id, storeId);
        if (!product) {
            res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
            return;
        }
        // Check if configuration already exists
        const existing = await repositories_1.productUnitsRepository.findByProduct(id, storeId);
        let productUnit;
        if (existing) {
            // Update existing configuration
            productUnit = await repositories_1.productUnitsRepository.update(existing.id, {
                baseUnitId,
                conversionUnitId,
                conversionRate,
                baseUnitPrice: baseUnitPrice || 0,
                conversionUnitPrice: conversionUnitPrice || 0,
                isActive: true,
            }, storeId);
        }
        else {
            // Create new configuration
            productUnit = await repositories_1.productUnitsRepository.create({
                productId: id,
                storeId,
                baseUnitId,
                conversionUnitId,
                conversionRate,
                baseUnitPrice: baseUnitPrice || 0,
                conversionUnitPrice: conversionUnitPrice || 0,
                isActive: true,
            }, storeId);
        }
        res.json({
            success: true,
            productUnit,
        });
    }
    catch (error) {
        console.error('Create/update product units error:', error);
        res.status(500).json({ error: 'Failed to save product units configuration' });
    }
});
// DELETE /api/products/:id/units - Delete unit conversion configuration
router.delete('/:id/units', async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const existing = await repositories_1.productUnitsRepository.findByProduct(id, storeId);
        if (!existing) {
            res.status(404).json({ error: 'Không tìm thấy cấu hình đơn vị' });
            return;
        }
        await repositories_1.productUnitsRepository.delete(existing.id, storeId);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Delete product units error:', error);
        res.status(500).json({ error: 'Failed to delete product units configuration' });
    }
});
// GET /api/products/:id/inventory - Get detailed inventory information
router.get('/:id/inventory', async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.storeId;
        const inventoryDisplay = await services_1.inventoryService.getInventoryDisplay(id, storeId);
        res.json({
            conversionUnitStock: inventoryDisplay.conversionUnitStock,
            baseUnitStock: inventoryDisplay.baseUnitStock,
            displayText: inventoryDisplay.displayText,
            totalInBaseUnit: inventoryDisplay.totalInBaseUnit,
            conversionUnitName: inventoryDisplay.conversionUnitName,
            baseUnitName: inventoryDisplay.baseUnitName,
        });
    }
    catch (error) {
        console.error('Get product inventory error:', error);
        res.status(500).json({ error: 'Failed to get product inventory' });
    }
});
// GET /api/products/:id/available-quantity - Check available quantity for a unit
router.get('/:id/available-quantity', async (req, res) => {
    try {
        const { id } = req.params;
        const { unitId } = req.query;
        const storeId = req.storeId;
        if (!unitId) {
            res.status(400).json({ error: 'unitId là bắt buộc' });
            return;
        }
        const quantity = await services_1.inventoryService.checkAvailableQuantity(id, storeId, unitId);
        // Get unit name
        const unit = await (0, db_1.queryOne)('SELECT Id, Name FROM Units WHERE Id = @unitId', { unitId });
        res.json({
            quantity,
            unit: unit
                ? {
                    id: unit.Id,
                    name: unit.Name,
                }
                : null,
        });
    }
    catch (error) {
        console.error('Get available quantity error:', error);
        res.status(500).json({ error: 'Failed to get available quantity' });
    }
});
// GET /api/products/:id/conversion-logs - Get conversion history
router.get('/:id/conversion-logs', async (req, res) => {
    try {
        const { id } = req.params;
        const { page = '1', pageSize = '50' } = req.query;
        const storeId = req.storeId;
        const pageNum = parseInt(page);
        const pageSizeNum = parseInt(pageSize);
        const result = await repositories_1.unitConversionLogRepository.findByProductWithDetails(id, storeId, { page: pageNum, pageSize: pageSizeNum });
        res.json({
            logs: result.data.map((log) => ({
                id: log.id,
                productId: log.productId,
                productName: log.productName,
                storeId: log.storeId,
                salesTransactionId: log.salesTransactionId,
                salesInvoiceNumber: log.salesInvoiceNumber,
                conversionDate: log.conversionDate,
                conversionType: log.conversionType,
                conversionUnitChange: log.conversionUnitChange,
                baseUnitChange: log.baseUnitChange,
                beforeConversionUnitStock: log.beforeConversionUnitStock,
                beforeBaseUnitStock: log.beforeBaseUnitStock,
                afterConversionUnitStock: log.afterConversionUnitStock,
                afterBaseUnitStock: log.afterBaseUnitStock,
                baseUnitName: log.baseUnitName,
                conversionUnitName: log.conversionUnitName,
                notes: log.notes,
            })),
            total: result.total,
            page: result.page,
            pageSize: result.pageSize,
            totalPages: result.totalPages,
        });
    }
    catch (error) {
        console.error('Get conversion logs error:', error);
        res.status(500).json({ error: 'Failed to get conversion logs' });
    }
});
// =============================================
// Inventory Management Routes (using SP Repository)
// Requirements: 4.1-4.4
// =============================================
// POST /api/products/:id/inventory/add - Add inventory using sp_Inventory_Add
// Requirements: 4.2
router.post('/:id/inventory/add', async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity, unitId } = req.body;
        const storeId = req.storeId;
        if (!quantity || quantity <= 0) {
            res.status(400).json({ error: 'Số lượng phải lớn hơn 0' });
            return;
        }
        if (!unitId) {
            res.status(400).json({ error: 'unitId là bắt buộc' });
            return;
        }
        // Check if product exists
        const product = await products_sp_repository_1.productsSPRepository.getById(id, storeId);
        if (!product) {
            res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
            return;
        }
        // Use SP Repository for inventory add (UPSERT logic)
        const newQuantity = await repositories_1.inventorySPRepository.add(id, storeId, unitId, quantity);
        res.json({
            success: true,
            productId: id,
            unitId,
            addedQuantity: quantity,
            newTotalQuantity: newQuantity,
        });
    }
    catch (error) {
        console.error('Add inventory error:', error);
        res.status(500).json({ error: 'Failed to add inventory' });
    }
});
// POST /api/products/:id/inventory/deduct - Deduct inventory using sp_Inventory_Deduct
// Requirements: 4.3
router.post('/:id/inventory/deduct', async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity, unitId } = req.body;
        const storeId = req.storeId;
        if (!quantity || quantity <= 0) {
            res.status(400).json({ error: 'Số lượng phải lớn hơn 0' });
            return;
        }
        if (!unitId) {
            res.status(400).json({ error: 'unitId là bắt buộc' });
            return;
        }
        // Check if product exists
        const product = await products_sp_repository_1.productsSPRepository.getById(id, storeId);
        if (!product) {
            res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
            return;
        }
        // Check available stock first using SP Repository
        const available = await repositories_1.inventorySPRepository.getAvailable(id, storeId, unitId);
        if (available < quantity) {
            res.status(400).json({
                error: `Không đủ hàng. Chỉ còn ${available} đơn vị`,
                code: 'INSUFFICIENT_STOCK',
                availableQuantity: available,
                requestedQuantity: quantity,
            });
            return;
        }
        // Use SP Repository for inventory deduct with stock validation
        const newQuantity = await repositories_1.inventorySPRepository.deduct(id, storeId, unitId, quantity);
        res.json({
            success: true,
            productId: id,
            unitId,
            deductedQuantity: quantity,
            newTotalQuantity: newQuantity,
        });
    }
    catch (error) {
        console.error('Deduct inventory error:', error);
        // Handle insufficient stock error from stored procedure
        if (error instanceof Error && error.message.includes('Insufficient stock')) {
            res.status(400).json({
                error: 'Không đủ hàng trong kho',
                code: 'INSUFFICIENT_STOCK',
            });
            return;
        }
        res.status(500).json({ error: 'Failed to deduct inventory' });
    }
});
// GET /api/products/:id/inventory/check - Check if sufficient stock using sp_Inventory_GetAvailable
// Requirements: 4.1
router.get('/:id/inventory/check', async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity, unitId } = req.query;
        const storeId = req.storeId;
        if (!unitId) {
            res.status(400).json({ error: 'unitId là bắt buộc' });
            return;
        }
        const requiredQuantity = quantity ? parseFloat(quantity) : 0;
        // Use SP Repository to check available quantity
        const available = await repositories_1.inventorySPRepository.getAvailable(id, storeId, unitId);
        const hasSufficientStock = await repositories_1.inventorySPRepository.hasSufficientStock(id, storeId, unitId, requiredQuantity);
        res.json({
            productId: id,
            unitId,
            availableQuantity: available,
            requiredQuantity,
            hasSufficientStock,
        });
    }
    catch (error) {
        console.error('Check inventory error:', error);
        res.status(500).json({ error: 'Failed to check inventory' });
    }
});
exports.default = router;
//# sourceMappingURL=products.js.map