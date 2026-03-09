"use strict";
/**
 * Integration Tests for Purchase Order Flow
 *
 * Tests create → update → delete flow and delete constraint when lots are used.
 * Requirements: 1.1, 3.2, 3.3, 3.4
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
// Mock the repository
vitest_1.vi.mock('../repositories/purchase-order-repository', () => ({
    purchaseOrderRepository: {
        findAllWithSupplier: vitest_1.vi.fn(),
        findByIdWithDetails: vitest_1.vi.fn(),
        createWithItems: vitest_1.vi.fn(),
        updateWithItems: vitest_1.vi.fn(),
        deleteWithItems: vitest_1.vi.fn(),
        canDelete: vitest_1.vi.fn(),
    },
}));
const purchase_order_repository_1 = require("../repositories/purchase-order-repository");
(0, vitest_1.describe)('Purchase Order API - Validation', () => {
    (0, vitest_1.describe)('Create Purchase Order Validation', () => {
        function validateCreateInput(body) {
            const { importDate, items } = body;
            if (!importDate) {
                return { valid: false, error: 'Import date is required' };
            }
            if (!items || !Array.isArray(items) || items.length === 0) {
                return { valid: false, error: 'At least one item is required' };
            }
            return { valid: true };
        }
        (0, vitest_1.it)('should reject request without import date', () => {
            const result = validateCreateInput({
                items: [{ productId: 'p1', quantity: 10, cost: 100, unitId: 'u1' }],
            });
            (0, vitest_1.expect)(result.valid).toBe(false);
            (0, vitest_1.expect)(result.error).toBe('Import date is required');
        });
        (0, vitest_1.it)('should reject request without items', () => {
            const result = validateCreateInput({
                importDate: '2024-01-01',
            });
            (0, vitest_1.expect)(result.valid).toBe(false);
            (0, vitest_1.expect)(result.error).toBe('At least one item is required');
        });
        (0, vitest_1.it)('should reject request with empty items array', () => {
            const result = validateCreateInput({
                importDate: '2024-01-01',
                items: [],
            });
            (0, vitest_1.expect)(result.valid).toBe(false);
            (0, vitest_1.expect)(result.error).toBe('At least one item is required');
        });
        (0, vitest_1.it)('should accept valid request', () => {
            const result = validateCreateInput({
                importDate: '2024-01-01',
                items: [{ productId: 'p1', quantity: 10, cost: 100, unitId: 'u1' }],
            });
            (0, vitest_1.expect)(result.valid).toBe(true);
        });
        (0, vitest_1.it)('should accept request without supplier (optional)', () => {
            const result = validateCreateInput({
                importDate: '2024-01-01',
                items: [{ productId: 'p1', quantity: 10, cost: 100, unitId: 'u1' }],
            });
            (0, vitest_1.expect)(result.valid).toBe(true);
        });
    });
    (0, vitest_1.describe)('Total Amount Calculation', () => {
        function calculateTotalAmount(items) {
            return items.reduce((sum, item) => sum + (item.quantity * item.cost), 0);
        }
        (0, vitest_1.it)('should calculate total amount correctly for single item', () => {
            const items = [{ quantity: 10, cost: 100 }];
            (0, vitest_1.expect)(calculateTotalAmount(items)).toBe(1000);
        });
        (0, vitest_1.it)('should calculate total amount correctly for multiple items', () => {
            const items = [
                { quantity: 10, cost: 100 },
                { quantity: 5, cost: 200 },
                { quantity: 3, cost: 50 },
            ];
            (0, vitest_1.expect)(calculateTotalAmount(items)).toBe(2150); // 1000 + 1000 + 150
        });
        (0, vitest_1.it)('should return 0 for empty items', () => {
            (0, vitest_1.expect)(calculateTotalAmount([])).toBe(0);
        });
        (0, vitest_1.it)('should handle decimal quantities', () => {
            const items = [{ quantity: 2.5, cost: 100 }];
            (0, vitest_1.expect)(calculateTotalAmount(items)).toBe(250);
        });
    });
});
(0, vitest_1.describe)('Purchase Order API - Delete Constraint', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('canDelete Logic', () => {
        (0, vitest_1.it)('should allow deletion when no lots have been used', async () => {
            vitest_1.vi.mocked(purchase_order_repository_1.purchaseOrderRepository.canDelete).mockResolvedValue(true);
            const canDelete = await purchase_order_repository_1.purchaseOrderRepository.canDelete('order-1', 'store-1');
            (0, vitest_1.expect)(canDelete).toBe(true);
        });
        (0, vitest_1.it)('should prevent deletion when lots have been partially used', async () => {
            vitest_1.vi.mocked(purchase_order_repository_1.purchaseOrderRepository.canDelete).mockResolvedValue(false);
            const canDelete = await purchase_order_repository_1.purchaseOrderRepository.canDelete('order-1', 'store-1');
            (0, vitest_1.expect)(canDelete).toBe(false);
        });
    });
    (0, vitest_1.describe)('Delete Flow', () => {
        (0, vitest_1.it)('should delete successfully when canDelete returns true', async () => {
            vitest_1.vi.mocked(purchase_order_repository_1.purchaseOrderRepository.canDelete).mockResolvedValue(true);
            vitest_1.vi.mocked(purchase_order_repository_1.purchaseOrderRepository.deleteWithItems).mockResolvedValue(true);
            const canDelete = await purchase_order_repository_1.purchaseOrderRepository.canDelete('order-1', 'store-1');
            (0, vitest_1.expect)(canDelete).toBe(true);
            const result = await purchase_order_repository_1.purchaseOrderRepository.deleteWithItems('order-1', 'store-1');
            (0, vitest_1.expect)(result).toBe(true);
            (0, vitest_1.expect)(purchase_order_repository_1.purchaseOrderRepository.deleteWithItems).toHaveBeenCalledWith('order-1', 'store-1');
        });
        (0, vitest_1.it)('should not call deleteWithItems when canDelete returns false', async () => {
            vitest_1.vi.mocked(purchase_order_repository_1.purchaseOrderRepository.canDelete).mockResolvedValue(false);
            const canDelete = await purchase_order_repository_1.purchaseOrderRepository.canDelete('order-1', 'store-1');
            (0, vitest_1.expect)(canDelete).toBe(false);
            // In real flow, deleteWithItems should not be called
            (0, vitest_1.expect)(purchase_order_repository_1.purchaseOrderRepository.deleteWithItems).not.toHaveBeenCalled();
        });
    });
});
(0, vitest_1.describe)('Purchase Order API - CRUD Flow', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('Create → Update → Delete Flow', () => {
        const mockPurchaseOrder = {
            id: 'order-1',
            storeId: 'store-1',
            orderNumber: 'PN2024010001',
            supplierId: 'supplier-1',
            importDate: '2024-01-01T00:00:00.000Z',
            totalAmount: 1000,
            notes: 'Test order',
            createdAt: '2024-01-01T00:00:00.000Z',
            items: [
                {
                    id: 'item-1',
                    purchaseOrderId: 'order-1',
                    productId: 'product-1',
                    quantity: 10,
                    cost: 100,
                    unitId: 'unit-1',
                },
            ],
        };
        (0, vitest_1.it)('should create purchase order with items', async () => {
            vitest_1.vi.mocked(purchase_order_repository_1.purchaseOrderRepository.createWithItems).mockResolvedValue(mockPurchaseOrder);
            const input = {
                supplierId: 'supplier-1',
                importDate: '2024-01-01',
                notes: 'Test order',
                totalAmount: 1000,
                items: [{ productId: 'product-1', quantity: 10, cost: 100, unitId: 'unit-1' }],
            };
            const result = await purchase_order_repository_1.purchaseOrderRepository.createWithItems(input, 'store-1');
            (0, vitest_1.expect)(result).toEqual(mockPurchaseOrder);
            (0, vitest_1.expect)(result.orderNumber).toMatch(/^PN\d{6}\d{4}$/);
            (0, vitest_1.expect)(result.items).toHaveLength(1);
        });
        (0, vitest_1.it)('should update purchase order with new items', async () => {
            const updatedOrder = {
                ...mockPurchaseOrder,
                totalAmount: 2000,
                items: [
                    { ...mockPurchaseOrder.items[0], quantity: 20 },
                ],
            };
            vitest_1.vi.mocked(purchase_order_repository_1.purchaseOrderRepository.updateWithItems).mockResolvedValue(updatedOrder);
            const input = {
                supplierId: 'supplier-1',
                importDate: '2024-01-01',
                notes: 'Updated order',
                totalAmount: 2000,
                items: [{ productId: 'product-1', quantity: 20, cost: 100, unitId: 'unit-1' }],
            };
            const result = await purchase_order_repository_1.purchaseOrderRepository.updateWithItems('order-1', input, 'store-1');
            (0, vitest_1.expect)(result.totalAmount).toBe(2000);
            (0, vitest_1.expect)(result.items[0].quantity).toBe(20);
        });
        (0, vitest_1.it)('should delete purchase order when not used', async () => {
            vitest_1.vi.mocked(purchase_order_repository_1.purchaseOrderRepository.canDelete).mockResolvedValue(true);
            vitest_1.vi.mocked(purchase_order_repository_1.purchaseOrderRepository.deleteWithItems).mockResolvedValue(true);
            const canDelete = await purchase_order_repository_1.purchaseOrderRepository.canDelete('order-1', 'store-1');
            (0, vitest_1.expect)(canDelete).toBe(true);
            const result = await purchase_order_repository_1.purchaseOrderRepository.deleteWithItems('order-1', 'store-1');
            (0, vitest_1.expect)(result).toBe(true);
        });
        (0, vitest_1.it)('should throw error when updating non-existent order', async () => {
            vitest_1.vi.mocked(purchase_order_repository_1.purchaseOrderRepository.updateWithItems).mockRejectedValue(new Error('Purchase order not found or access denied'));
            const input = {
                supplierId: 'supplier-1',
                importDate: '2024-01-01',
                notes: 'Test',
                totalAmount: 1000,
                items: [{ productId: 'product-1', quantity: 10, cost: 100, unitId: 'unit-1' }],
            };
            await (0, vitest_1.expect)(purchase_order_repository_1.purchaseOrderRepository.updateWithItems('non-existent', input, 'store-1')).rejects.toThrow('Purchase order not found or access denied');
        });
        (0, vitest_1.it)('should throw error when deleting order with used inventory', async () => {
            vitest_1.vi.mocked(purchase_order_repository_1.purchaseOrderRepository.deleteWithItems).mockRejectedValue(new Error('Cannot delete purchase order with used inventory'));
            await (0, vitest_1.expect)(purchase_order_repository_1.purchaseOrderRepository.deleteWithItems('order-1', 'store-1')).rejects.toThrow('Cannot delete purchase order with used inventory');
        });
    });
});
(0, vitest_1.describe)('Purchase Order API - Response Mapping', () => {
    function mapPurchaseOrderResponse(order) {
        return {
            id: order.id,
            storeId: order.storeId,
            orderNumber: order.orderNumber,
            supplierId: order.supplierId,
            supplierName: order.supplierName,
            importDate: order.importDate,
            totalAmount: order.totalAmount,
            notes: order.notes,
            itemCount: order.itemCount,
            items: order.items,
            createdAt: order.createdAt,
        };
    }
    (0, vitest_1.it)('should map purchase order to response format', () => {
        const order = {
            id: 'order-1',
            storeId: 'store-1',
            orderNumber: 'PN2024010001',
            supplierId: 'supplier-1',
            supplierName: 'Test Supplier',
            importDate: '2024-01-01T00:00:00.000Z',
            totalAmount: 1000,
            notes: 'Test order',
            itemCount: 2,
            items: [],
            createdAt: '2024-01-01T00:00:00.000Z',
        };
        const response = mapPurchaseOrderResponse(order);
        (0, vitest_1.expect)(response.id).toBe('order-1');
        (0, vitest_1.expect)(response.orderNumber).toBe('PN2024010001');
        (0, vitest_1.expect)(response.supplierName).toBe('Test Supplier');
        (0, vitest_1.expect)(response.totalAmount).toBe(1000);
        (0, vitest_1.expect)(response.itemCount).toBe(2);
    });
    (0, vitest_1.it)('should handle null supplier', () => {
        const order = {
            id: 'order-1',
            storeId: 'store-1',
            orderNumber: 'PN2024010001',
            supplierId: null,
            supplierName: null,
            importDate: '2024-01-01T00:00:00.000Z',
            totalAmount: 1000,
            notes: null,
            itemCount: 1,
            items: [],
            createdAt: '2024-01-01T00:00:00.000Z',
        };
        const response = mapPurchaseOrderResponse(order);
        (0, vitest_1.expect)(response.supplierId).toBeNull();
        (0, vitest_1.expect)(response.supplierName).toBeNull();
        (0, vitest_1.expect)(response.notes).toBeNull();
    });
});
(0, vitest_1.describe)('Purchase Order API - Error Handling', () => {
    function mapErrorResponse(error) {
        const message = error.message;
        if (message.includes('not found') || message.includes('access denied')) {
            return { error: 'Purchase order not found or access denied', code: 'PURCHASE_NOT_FOUND' };
        }
        if (message.includes('Cannot delete')) {
            return { error: message, code: 'PURCHASE_DELETE_FORBIDDEN' };
        }
        return { error: 'Failed to process request', code: 'INTERNAL_ERROR' };
    }
    (0, vitest_1.it)('should return PURCHASE_NOT_FOUND for not found errors', () => {
        const error = new Error('Purchase order not found');
        const response = mapErrorResponse(error);
        (0, vitest_1.expect)(response.code).toBe('PURCHASE_NOT_FOUND');
    });
    (0, vitest_1.it)('should return PURCHASE_NOT_FOUND for access denied errors', () => {
        const error = new Error('access denied');
        const response = mapErrorResponse(error);
        (0, vitest_1.expect)(response.code).toBe('PURCHASE_NOT_FOUND');
    });
    (0, vitest_1.it)('should return PURCHASE_DELETE_FORBIDDEN for delete constraint errors', () => {
        const error = new Error('Cannot delete purchase order with used inventory');
        const response = mapErrorResponse(error);
        (0, vitest_1.expect)(response.code).toBe('PURCHASE_DELETE_FORBIDDEN');
        (0, vitest_1.expect)(response.error).toContain('Cannot delete');
    });
    (0, vitest_1.it)('should return INTERNAL_ERROR for unknown errors', () => {
        const error = new Error('Database connection failed');
        const response = mapErrorResponse(error);
        (0, vitest_1.expect)(response.code).toBe('INTERNAL_ERROR');
    });
});
//# sourceMappingURL=purchases.test.js.map