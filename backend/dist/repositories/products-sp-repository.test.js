"use strict";
/**
 * Unit Tests for ProductsSPRepository
 *
 * Tests stored procedure repository operations for products.
 * Requirements: 1.1-1.5
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const products_sp_repository_1 = require("./products-sp-repository");
// Mock the database connection module
vitest_1.vi.mock('../db/connection', () => ({
    getConnection: vitest_1.vi.fn(),
}));
(0, vitest_1.describe)('ProductsSPRepository', () => {
    let repository;
    let mockRequest;
    let mockConnection;
    (0, vitest_1.beforeEach)(async () => {
        // Reset mocks
        vitest_1.vi.clearAllMocks();
        // Create mock request object
        mockRequest = {
            input: vitest_1.vi.fn().mockReturnThis(),
            execute: vitest_1.vi.fn(),
        };
        // Create mock connection
        mockConnection = {
            request: vitest_1.vi.fn().mockReturnValue(mockRequest),
        };
        // Setup getConnection mock
        const { getConnection } = await import('../db/connection.js');
        getConnection.mockResolvedValue(mockConnection);
        repository = new products_sp_repository_1.ProductsSPRepository();
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.describe)('create', () => {
        (0, vitest_1.it)('should call sp_Products_Create with correct parameters', async () => {
            const input = {
                storeId: 'store-123',
                name: 'Test Product',
                price: 100,
                costPrice: 80,
                categoryId: 'cat-123',
                unitId: 'unit-123',
                stockQuantity: 50,
                status: 'active',
            };
            const mockProduct = {
                id: 'prod-123',
                store_id: input.storeId,
                category_id: input.categoryId,
                name: input.name,
                price: input.price,
                cost_price: input.costPrice,
                unit_id: input.unitId,
                stock_quantity: input.stockQuantity,
                status: input.status,
                created_at: new Date(),
                updated_at: new Date(),
            };
            // First call for create, second for getById
            mockRequest.execute
                .mockResolvedValueOnce({ recordset: [{ Id: 'prod-123' }] })
                .mockResolvedValueOnce({ recordset: [mockProduct] });
            const result = await repository.create(input);
            (0, vitest_1.expect)(mockRequest.execute).toHaveBeenCalledWith('sp_Products_Create');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('storeId', input.storeId);
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('name', input.name);
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('price', input.price);
            (0, vitest_1.expect)(result.name).toBe(input.name);
            (0, vitest_1.expect)(result.storeId).toBe(input.storeId);
        });
        (0, vitest_1.it)('should throw error when product creation fails', async () => {
            const input = {
                storeId: 'store-123',
                name: 'Test Product',
                price: 100,
                costPrice: 80,
            };
            // Create returns ID but getById returns nothing
            mockRequest.execute
                .mockResolvedValueOnce({ recordset: [{ Id: 'prod-123' }] })
                .mockResolvedValueOnce({ recordset: [] });
            await (0, vitest_1.expect)(repository.create(input)).rejects.toThrow('Failed to create product');
        });
    });
    (0, vitest_1.describe)('update', () => {
        (0, vitest_1.it)('should call sp_Products_Update with correct parameters', async () => {
            const id = 'prod-123';
            const storeId = 'store-123';
            const data = {
                name: 'Updated Product',
                price: 150,
            };
            const mockProduct = {
                id,
                store_id: storeId,
                name: data.name,
                price: data.price,
                cost_price: 80,
                stock_quantity: 50,
                status: 'active',
                created_at: new Date(),
                updated_at: new Date(),
            };
            mockRequest.execute
                .mockResolvedValueOnce({ recordset: [{ AffectedRows: 1 }] })
                .mockResolvedValueOnce({ recordset: [mockProduct] });
            const result = await repository.update(id, storeId, data);
            (0, vitest_1.expect)(mockRequest.execute).toHaveBeenCalledWith('sp_Products_Update');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('id', id);
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('storeId', storeId);
            (0, vitest_1.expect)(result?.name).toBe(data.name);
            (0, vitest_1.expect)(result?.price).toBe(data.price);
        });
        (0, vitest_1.it)('should return null when product not found', async () => {
            mockRequest.execute.mockResolvedValueOnce({ recordset: [{ AffectedRows: 0 }] });
            const result = await repository.update('non-existent', 'store-123', { name: 'Test' });
            (0, vitest_1.expect)(result).toBeNull();
        });
    });
    (0, vitest_1.describe)('delete', () => {
        (0, vitest_1.it)('should call sp_Products_Delete and return true on success', async () => {
            mockRequest.execute.mockResolvedValueOnce({ recordset: [{ AffectedRows: 1 }] });
            const result = await repository.delete('prod-123', 'store-123');
            (0, vitest_1.expect)(mockRequest.execute).toHaveBeenCalledWith('sp_Products_Delete');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('id', 'prod-123');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('storeId', 'store-123');
            (0, vitest_1.expect)(result).toBe(true);
        });
        (0, vitest_1.it)('should return false when product not found', async () => {
            mockRequest.execute.mockResolvedValueOnce({ recordset: [{ AffectedRows: 0 }] });
            const result = await repository.delete('non-existent', 'store-123');
            (0, vitest_1.expect)(result).toBe(false);
        });
    });
    (0, vitest_1.describe)('getByStore', () => {
        (0, vitest_1.it)('should call sp_Products_GetByStore and return products', async () => {
            const mockProducts = [
                {
                    id: 'prod-1',
                    store_id: 'store-123',
                    name: 'Product 1',
                    price: 100,
                    cost_price: 80,
                    stock_quantity: 50,
                    status: 'active',
                    created_at: new Date(),
                    updated_at: new Date(),
                },
                {
                    id: 'prod-2',
                    store_id: 'store-123',
                    name: 'Product 2',
                    price: 200,
                    cost_price: 160,
                    stock_quantity: 30,
                    status: 'active',
                    created_at: new Date(),
                    updated_at: new Date(),
                },
            ];
            mockRequest.execute.mockResolvedValueOnce({ recordset: mockProducts });
            const result = await repository.getByStore('store-123');
            (0, vitest_1.expect)(mockRequest.execute).toHaveBeenCalledWith('sp_Products_GetByStore');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('storeId', 'store-123');
            (0, vitest_1.expect)(result).toHaveLength(2);
            (0, vitest_1.expect)(result[0].name).toBe('Product 1');
            (0, vitest_1.expect)(result[1].name).toBe('Product 2');
        });
        (0, vitest_1.it)('should pass status filter when provided', async () => {
            mockRequest.execute.mockResolvedValueOnce({ recordset: [] });
            await repository.getByStore('store-123', 'active');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('status', 'active');
        });
        (0, vitest_1.it)('should pass categoryId filter when provided', async () => {
            mockRequest.execute.mockResolvedValueOnce({ recordset: [] });
            await repository.getByStore('store-123', null, 'cat-123');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('categoryId', 'cat-123');
        });
    });
    (0, vitest_1.describe)('getById', () => {
        (0, vitest_1.it)('should call sp_Products_GetById and return product', async () => {
            const mockProduct = {
                id: 'prod-123',
                store_id: 'store-123',
                category_id: 'cat-123',
                name: 'Test Product',
                price: 100,
                cost_price: 80,
                stock_quantity: 50,
                status: 'active',
                category_name: 'Test Category',
                current_stock: 50,
                created_at: new Date(),
                updated_at: new Date(),
            };
            mockRequest.execute.mockResolvedValueOnce({ recordset: [mockProduct] });
            const result = await repository.getById('prod-123', 'store-123');
            (0, vitest_1.expect)(mockRequest.execute).toHaveBeenCalledWith('sp_Products_GetById');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('id', 'prod-123');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('storeId', 'store-123');
            (0, vitest_1.expect)(result?.id).toBe('prod-123');
            (0, vitest_1.expect)(result?.name).toBe('Test Product');
            (0, vitest_1.expect)(result?.categoryName).toBe('Test Category');
            (0, vitest_1.expect)(result?.currentStock).toBe(50);
        });
        (0, vitest_1.it)('should return null when product not found', async () => {
            mockRequest.execute.mockResolvedValueOnce({ recordset: [] });
            const result = await repository.getById('non-existent', 'store-123');
            (0, vitest_1.expect)(result).toBeNull();
        });
    });
    (0, vitest_1.describe)('getActiveByStore', () => {
        (0, vitest_1.it)('should call getByStore with active status', async () => {
            mockRequest.execute.mockResolvedValueOnce({ recordset: [] });
            await repository.getActiveByStore('store-123');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('status', 'active');
        });
    });
    (0, vitest_1.describe)('getByCategory', () => {
        (0, vitest_1.it)('should call getByStore with categoryId filter', async () => {
            mockRequest.execute.mockResolvedValueOnce({ recordset: [] });
            await repository.getByCategory('store-123', 'cat-123');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('categoryId', 'cat-123');
        });
    });
});
//# sourceMappingURL=products-sp-repository.test.js.map