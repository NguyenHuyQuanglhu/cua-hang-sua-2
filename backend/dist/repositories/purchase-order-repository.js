"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.purchaseOrderRepository = exports.PurchaseOrderRepository = void 0;
const base_repository_1 = require("./base-repository");
const db_1 = require("../db");
const transaction_1 = require("../db/transaction");
const cash_transaction_repository_1 = require("./cash-transaction-repository");
class PurchaseOrderRepository extends base_repository_1.BaseRepository {
    constructor() {
        super('PurchaseOrders', 'id');
    }
    mapToEntity(record) {
        const r = record;
        return {
            id: r.id,
            storeId: r.store_id,
            orderNumber: r.order_number,
            supplierId: r.supplier_id || undefined,
            importDate: r.import_date instanceof Date ? r.import_date.toISOString() : String(r.import_date),
            totalAmount: r.total_amount,
            paidAmount: r.paid_amount ?? 0,
            remainingDebt: r.remaining_debt ?? r.total_amount,
            notes: r.notes || undefined,
            createdBy: r.created_by || undefined,
            createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
        };
    }
    mapToRecord(entity) {
        const record = {};
        if (entity.id !== undefined)
            record.id = entity.id;
        if (entity.storeId !== undefined)
            record.store_id = entity.storeId;
        if (entity.orderNumber !== undefined)
            record.order_number = entity.orderNumber;
        if (entity.supplierId !== undefined)
            record.supplier_id = entity.supplierId || null;
        if (entity.importDate !== undefined)
            record.import_date = new Date(entity.importDate);
        if (entity.totalAmount !== undefined)
            record.total_amount = entity.totalAmount;
        if (entity.notes !== undefined)
            record.notes = entity.notes || null;
        if (entity.createdBy !== undefined)
            record.created_by = entity.createdBy || null;
        return record;
    }
    mapItemToEntity(record) {
        return {
            id: record.id,
            purchaseOrderId: record.purchase_order_id,
            productId: record.product_id,
            quantity: record.quantity,
            cost: record.cost,
            unitId: record.unit_id,
            baseQuantity: record.base_quantity,
            baseCost: record.base_cost,
            baseUnitId: record.base_unit_id,
        };
    }
    mapLotToEntity(record) {
        return {
            id: record.id,
            productId: record.product_id,
            storeId: record.store_id,
            importDate: record.import_date instanceof Date ? record.import_date.toISOString() : String(record.import_date),
            quantity: record.quantity,
            remainingQuantity: record.remaining_quantity,
            cost: record.cost,
            unitId: record.unit_id,
            purchaseOrderId: record.purchase_order_id || undefined,
        };
    }
    async generateOrderNumber(storeId) {
        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const datePrefix = `PN${year}${month}`;
        const queryString = `SELECT TOP 1 order_number FROM PurchaseOrders WHERE store_id = @storeId AND order_number LIKE @prefix + '%' ORDER BY order_number DESC`;
        const result = await (0, db_1.queryOne)(queryString, { storeId, prefix: datePrefix });
        let nextSequence = 1;
        if (result) {
            const lastSequence = parseInt(result.order_number.substring(datePrefix.length), 10);
            if (!isNaN(lastSequence))
                nextSequence = lastSequence + 1;
        }
        return `${datePrefix}${nextSequence.toString().padStart(4, '0')}`;
    }
    async createWithItems(input, storeId) {
        return (0, transaction_1.withTransaction)(async (transaction) => {
            const orderNumber = await this.generateOrderNumber(storeId);
            const purchaseOrderId = crypto.randomUUID();
            const now = new Date();
            // Calculate payment status
            const paidAmount = input.paidAmount || 0;
            const remainingDebt = input.totalAmount - paidAmount;
            let paymentStatus = 'unpaid';
            if (paidAmount >= input.totalAmount) {
                paymentStatus = 'paid';
            }
            else if (paidAmount > 0) {
                paymentStatus = 'partial';
            }
            const orderRecord = await (0, transaction_1.transactionInsert)(transaction, 'PurchaseOrders', {
                id: purchaseOrderId,
                store_id: storeId,
                order_number: orderNumber,
                supplier_id: input.supplierId || null,
                import_date: new Date(input.importDate),
                total_amount: input.totalAmount,
                paid_amount: paidAmount,
                remaining_debt: remainingDebt,
                payment_status: paymentStatus,
                notes: input.notes || null,
                created_at: now,
                // updated_at will be set automatically by database DEFAULT
            });
            if (!orderRecord)
                throw new Error('Failed to create purchase order');
            const items = [];
            for (const item of input.items) {
                const itemId = crypto.randomUUID();
                const lotId = crypto.randomUUID();
                // Use base values if provided, otherwise use original values
                const baseQuantity = item.baseQuantity || item.quantity;
                const baseCost = item.baseCost || item.cost;
                const baseUnitId = item.baseUnitId || item.unitId;
                const itemRecord = await (0, transaction_1.transactionInsert)(transaction, 'PurchaseOrderItems', {
                    id: itemId, purchase_order_id: purchaseOrderId, product_id: item.productId,
                    quantity: item.quantity, cost: item.cost, unit_id: item.unitId,
                    base_quantity: baseQuantity, base_cost: baseCost, base_unit_id: baseUnitId,
                });
                if (!itemRecord)
                    throw new Error('Failed to create purchase order item');
                // PurchaseLots always use base unit values for inventory tracking
                await (0, transaction_1.transactionInsert)(transaction, 'PurchaseLots', {
                    id: lotId, product_id: item.productId, store_id: storeId, import_date: new Date(input.importDate),
                    quantity: baseQuantity, remaining_quantity: baseQuantity, cost: baseCost, unit_id: baseUnitId,
                    purchase_order_id: purchaseOrderId,
                });
                // Update ProductInventory
                const existingInventory = await (0, transaction_1.transactionQueryOne)(transaction, `SELECT Id, Quantity FROM ProductInventory WHERE ProductId = @productId AND StoreId = @storeId`, { productId: item.productId, storeId });
                if (existingInventory) {
                    // Update existing inventory
                    await (0, transaction_1.transactionQuery)(transaction, `UPDATE ProductInventory SET Quantity = Quantity + @quantity, UpdatedAt = GETDATE() WHERE Id = @id`, { id: existingInventory.Id, quantity: baseQuantity });
                }
                else {
                    // Create new inventory record
                    await (0, transaction_1.transactionInsert)(transaction, 'ProductInventory', {
                        Id: crypto.randomUUID(),
                        ProductId: item.productId,
                        StoreId: storeId,
                        UnitId: baseUnitId,
                        Quantity: baseQuantity,
                        CreatedAt: now,
                        UpdatedAt: now,
                    });
                }
                // Update product's stock_quantity and updated_at
                await (0, transaction_1.transactionQuery)(transaction, `UPDATE Products SET stock_quantity = stock_quantity + @quantity, updated_at = GETDATE() WHERE id = @productId AND store_id = @storeId`, { productId: item.productId, storeId, quantity: baseQuantity });
                items.push(this.mapItemToEntity(itemRecord));
            }
            // Create supplier payment record if paid amount > 0
            if (paidAmount > 0 && input.supplierId) {
                const paymentId = crypto.randomUUID();
                await (0, transaction_1.transactionInsert)(transaction, 'SupplierPayments', {
                    id: paymentId,
                    store_id: storeId,
                    supplier_id: input.supplierId,
                    purchase_id: purchaseOrderId,
                    amount: paidAmount,
                    payment_date: new Date(input.importDate),
                    payment_method: input.paymentMethod || 'cash',
                    notes: `Thanh toán khi nhập hàng - ${orderNumber}`,
                    created_at: now,
                });
                console.log(`[PurchaseOrderRepository] Created supplier payment for purchase ${orderNumber}: ${paidAmount}`);
            }
            // Create cash transaction for the purchase (expense)
            try {
                await cash_transaction_repository_1.cashTransactionRepository.create({
                    storeId,
                    type: 'chi',
                    transactionDate: new Date(input.importDate).toISOString(),
                    amount: input.totalAmount,
                    reason: `Chi tiền nhập hàng - ${orderNumber}${input.supplierId ? ' từ nhà cung cấp' : ''}`,
                    category: 'Nhập hàng',
                    relatedInvoiceId: purchaseOrderId,
                }, storeId);
                console.log(`[PurchaseOrderRepository] Created cash transaction for purchase ${orderNumber}: ${input.totalAmount}`);
            }
            catch (cashError) {
                // Log but don't fail the purchase if cash transaction fails
                console.error('[PurchaseOrderRepository] Failed to create cash transaction:', cashError);
            }
            return { ...this.mapToEntity(orderRecord), items };
        });
    }
    async findByIdWithDetails(purchaseOrderId, storeId) {
        const orderQuery = `SELECT po.*, s.name as supplier_name FROM PurchaseOrders po LEFT JOIN Suppliers s ON po.supplier_id = s.id WHERE po.id = @purchaseOrderId AND po.store_id = @storeId`;
        const orderResult = await (0, db_1.queryOne)(orderQuery, { purchaseOrderId, storeId });
        if (!orderResult)
            return null;
        const itemsQuery = `SELECT poi.*, p.name as product_name, u.name as unit_name FROM PurchaseOrderItems poi LEFT JOIN Products p ON poi.product_id = p.id LEFT JOIN Units u ON poi.unit_id = u.id WHERE poi.purchase_order_id = @purchaseOrderId`;
        const itemsResult = await (0, db_1.query)(itemsQuery, { purchaseOrderId });
        return {
            ...this.mapToEntity(orderResult),
            supplierName: orderResult.supplier_name || undefined,
            items: itemsResult.map(item => ({ ...this.mapItemToEntity(item), productName: item.product_name || undefined, unitName: item.unit_name || undefined })),
        };
    }
    async findAllWithSupplier(storeId, options) {
        const page = options?.page || 1;
        const pageSize = options?.pageSize || 20;
        const offset = (page - 1) * pageSize;
        const conditions = ['po.store_id = @storeId'];
        const params = { storeId };
        if (options?.search) {
            conditions.push('(po.order_number LIKE @search OR po.notes LIKE @search OR s.name LIKE @search)');
            params.search = `%${options.search}%`;
        }
        if (options?.supplierId) {
            conditions.push('po.supplier_id = @supplierId');
            params.supplierId = options.supplierId;
        }
        if (options?.dateFrom) {
            conditions.push('po.import_date >= @dateFrom');
            params.dateFrom = new Date(options.dateFrom);
        }
        if (options?.dateTo) {
            conditions.push('po.import_date <= @dateTo');
            params.dateTo = new Date(options.dateTo);
        }
        const whereClause = conditions.join(' AND ');
        const countQuery = `SELECT COUNT(*) as total FROM PurchaseOrders po LEFT JOIN Suppliers s ON po.supplier_id = s.id WHERE ${whereClause}`;
        const countResult = await (0, db_1.queryOne)(countQuery, params);
        const total = countResult?.total ?? 0;
        const orderBy = options?.orderBy || 'po.updated_at';
        const direction = options?.orderDirection || 'DESC';
        const dataQuery = `SELECT po.*, ISNULL(s.name, N'[Chưa có NCC]') as supplier_name, (SELECT COUNT(*) FROM PurchaseOrderItems WHERE purchase_order_id = po.id) as item_count FROM PurchaseOrders po LEFT JOIN Suppliers s ON po.supplier_id = s.id WHERE ${whereClause} ORDER BY ${orderBy} ${direction} OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`;
        const results = await (0, db_1.query)(dataQuery, { ...params, offset, pageSize });
        // Fetch items for each purchase order
        const purchaseOrdersWithItems = await Promise.all(results.map(async (r) => {
            const itemsQuery = `SELECT poi.*, p.name as product_name, u.name as unit_name FROM PurchaseOrderItems poi LEFT JOIN Products p ON poi.product_id = p.id LEFT JOIN Units u ON poi.unit_id = u.id WHERE poi.purchase_order_id = @purchaseOrderId`;
            const items = await (0, db_1.query)(itemsQuery, { purchaseOrderId: r.id });
            return {
                ...this.mapToEntity(r),
                supplierName: r.supplier_name || undefined,
                itemCount: r.item_count,
                items: items.map(item => ({ ...this.mapItemToEntity(item), productName: item.product_name || undefined, unitName: item.unit_name || undefined }))
            };
        }));
        return { data: purchaseOrdersWithItems, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }
    async updateWithItems(purchaseOrderId, input, storeId) {
        return (0, transaction_1.withTransaction)(async (transaction) => {
            const existingOrder = await (0, transaction_1.transactionQueryOne)(transaction, `SELECT * FROM PurchaseOrders WHERE id = @purchaseOrderId AND store_id = @storeId`, { purchaseOrderId, storeId });
            if (!existingOrder)
                throw new Error('Purchase order not found or access denied');
            await (0, transaction_1.transactionQuery)(transaction, `DELETE FROM PurchaseLots WHERE purchase_order_id = @purchaseOrderId`, { purchaseOrderId });
            await (0, transaction_1.transactionQuery)(transaction, `DELETE FROM PurchaseOrderItems WHERE purchase_order_id = @purchaseOrderId`, { purchaseOrderId });
            const updateQuery = `UPDATE PurchaseOrders SET supplier_id = @supplierId, import_date = @importDate, total_amount = @totalAmount, notes = @notes, updated_at = GETDATE() OUTPUT INSERTED.* WHERE id = @purchaseOrderId AND store_id = @storeId`;
            const updatedOrder = await (0, transaction_1.transactionQueryOne)(transaction, updateQuery, { purchaseOrderId, storeId, supplierId: input.supplierId || null, importDate: new Date(input.importDate), totalAmount: input.totalAmount, notes: input.notes || null });
            if (!updatedOrder)
                throw new Error('Failed to update purchase order');
            const items = [];
            for (const item of input.items) {
                const itemId = crypto.randomUUID();
                const lotId = crypto.randomUUID();
                // Use base values if provided, otherwise use original values
                const baseQuantity = item.baseQuantity || item.quantity;
                const baseCost = item.baseCost || item.cost;
                const baseUnitId = item.baseUnitId || item.unitId;
                const itemRecord = await (0, transaction_1.transactionInsert)(transaction, 'PurchaseOrderItems', {
                    id: itemId, purchase_order_id: purchaseOrderId, product_id: item.productId,
                    quantity: item.quantity, cost: item.cost, unit_id: item.unitId,
                    base_quantity: baseQuantity, base_cost: baseCost, base_unit_id: baseUnitId,
                });
                if (!itemRecord)
                    throw new Error('Failed to create purchase order item');
                // PurchaseLots always use base unit values for inventory tracking
                await (0, transaction_1.transactionInsert)(transaction, 'PurchaseLots', {
                    id: lotId, product_id: item.productId, store_id: storeId, import_date: new Date(input.importDate),
                    quantity: baseQuantity, remaining_quantity: baseQuantity, cost: baseCost, unit_id: baseUnitId,
                    purchase_order_id: purchaseOrderId
                });
                items.push(this.mapItemToEntity(itemRecord));
            }
            return { ...this.mapToEntity(updatedOrder), items };
        });
    }
    async deleteWithItems(purchaseOrderId, storeId) {
        return (0, transaction_1.withTransaction)(async (transaction) => {
            const existingOrder = await (0, transaction_1.transactionQueryOne)(transaction, `SELECT * FROM PurchaseOrders WHERE id = @purchaseOrderId AND store_id = @storeId`, { purchaseOrderId, storeId });
            if (!existingOrder)
                throw new Error('Purchase order not found or access denied');
            // Check if any lots have been used
            const usedLots = await (0, transaction_1.transactionQueryOne)(transaction, `SELECT COUNT(*) as count FROM PurchaseLots WHERE purchase_order_id = @purchaseOrderId AND remaining_quantity < quantity`, { purchaseOrderId });
            if (usedLots && usedLots.count > 0)
                throw new Error('Cannot delete purchase order with used inventory');
            // Get all lots to update inventory
            const lots = await (0, transaction_1.transactionQuery)(transaction, `SELECT product_id, quantity, unit_id FROM PurchaseLots WHERE purchase_order_id = @purchaseOrderId`, { purchaseOrderId });
            // Update ProductInventory - subtract quantities
            for (const lot of lots) {
                await (0, transaction_1.transactionQuery)(transaction, `UPDATE ProductInventory 
           SET Quantity = Quantity - @quantity, UpdatedAt = GETDATE() 
           WHERE ProductId = @productId AND StoreId = @storeId`, { productId: lot.product_id, storeId, quantity: lot.quantity });
            }
            // Delete purchase lots
            await (0, transaction_1.transactionQuery)(transaction, `DELETE FROM PurchaseLots WHERE purchase_order_id = @purchaseOrderId`, { purchaseOrderId });
            // Delete purchase order items
            await (0, transaction_1.transactionQuery)(transaction, `DELETE FROM PurchaseOrderItems WHERE purchase_order_id = @purchaseOrderId`, { purchaseOrderId });
            // Delete purchase order
            await (0, transaction_1.transactionQuery)(transaction, `DELETE FROM PurchaseOrders WHERE id = @purchaseOrderId AND store_id = @storeId`, { purchaseOrderId, storeId });
            return true;
        });
    }
    async getItems(purchaseOrderId) {
        const queryString = `SELECT poi.*, p.name as product_name, u.name as unit_name FROM PurchaseOrderItems poi LEFT JOIN Products p ON poi.product_id = p.id LEFT JOIN Units u ON poi.unit_id = u.id WHERE poi.purchase_order_id = @purchaseOrderId`;
        const results = await (0, db_1.query)(queryString, { purchaseOrderId });
        return results.map(item => ({ ...this.mapItemToEntity(item), productName: item.product_name || undefined, unitName: item.unit_name || undefined }));
    }
    async getPurchaseLots(purchaseOrderId) {
        const queryString = `SELECT * FROM PurchaseLots WHERE purchase_order_id = @purchaseOrderId ORDER BY import_date ASC`;
        const results = await (0, db_1.query)(queryString, { purchaseOrderId });
        return results.map(r => this.mapLotToEntity(r));
    }
    async findBySupplier(supplierId, storeId, options) {
        return this.findBy('supplier_id', supplierId, storeId, options);
    }
    async getTotalAmount(storeId, dateFrom, dateTo) {
        let queryString = `SELECT COALESCE(SUM(total_amount), 0) as Total FROM PurchaseOrders WHERE store_id = @storeId`;
        const params = { storeId };
        if (dateFrom) {
            queryString += ` AND import_date >= @dateFrom`;
            params.dateFrom = new Date(dateFrom);
        }
        if (dateTo) {
            queryString += ` AND import_date <= @dateTo`;
            params.dateTo = new Date(dateTo);
        }
        const result = await (0, db_1.queryOne)(queryString, params);
        return result?.Total ?? 0;
    }
    async canDelete(purchaseOrderId, storeId) {
        const queryString = `SELECT COUNT(*) as count FROM PurchaseLots WHERE purchase_order_id = @purchaseOrderId AND store_id = @storeId AND remaining_quantity < quantity`;
        const result = await (0, db_1.queryOne)(queryString, { purchaseOrderId, storeId });
        return !result || result.count === 0;
    }
}
exports.PurchaseOrderRepository = PurchaseOrderRepository;
exports.purchaseOrderRepository = new PurchaseOrderRepository();
//# sourceMappingURL=purchase-order-repository.js.map