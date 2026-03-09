"use strict";
/**
 * Unit Tests for InventorySPRepository
 *
 * Tests stored procedure repository operations for inventory.
 * Requirements: 4.1-4.4
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const inventory_sp_repository_1 = require("./inventory-sp-repository");
// Mock the database connection module
vitest_1.vi.mock('../db/connection', () => ({
    getConnection: vitest_1.vi.fn(),
}));
(0, vitest_1.describe)('InventorySPRepository', () => {
    let repository;
    let mockRequest;
    let mockConnection;
    (0, vitest_1.beforeEach)(async () => {
        vitest_1.vi.clearAllMocks();
        mockRequest = {
            input: vitest_1.vi.fn().mockReturnThis(),
            execute: vitest_1.vi.fn(),
        };
        mockConnection = {
            request: vitest_1.vi.fn().mockReturnValue(mockRequest),
        };
        const { getConnection } = await import('../db/connection.js');
        getConnection.mockResolvedValue(mockConnection);
        repository = new inventory_sp_repository_1.InventorySPRepository();
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.describe)('getAvailable', () => {
        (0, vitest_1.it)('should call sp_Inventory_GetAvailable with correct parameters', async () => {
            mockRequest.execute.mockResolvedValueOnce({
                recordset: [{ AvailableQuantity: 100 }]
            });
            const result = await repository.getAvailable('prod-123', 'store-123', 'unit-123');
            (0, vitest_1.expect)(mockRequest.execute).toHaveBeenCalledWith('sp_Inventory_GetAvailable');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('productId', 'prod-123');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('storeId', 'store-123');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('unitId', 'unit-123');
            (0, vitest_1.expect)(result).toBe(100);
        });
        (0, vitest_1.it)('should return 0 when no inventory found', async () => {
            mockRequest.execute.mockResolvedValueOnce({ recordset: [] });
            const result = await repository.getAvailable('prod-123', 'store-123', 'unit-123');
            (0, vitest_1.expect)(result).toBe(0);
        });
    });
    (0, vitest_1.describe)('add', () => {
        (0, vitest_1.it)('should call sp_Inventory_Add with correct parameters', async () => {
            mockRequest.execute.mockResolvedValueOnce({
                recordset: [{ Quantity: 150 }]
            });
            const result = await repository.add('prod-123', 'store-123', 'unit-123', 50);
            (0, vitest_1.expect)(mockRequest.execute).toHaveBeenCalledWith('sp_Inventory_Add');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('productId', 'prod-123');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('storeId', 'store-123');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('unitId', 'unit-123');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('quantity', 50);
            (0, vitest_1.expect)(result).toBe(150);
        });
        (0, vitest_1.it)('should return 0 when result is empty', async () => {
            mockRequest.execute.mockResolvedValueOnce({ recordset: [] });
            const result = await repository.add('prod-123', 'store-123', 'unit-123', 50);
            (0, vitest_1.expect)(result).toBe(0);
        });
    });
    (0, vitest_1.describe)('deduct', () => {
        (0, vitest_1.it)('should call sp_Inventory_Deduct with correct parameters', async () => {
            mockRequest.execute.mockResolvedValueOnce({
                recordset: [{ Quantity: 50 }]
            });
            const result = await repository.deduct('prod-123', 'store-123', 'unit-123', 50);
            (0, vitest_1.expect)(mockRequest.execute).toHaveBeenCalledWith('sp_Inventory_Deduct');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('productId', 'prod-123');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('storeId', 'store-123');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('unitId', 'unit-123');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('quantity', 50);
            (0, vitest_1.expect)(result).toBe(50);
        });
        (0, vitest_1.it)('should return 0 when result is empty', async () => {
            mockRequest.execute.mockResolvedValueOnce({ recordset: [] });
            const result = await repository.deduct('prod-123', 'store-123', 'unit-123', 50);
            (0, vitest_1.expect)(result).toBe(0);
        });
    });
    (0, vitest_1.describe)('sync', () => {
        (0, vitest_1.it)('should call sp_Inventory_Sync with correct parameters', async () => {
            mockRequest.execute.mockResolvedValueOnce({
                recordset: [{ SyncedCount: 25 }]
            });
            const result = await repository.sync('store-123');
            (0, vitest_1.expect)(mockRequest.execute).toHaveBeenCalledWith('sp_Inventory_Sync');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('storeId', 'store-123');
            (0, vitest_1.expect)(result).toBe(25);
        });
        (0, vitest_1.it)('should return 0 when no records synced', async () => {
            mockRequest.execute.mockResolvedValueOnce({ recordset: [] });
            const result = await repository.sync('store-123');
            (0, vitest_1.expect)(result).toBe(0);
        });
    });
    (0, vitest_1.describe)('hasSufficientStock', () => {
        (0, vitest_1.it)('should return true when stock is sufficient', async () => {
            mockRequest.execute.mockResolvedValueOnce({
                recordset: [{ AvailableQuantity: 100 }]
            });
            const result = await repository.hasSufficientStock('prod-123', 'store-123', 'unit-123', 50);
            (0, vitest_1.expect)(result).toBe(true);
        });
        (0, vitest_1.it)('should return false when stock is insufficient', async () => {
            mockRequest.execute.mockResolvedValueOnce({
                recordset: [{ AvailableQuantity: 30 }]
            });
            const result = await repository.hasSufficientStock('prod-123', 'store-123', 'unit-123', 50);
            (0, vitest_1.expect)(result).toBe(false);
        });
        (0, vitest_1.it)('should return true when stock equals required quantity', async () => {
            mockRequest.execute.mockResolvedValueOnce({
                recordset: [{ AvailableQuantity: 50 }]
            });
            const result = await repository.hasSufficientStock('prod-123', 'store-123', 'unit-123', 50);
            (0, vitest_1.expect)(result).toBe(true);
        });
    });
});
//# sourceMappingURL=inventory-sp-repository.test.js.map