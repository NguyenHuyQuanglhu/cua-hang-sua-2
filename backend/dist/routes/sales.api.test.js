"use strict";
/**
 * Sales API Routes Integration Tests
 * Feature: pos-sales-ui-improvements
 *
 * Tests for the Sales API routes to verify:
 * - GET /api/sales supports status filtering and returns counts
 * - POST /api/sales sets default status="pending"
 * - PATCH /api/sales/:id allows status updates with validation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const sales_1 = __importDefault(require("./sales"));
// Mock dependencies
vitest_1.vi.mock('../db', () => ({
    query: vitest_1.vi.fn(),
    queryOne: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../middleware/auth', () => ({
    authenticate: (req, res, next) => {
        req.user = { id: 'user-1', role: 'owner', tenantId: 'tenant-1' };
        next();
    },
    storeContext: (req, res, next) => {
        req.storeId = 'store-1';
        next();
    },
}));
vitest_1.vi.mock('../services', () => ({
    salesService: {
        createSale: vitest_1.vi.fn(),
    },
    InventoryInsufficientStockError: class InventoryInsufficientStockError extends Error {
        productId;
        requestedQuantity;
        availableQuantity;
        unitId;
        constructor(message, productId, requestedQuantity, availableQuantity, unitId) {
            super(message);
            this.productId = productId;
            this.requestedQuantity = requestedQuantity;
            this.availableQuantity = availableQuantity;
            this.unitId = unitId;
        }
    },
}));
vitest_1.vi.mock('../repositories/sales-sp-repository', () => ({
    salesSPRepository: {
        getByStore: vitest_1.vi.fn(),
        getById: vitest_1.vi.fn(),
        updateStatus: vitest_1.vi.fn(),
    },
}));
vitest_1.vi.mock('../services/pdf-invoice-service', () => ({
    getSaleForInvoice: vitest_1.vi.fn(),
    generateInvoicePDF: vitest_1.vi.fn(),
}));
(0, vitest_1.describe)('Sales API Routes - POS Sales UI Improvements', () => {
    let app;
    (0, vitest_1.beforeEach)(() => {
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/api/sales', sales_1.default);
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('GET /api/sales - Status Filtering and Counts', () => {
        (0, vitest_1.it)('should return status counts in response', async () => {
            const { salesSPRepository } = await import('../repositories/sales-sp-repository');
            // Mock sales data with different statuses
            salesSPRepository.getByStore.mockResolvedValue([
                { id: '1', status: 'pending', invoiceNumber: 'PN001', createdBy: 'user-1' },
                { id: '2', status: 'pending', invoiceNumber: 'PN002', createdBy: 'user-1' },
                { id: '3', status: 'processed', invoiceNumber: 'PN003', createdBy: 'user-1' },
            ]);
            const { query } = await import('../db');
            query.mockResolvedValue([]);
            const response = await (0, supertest_1.default)(app)
                .get('/api/sales')
                .expect(200);
            (0, vitest_1.expect)(response.body.success).toBe(true);
            (0, vitest_1.expect)(response.body.counts).toEqual({
                pending: 2,
                processed: 1,
            });
        });
        (0, vitest_1.it)('should filter by status=pending', async () => {
            const { salesSPRepository } = await import('../repositories/sales-sp-repository');
            salesSPRepository.getByStore.mockResolvedValue([
                { id: '1', status: 'pending', invoiceNumber: 'PN001', createdBy: 'user-1' },
            ]);
            const { query } = await import('../db');
            query.mockResolvedValue([]);
            const response = await (0, supertest_1.default)(app)
                .get('/api/sales?status=pending')
                .expect(200);
            (0, vitest_1.expect)(response.body.success).toBe(true);
            (0, vitest_1.expect)(salesSPRepository.getByStore).toHaveBeenCalledWith('store-1', vitest_1.expect.objectContaining({ status: 'pending' }));
        });
        (0, vitest_1.it)('should normalize old status values in query', async () => {
            const { salesSPRepository } = await import('../repositories/sales-sp-repository');
            salesSPRepository.getByStore.mockResolvedValue([]);
            const { query } = await import('../db');
            query.mockResolvedValue([]);
            // Send old status value "draft" - should be normalized to "pending"
            const response = await (0, supertest_1.default)(app)
                .get('/api/sales?status=draft')
                .expect(200);
            (0, vitest_1.expect)(response.body.success).toBe(true);
            (0, vitest_1.expect)(salesSPRepository.getByStore).toHaveBeenCalledWith('store-1', vitest_1.expect.objectContaining({ status: 'pending' }));
        });
    });
    (0, vitest_1.describe)('POST /api/sales - Default Status', () => {
        (0, vitest_1.it)('should set default status="pending" when not provided', async () => {
            const { salesService } = await import('../services');
            salesService.createSale.mockResolvedValue({
                sale: {
                    id: 'sale-1',
                    invoiceNumber: 'PN001',
                    status: 'pending',
                    finalAmount: 100,
                },
                conversions: [],
            });
            const response = await (0, supertest_1.default)(app)
                .post('/api/sales')
                .send({
                items: [{ productId: 'prod-1', quantity: 1, price: 100 }],
                totalAmount: 100,
                finalAmount: 100,
            })
                .expect(201);
            (0, vitest_1.expect)(response.body.status).toBe('pending');
            (0, vitest_1.expect)(salesService.createSale).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ status: 'pending' }), 'store-1', 'user-1');
        });
        (0, vitest_1.it)('should accept explicit status="processed"', async () => {
            const { salesService } = await import('../services');
            salesService.createSale.mockResolvedValue({
                sale: {
                    id: 'sale-1',
                    invoiceNumber: 'PN001',
                    status: 'processed',
                    finalAmount: 100,
                },
                conversions: [],
            });
            const response = await (0, supertest_1.default)(app)
                .post('/api/sales')
                .send({
                items: [{ productId: 'prod-1', quantity: 1, price: 100 }],
                totalAmount: 100,
                finalAmount: 100,
                status: 'processed',
            })
                .expect(201);
            (0, vitest_1.expect)(response.body.status).toBe('processed');
        });
        (0, vitest_1.it)('should normalize old status values', async () => {
            const { salesService } = await import('../services');
            salesService.createSale.mockResolvedValue({
                sale: {
                    id: 'sale-1',
                    invoiceNumber: 'PN001',
                    status: 'pending',
                    finalAmount: 100,
                },
                conversions: [],
            });
            // Send old status "draft" - should be normalized to "pending"
            const response = await (0, supertest_1.default)(app)
                .post('/api/sales')
                .send({
                items: [{ productId: 'prod-1', quantity: 1, price: 100 }],
                totalAmount: 100,
                finalAmount: 100,
                status: 'draft',
            })
                .expect(201);
            (0, vitest_1.expect)(salesService.createSale).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ status: 'pending' }), 'store-1', 'user-1');
        });
    });
    (0, vitest_1.describe)('PATCH /api/sales/:id - Status Updates', () => {
        (0, vitest_1.it)('should update status with validation', async () => {
            const { salesSPRepository } = await import('../repositories/sales-sp-repository');
            salesSPRepository.updateStatus.mockResolvedValue(true);
            const response = await (0, supertest_1.default)(app)
                .patch('/api/sales/sale-1')
                .send({ status: 'processed' })
                .expect(200);
            (0, vitest_1.expect)(response.body.success).toBe(true);
            (0, vitest_1.expect)(salesSPRepository.updateStatus).toHaveBeenCalledWith('sale-1', 'store-1', 'processed');
        });
        (0, vitest_1.it)('should normalize old status values', async () => {
            const { salesSPRepository } = await import('../repositories/sales-sp-repository');
            salesSPRepository.updateStatus.mockResolvedValue(true);
            // Send old status "completed" - should be normalized to "processed"
            const response = await (0, supertest_1.default)(app)
                .patch('/api/sales/sale-1')
                .send({ status: 'completed' })
                .expect(200);
            (0, vitest_1.expect)(salesSPRepository.updateStatus).toHaveBeenCalledWith('sale-1', 'store-1', 'processed');
        });
        (0, vitest_1.it)('should reject invalid status values', async () => {
            const response = await (0, supertest_1.default)(app)
                .patch('/api/sales/sale-1')
                .send({ status: 'invalid-status' })
                .expect(400);
            (0, vitest_1.expect)(response.body.error.code).toBe('INVALID_STATUS');
        });
    });
});
//# sourceMappingURL=sales.api.test.js.map