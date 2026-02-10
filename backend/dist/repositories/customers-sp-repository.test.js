"use strict";
/**
 * Unit Tests for CustomersSPRepository
 *
 * Tests stored procedure repository operations for customers.
 * Requirements: 3.1-3.5
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const customers_sp_repository_1 = require("./customers-sp-repository");
// Mock the database connection module
vitest_1.vi.mock('../db/connection', () => ({
    getConnection: vitest_1.vi.fn(),
}));
(0, vitest_1.describe)('CustomersSPRepository', () => {
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
        repository = new customers_sp_repository_1.CustomersSPRepository();
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.describe)('create', () => {
        (0, vitest_1.it)('should call sp_Customers_Create with correct parameters', async () => {
            const input = {
                id: 'cust-123',
                storeId: 'store-123',
                name: 'Test Customer',
                phone: '0123456789',
                email: 'test@example.com',
                address: '123 Test St',
                customerType: 'retail',
                loyaltyTier: 'bronze',
            };
            const mockCustomer = {
                Id: 'cust-123',
                store_id: input.storeId,
                name: input.name,
                full_name: input.name,
                phone: input.phone,
                email: input.email,
                address: input.address,
                customer_type: input.customerType,
                loyalty_tier: input.loyaltyTier,
                total_spent: 0,
                total_paid: 0,
                total_debt: 0,
                created_at: new Date(),
                updated_at: new Date(),
            };
            // First call for create, second for getByStore (used by getById)
            mockRequest.execute
                .mockResolvedValueOnce({ recordset: [{ Id: 'cust-123' }] })
                .mockResolvedValueOnce({ recordset: [mockCustomer] });
            const result = await repository.create(input);
            (0, vitest_1.expect)(mockRequest.execute).toHaveBeenCalledWith('sp_Customers_Create');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('storeId', input.storeId);
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('name', input.name);
            (0, vitest_1.expect)(result.name).toBe(input.name);
            (0, vitest_1.expect)(result.storeId).toBe(input.storeId);
        });
        (0, vitest_1.it)('should throw error when customer creation fails', async () => {
            const input = {
                storeId: 'store-123',
                name: 'Test Customer',
            };
            mockRequest.execute
                .mockResolvedValueOnce({ recordset: [{ Id: 'cust-123' }] })
                .mockResolvedValueOnce({ recordset: [] });
            await (0, vitest_1.expect)(repository.create(input)).rejects.toThrow('Failed to create customer');
        });
    });
    (0, vitest_1.describe)('update', () => {
        (0, vitest_1.it)('should call sp_Customers_Update with correct parameters', async () => {
            const id = 'cust-123';
            const storeId = 'store-123';
            const data = {
                name: 'Updated Customer',
                phone: '0987654321',
            };
            const mockCustomer = {
                Id: id,
                store_id: storeId,
                name: data.name,
                full_name: data.name,
                phone: data.phone,
                customer_type: 'retail',
                loyalty_tier: 'bronze',
                total_spent: 0,
                total_paid: 0,
                total_debt: 0,
                created_at: new Date(),
                updated_at: new Date(),
            };
            mockRequest.execute
                .mockResolvedValueOnce({ recordset: [{ AffectedRows: 1 }] })
                .mockResolvedValueOnce({ recordset: [mockCustomer] });
            const result = await repository.update(id, storeId, data);
            (0, vitest_1.expect)(mockRequest.execute).toHaveBeenCalledWith('sp_Customers_Update');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('id', id);
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('storeId', storeId);
            (0, vitest_1.expect)(result?.name).toBe(data.name);
        });
        (0, vitest_1.it)('should return null when customer not found', async () => {
            mockRequest.execute.mockResolvedValueOnce({ recordset: [{ AffectedRows: 0 }] });
            const result = await repository.update('non-existent', 'store-123', { name: 'Test' });
            (0, vitest_1.expect)(result).toBeNull();
        });
    });
    (0, vitest_1.describe)('delete', () => {
        (0, vitest_1.it)('should call sp_Customers_Delete and return true on success', async () => {
            mockRequest.execute.mockResolvedValueOnce({ recordset: [{ AffectedRows: 1 }] });
            const result = await repository.delete('cust-123', 'store-123');
            (0, vitest_1.expect)(mockRequest.execute).toHaveBeenCalledWith('sp_Customers_Delete');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('id', 'cust-123');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('storeId', 'store-123');
            (0, vitest_1.expect)(result).toBe(true);
        });
        (0, vitest_1.it)('should return false when customer not found', async () => {
            mockRequest.execute.mockResolvedValueOnce({ recordset: [{ AffectedRows: 0 }] });
            const result = await repository.delete('non-existent', 'store-123');
            (0, vitest_1.expect)(result).toBe(false);
        });
    });
    (0, vitest_1.describe)('getByStore', () => {
        (0, vitest_1.it)('should call sp_Customers_GetByStore and return customers', async () => {
            const mockCustomers = [
                {
                    Id: 'cust-1',
                    store_id: 'store-123',
                    name: 'Customer 1',
                    full_name: 'Customer 1',
                    phone: '0123456789',
                    customer_type: 'retail',
                    loyalty_tier: 'bronze',
                    total_spent: 1000,
                    total_paid: 800,
                    total_debt: 200,
                    created_at: new Date(),
                    updated_at: new Date(),
                },
                {
                    Id: 'cust-2',
                    store_id: 'store-123',
                    name: 'Customer 2',
                    full_name: 'Customer 2',
                    phone: '0987654321',
                    customer_type: 'wholesale',
                    loyalty_tier: 'silver',
                    total_spent: 5000,
                    total_paid: 5000,
                    total_debt: 0,
                    created_at: new Date(),
                    updated_at: new Date(),
                },
            ];
            mockRequest.execute.mockResolvedValueOnce({ recordset: mockCustomers });
            const result = await repository.getByStore('store-123');
            (0, vitest_1.expect)(mockRequest.execute).toHaveBeenCalledWith('sp_Customers_GetByStore');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('storeId', 'store-123');
            (0, vitest_1.expect)(result).toHaveLength(2);
            (0, vitest_1.expect)(result[0].name).toBe('Customer 1');
            (0, vitest_1.expect)(result[1].name).toBe('Customer 2');
        });
    });
    (0, vitest_1.describe)('updateDebt', () => {
        (0, vitest_1.it)('should call sp_Customers_UpdateDebt with correct parameters', async () => {
            mockRequest.execute.mockResolvedValueOnce({ recordset: [{ total_debt: 500 }] });
            const result = await repository.updateDebt('cust-123', 'store-123', 1000, 500);
            (0, vitest_1.expect)(mockRequest.execute).toHaveBeenCalledWith('sp_Customers_UpdateDebt');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('id', 'cust-123');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('storeId', 'store-123');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('spentAmount', 1000);
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('paidAmount', 500);
            (0, vitest_1.expect)(result).toBe(500);
        });
        (0, vitest_1.it)('should return 0 when no result', async () => {
            mockRequest.execute.mockResolvedValueOnce({ recordset: [] });
            const result = await repository.updateDebt('cust-123', 'store-123', 100, 0);
            (0, vitest_1.expect)(result).toBe(0);
        });
    });
    (0, vitest_1.describe)('addSpent', () => {
        (0, vitest_1.it)('should call updateDebt with spent amount only', async () => {
            mockRequest.execute.mockResolvedValueOnce({ recordset: [{ total_debt: 1000 }] });
            const result = await repository.addSpent('cust-123', 'store-123', 1000);
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('spentAmount', 1000);
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('paidAmount', 0);
            (0, vitest_1.expect)(result).toBe(1000);
        });
    });
    (0, vitest_1.describe)('recordPayment', () => {
        (0, vitest_1.it)('should call updateDebt with paid amount only', async () => {
            mockRequest.execute.mockResolvedValueOnce({ recordset: [{ total_debt: 0 }] });
            const result = await repository.recordPayment('cust-123', 'store-123', 500);
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('spentAmount', 0);
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('paidAmount', 500);
            (0, vitest_1.expect)(result).toBe(0);
        });
    });
});
//# sourceMappingURL=customers-sp-repository.test.js.map