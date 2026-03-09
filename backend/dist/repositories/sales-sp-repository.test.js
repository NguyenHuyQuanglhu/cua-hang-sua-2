"use strict";
/**
 * Unit Tests for SalesSPRepository
 *
 * Tests stored procedure repository operations for sales.
 * Requirements: 2.1-2.5
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const sales_sp_repository_1 = require("./sales-sp-repository");
// Mock the database connection module
vitest_1.vi.mock('../db/connection', () => ({
    getConnection: vitest_1.vi.fn(),
}));
// Mock the transaction module
vitest_1.vi.mock('../db/transaction', () => ({
    withTransaction: vitest_1.vi.fn((callback) => {
        const mockTransaction = {};
        return callback(mockTransaction);
    }),
}));
(0, vitest_1.describe)('SalesSPRepository', () => {
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
        repository = new sales_sp_repository_1.SalesSPRepository();
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.describe)('create', () => {
        (0, vitest_1.it)('should call sp_Sales_Create with correct parameters', async () => {
            const input = {
                storeId: 'store-123',
                totalAmount: 1000,
                finalAmount: 900,
                customerId: 'cust-123',
                discount: 100,
                status: 'pending',
            };
            mockRequest.execute.mockResolvedValueOnce({
                recordset: [{ Id: 'sale-123', InvoiceNumber: 'INV-TEST' }],
            });
            const result = await repository.create(input);
            (0, vitest_1.expect)(mockRequest.execute).toHaveBeenCalledWith('sp_Sales_Create');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('storeId', input.storeId);
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('totalAmount', input.totalAmount);
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('finalAmount', input.finalAmount);
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('customerId', input.customerId);
            (0, vitest_1.expect)(result.id).toBe('sale-123');
            (0, vitest_1.expect)(result.invoiceNumber).toBe('INV-TEST');
        });
        (0, vitest_1.it)('should generate invoice number if not provided', async () => {
            const input = {
                storeId: 'store-123',
                totalAmount: 500,
                finalAmount: 500,
            };
            mockRequest.execute.mockResolvedValueOnce({
                recordset: [{ Id: 'sale-456', InvoiceNumber: 'INV-AUTO' }],
            });
            const result = await repository.create(input);
            (0, vitest_1.expect)(result.invoiceNumber).toBe('INV-AUTO');
        });
    });
    (0, vitest_1.describe)('createItem', () => {
        (0, vitest_1.it)('should call sp_SalesItems_Create with correct parameters', async () => {
            const input = {
                salesTransactionId: 'sale-123',
                productId: 'prod-123',
                quantity: 5,
                price: 100,
                unitId: 'unit-123',
            };
            mockRequest.execute.mockResolvedValueOnce({
                recordset: [{ Id: 'item-123' }],
            });
            const result = await repository.createItem(input);
            (0, vitest_1.expect)(mockRequest.execute).toHaveBeenCalledWith('sp_SalesItems_Create');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('salesTransactionId', input.salesTransactionId);
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('productId', input.productId);
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('quantity', input.quantity);
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('price', input.price);
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('unitId', input.unitId);
            (0, vitest_1.expect)(result).toBe('item-123');
        });
    });
    (0, vitest_1.describe)('getById', () => {
        (0, vitest_1.it)('should call sp_Sales_GetById and return sale with items', async () => {
            const mockSale = {
                id: 'sale-123',
                store_id: 'store-123',
                invoice_number: 'INV-001',
                customer_id: 'cust-123',
                transaction_date: new Date(),
                status: 'pending',
                total_amount: 1000,
                vat_amount: 100,
                final_amount: 900,
                discount: 100,
                points_used: 0,
                points_discount: 0,
                created_at: new Date(),
                updated_at: new Date(),
                customer_name: 'John Doe',
            };
            const mockItems = [
                {
                    id: 'item-1',
                    sales_transaction_id: 'sale-123',
                    product_id: 'prod-1',
                    quantity: 2,
                    price: 300,
                    unit_id: 'unit-1',
                    product_name: 'Product 1',
                    unit_name: 'Cái',
                },
                {
                    id: 'item-2',
                    sales_transaction_id: 'sale-123',
                    product_id: 'prod-2',
                    quantity: 1,
                    price: 400,
                    unit_id: 'unit-2',
                    product_name: 'Product 2',
                    unit_name: 'Hộp',
                },
            ];
            mockRequest.execute.mockResolvedValueOnce({
                recordsets: [[mockSale], mockItems],
                recordset: [mockSale],
                rowsAffected: [1, 2],
                output: {},
            });
            const result = await repository.getById('sale-123', 'store-123');
            (0, vitest_1.expect)(mockRequest.execute).toHaveBeenCalledWith('sp_Sales_GetById');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('id', 'sale-123');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('storeId', 'store-123');
            (0, vitest_1.expect)(result).not.toBeNull();
            (0, vitest_1.expect)(result?.sale.id).toBe('sale-123');
            (0, vitest_1.expect)(result?.sale.customerName).toBe('John Doe');
            (0, vitest_1.expect)(result?.items).toHaveLength(2);
            (0, vitest_1.expect)(result?.items[0].productName).toBe('Product 1');
        });
        (0, vitest_1.it)('should return null when sale not found', async () => {
            mockRequest.execute.mockResolvedValueOnce({
                recordsets: [[], []],
                recordset: [],
                rowsAffected: [0, 0],
                output: {},
            });
            const result = await repository.getById('non-existent', 'store-123');
            (0, vitest_1.expect)(result).toBeNull();
        });
    });
    (0, vitest_1.describe)('getByStore', () => {
        (0, vitest_1.it)('should call sp_Sales_GetByStore and return sales', async () => {
            const mockSales = [
                {
                    id: 'sale-1',
                    store_id: 'store-123',
                    invoice_number: 'INV-001',
                    transaction_date: new Date(),
                    status: 'pending',
                    total_amount: 1000,
                    vat_amount: 100,
                    final_amount: 900,
                    discount: 100,
                    points_used: 0,
                    points_discount: 0,
                    created_at: new Date(),
                    updated_at: new Date(),
                    customer_name: 'Customer 1',
                },
                {
                    id: 'sale-2',
                    store_id: 'store-123',
                    invoice_number: 'INV-002',
                    transaction_date: new Date(),
                    status: 'printed',
                    total_amount: 500,
                    vat_amount: 50,
                    final_amount: 500,
                    discount: 0,
                    points_used: 0,
                    points_discount: 0,
                    created_at: new Date(),
                    updated_at: new Date(),
                    customer_name: 'Customer 2',
                },
            ];
            mockRequest.execute.mockResolvedValueOnce({ recordset: mockSales });
            const result = await repository.getByStore('store-123');
            (0, vitest_1.expect)(mockRequest.execute).toHaveBeenCalledWith('sp_Sales_GetByStore');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('storeId', 'store-123');
            (0, vitest_1.expect)(result).toHaveLength(2);
            (0, vitest_1.expect)(result[0].invoiceNumber).toBe('INV-001');
            (0, vitest_1.expect)(result[1].invoiceNumber).toBe('INV-002');
        });
        (0, vitest_1.it)('should pass date filters when provided', async () => {
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-12-31');
            mockRequest.execute.mockResolvedValueOnce({ recordset: [] });
            await repository.getByStore('store-123', { startDate, endDate });
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('startDate', startDate);
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('endDate', endDate);
        });
        (0, vitest_1.it)('should pass customer filter when provided', async () => {
            mockRequest.execute.mockResolvedValueOnce({ recordset: [] });
            await repository.getByStore('store-123', { customerId: 'cust-123' });
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('customerId', 'cust-123');
        });
        (0, vitest_1.it)('should pass status filter when provided', async () => {
            mockRequest.execute.mockResolvedValueOnce({ recordset: [] });
            await repository.getByStore('store-123', { status: 'printed' });
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('status', 'printed');
        });
    });
    (0, vitest_1.describe)('updateStatus', () => {
        (0, vitest_1.it)('should call sp_Sales_UpdateStatus and return true on success', async () => {
            mockRequest.execute.mockResolvedValueOnce({
                recordset: [{ AffectedRows: 1 }],
            });
            const result = await repository.updateStatus('sale-123', 'store-123', 'printed');
            (0, vitest_1.expect)(mockRequest.execute).toHaveBeenCalledWith('sp_Sales_UpdateStatus');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('id', 'sale-123');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('storeId', 'store-123');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('status', 'printed');
            (0, vitest_1.expect)(result).toBe(true);
        });
        (0, vitest_1.it)('should return false when sale not found', async () => {
            mockRequest.execute.mockResolvedValueOnce({
                recordset: [{ AffectedRows: 0 }],
            });
            const result = await repository.updateStatus('non-existent', 'store-123', 'printed');
            (0, vitest_1.expect)(result).toBe(false);
        });
    });
    (0, vitest_1.describe)('getByDateRange', () => {
        (0, vitest_1.it)('should call getByStore with date filters', async () => {
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-12-31');
            mockRequest.execute.mockResolvedValueOnce({ recordset: [] });
            await repository.getByDateRange('store-123', startDate, endDate);
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('startDate', startDate);
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('endDate', endDate);
        });
    });
    (0, vitest_1.describe)('getByCustomer', () => {
        (0, vitest_1.it)('should call getByStore with customer filter', async () => {
            mockRequest.execute.mockResolvedValueOnce({ recordset: [] });
            await repository.getByCustomer('store-123', 'cust-123');
            (0, vitest_1.expect)(mockRequest.input).toHaveBeenCalledWith('customerId', 'cust-123');
        });
    });
});
//# sourceMappingURL=sales-sp-repository.test.js.map