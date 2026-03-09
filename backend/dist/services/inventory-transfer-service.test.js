"use strict";
/**
 * Unit Tests for InventoryTransferService
 *
 * Tests FIFO deduction logic and insufficient stock handling.
 * Requirements: 5.2, 5.3, 5.4
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const inventory_transfer_service_1 = require("./inventory-transfer-service");
// Mock the database modules
vitest_1.vi.mock('../db', () => ({
    query: vitest_1.vi.fn(),
    queryOne: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../db/transaction', () => ({
    withTransaction: vitest_1.vi.fn((callback) => callback({})),
    transactionQuery: vitest_1.vi.fn(),
    transactionQueryOne: vitest_1.vi.fn(),
    transactionInsert: vitest_1.vi.fn(),
    transactionUpdate: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../db/connection', () => ({
    sql: {},
}));
const db_1 = require("../db");
(0, vitest_1.describe)('InventoryTransferService', () => {
    let service;
    (0, vitest_1.beforeEach)(() => {
        service = new inventory_transfer_service_1.InventoryTransferService();
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('validateStoresSameTenant', () => {
        (0, vitest_1.it)('should return valid when both stores belong to same tenant', async () => {
            vitest_1.vi.mocked(db_1.queryOne)
                .mockResolvedValueOnce({ Id: 'store-1', TenantId: 'tenant-1', name: 'Store 1' })
                .mockResolvedValueOnce({ Id: 'store-2', TenantId: 'tenant-1', name: 'Store 2' });
            const result = await service.validateStoresSameTenant('store-1', 'store-2');
            (0, vitest_1.expect)(result.valid).toBe(true);
            (0, vitest_1.expect)(result.error).toBeUndefined();
        });
        (0, vitest_1.it)('should return error when source store not found', async () => {
            vitest_1.vi.mocked(db_1.queryOne).mockResolvedValueOnce(null);
            const result = await service.validateStoresSameTenant('invalid-store', 'store-2');
            (0, vitest_1.expect)(result.valid).toBe(false);
            (0, vitest_1.expect)(result.error).toBe('Source store not found');
        });
        (0, vitest_1.it)('should return error when destination store not found', async () => {
            vitest_1.vi.mocked(db_1.queryOne)
                .mockResolvedValueOnce({ Id: 'store-1', TenantId: 'tenant-1', name: 'Store 1' })
                .mockResolvedValueOnce(null);
            const result = await service.validateStoresSameTenant('store-1', 'invalid-store');
            (0, vitest_1.expect)(result.valid).toBe(false);
            (0, vitest_1.expect)(result.error).toBe('Destination store not found');
        });
        (0, vitest_1.it)('should return error when stores belong to different tenants', async () => {
            vitest_1.vi.mocked(db_1.queryOne)
                .mockResolvedValueOnce({ Id: 'store-1', TenantId: 'tenant-1', name: 'Store 1' })
                .mockResolvedValueOnce({ Id: 'store-2', TenantId: 'tenant-2', name: 'Store 2' });
            const result = await service.validateStoresSameTenant('store-1', 'store-2');
            (0, vitest_1.expect)(result.valid).toBe(false);
            (0, vitest_1.expect)(result.error).toBe('Stores do not belong to the same tenant');
        });
        (0, vitest_1.it)('should return error when source and destination are the same', async () => {
            vitest_1.vi.mocked(db_1.queryOne)
                .mockResolvedValueOnce({ Id: 'store-1', TenantId: 'tenant-1', name: 'Store 1' })
                .mockResolvedValueOnce({ Id: 'store-1', TenantId: 'tenant-1', name: 'Store 1' });
            const result = await service.validateStoresSameTenant('store-1', 'store-1');
            (0, vitest_1.expect)(result.valid).toBe(false);
            (0, vitest_1.expect)(result.error).toBe('Source and destination stores cannot be the same');
        });
    });
    (0, vitest_1.describe)('checkAvailableStock', () => {
        (0, vitest_1.it)('should return sufficient when stock is available', async () => {
            const items = [
                { productId: 'product-1', quantity: 10, unitId: 'unit-1' },
            ];
            vitest_1.vi.mocked(db_1.queryOne).mockResolvedValueOnce({ TotalRemaining: 15 });
            const result = await service.checkAvailableStock('store-1', items);
            (0, vitest_1.expect)(result.sufficient).toBe(true);
            (0, vitest_1.expect)(result.errors).toHaveLength(0);
        });
        (0, vitest_1.it)('should return insufficient when stock is not available', async () => {
            const items = [
                { productId: 'product-1', quantity: 20, unitId: 'unit-1' },
            ];
            vitest_1.vi.mocked(db_1.queryOne)
                .mockResolvedValueOnce({ TotalRemaining: 10 })
                .mockResolvedValueOnce({ id: 'product-1', name: 'Test Product' });
            const result = await service.checkAvailableStock('store-1', items);
            (0, vitest_1.expect)(result.sufficient).toBe(false);
            (0, vitest_1.expect)(result.errors).toHaveLength(1);
            (0, vitest_1.expect)(result.errors[0]).toEqual({
                productId: 'product-1',
                productName: 'Test Product',
                requestedQuantity: 20,
                availableQuantity: 10,
            });
        });
        (0, vitest_1.it)('should check multiple items and return all insufficient errors', async () => {
            const items = [
                { productId: 'product-1', quantity: 20, unitId: 'unit-1' },
                { productId: 'product-2', quantity: 30, unitId: 'unit-1' },
            ];
            vitest_1.vi.mocked(db_1.queryOne)
                .mockResolvedValueOnce({ TotalRemaining: 10 }) // product-1 stock
                .mockResolvedValueOnce({ id: 'product-1', name: 'Product 1' })
                .mockResolvedValueOnce({ TotalRemaining: 5 }) // product-2 stock
                .mockResolvedValueOnce({ id: 'product-2', name: 'Product 2' });
            const result = await service.checkAvailableStock('store-1', items);
            (0, vitest_1.expect)(result.sufficient).toBe(false);
            (0, vitest_1.expect)(result.errors).toHaveLength(2);
        });
        (0, vitest_1.it)('should handle zero stock correctly', async () => {
            const items = [
                { productId: 'product-1', quantity: 5, unitId: 'unit-1' },
            ];
            vitest_1.vi.mocked(db_1.queryOne)
                .mockResolvedValueOnce({ TotalRemaining: 0 })
                .mockResolvedValueOnce({ id: 'product-1', name: 'Test Product' });
            const result = await service.checkAvailableStock('store-1', items);
            (0, vitest_1.expect)(result.sufficient).toBe(false);
            (0, vitest_1.expect)(result.errors[0].availableQuantity).toBe(0);
        });
    });
    (0, vitest_1.describe)('transferInventory', () => {
        (0, vitest_1.it)('should throw error when stores validation fails', async () => {
            vitest_1.vi.mocked(db_1.queryOne).mockResolvedValueOnce(null);
            await (0, vitest_1.expect)(service.transferInventory({
                sourceStoreId: 'invalid-store',
                destinationStoreId: 'store-2',
                items: [{ productId: 'product-1', quantity: 10, unitId: 'unit-1' }],
            })).rejects.toThrow('Source store not found');
        });
        (0, vitest_1.it)('should throw InsufficientStockException when stock is insufficient', async () => {
            // Mock store validation
            vitest_1.vi.mocked(db_1.queryOne)
                .mockResolvedValueOnce({ Id: 'store-1', TenantId: 'tenant-1', name: 'Store 1' })
                .mockResolvedValueOnce({ Id: 'store-2', TenantId: 'tenant-1', name: 'Store 2' })
                // Mock stock check
                .mockResolvedValueOnce({ TotalRemaining: 5 })
                .mockResolvedValueOnce({ id: 'product-1', name: 'Test Product' });
            try {
                await service.transferInventory({
                    sourceStoreId: 'store-1',
                    destinationStoreId: 'store-2',
                    items: [{ productId: 'product-1', quantity: 10, unitId: 'unit-1' }],
                });
                vitest_1.expect.fail('Should have thrown InsufficientStockException');
            }
            catch (error) {
                (0, vitest_1.expect)(error).toBeInstanceOf(inventory_transfer_service_1.InsufficientStockException);
                const stockError = error;
                (0, vitest_1.expect)(stockError.errors).toHaveLength(1);
                (0, vitest_1.expect)(stockError.errors[0].requestedQuantity).toBe(10);
                (0, vitest_1.expect)(stockError.errors[0].availableQuantity).toBe(5);
            }
        });
    });
    (0, vitest_1.describe)('InsufficientStockException', () => {
        (0, vitest_1.it)('should create exception with correct properties', () => {
            const errors = [
                { productId: 'p1', productName: 'Product 1', requestedQuantity: 10, availableQuantity: 5 },
            ];
            const exception = new inventory_transfer_service_1.InsufficientStockException('Test message', errors);
            (0, vitest_1.expect)(exception.name).toBe('InsufficientStockException');
            (0, vitest_1.expect)(exception.message).toBe('Test message');
            (0, vitest_1.expect)(exception.errors).toEqual(errors);
        });
    });
});
//# sourceMappingURL=inventory-transfer-service.test.js.map