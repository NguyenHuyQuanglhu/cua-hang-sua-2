"use strict";
/**
 * Sales SP Repository
 *
 * Repository for sales operations using stored procedures.
 * Implements CRUD operations via sp_Sales_* stored procedures.
 * Requirements: 2.1-2.5
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.salesSPRepository = exports.SalesSPRepository = void 0;
const sp_base_repository_1 = require("./sp-base-repository");
/**
 * Sales repository using stored procedures
 */
class SalesSPRepository extends sp_base_repository_1.SPBaseRepository {
    tableName = 'Sales';
    /**
     * Map database record to Sale entity
     */
    mapToSaleEntity(record) {
        return {
            id: record.id,
            storeId: record.storeId,
            invoiceNumber: record.invoiceNumber,
            customerId: record.customerId || undefined,
            shiftId: record.shiftId || undefined,
            transactionDate: record.transactionDate
                ? record.transactionDate instanceof Date
                    ? record.transactionDate.toISOString()
                    : String(record.transactionDate)
                : new Date().toISOString(),
            status: record.status || 'pending',
            totalAmount: record.totalAmount || 0,
            vatAmount: record.vatAmount || 0,
            finalAmount: record.finalAmount || 0,
            discount: record.discount || 0,
            discountType: record.discountType || undefined,
            discountValue: record.discountValue ?? undefined,
            tierDiscountPercentage: record.tierDiscountPercentage ?? undefined,
            tierDiscountAmount: record.tierDiscountAmount ?? undefined,
            pointsUsed: record.pointsUsed || 0,
            pointsDiscount: record.pointsDiscount || 0,
            customerPayment: record.customerPayment ?? undefined,
            previousDebt: record.previousDebt ?? undefined,
            remainingDebt: record.remainingDebt ?? undefined,
            createdAt: record.createdAt
                ? record.createdAt instanceof Date
                    ? record.createdAt.toISOString()
                    : String(record.createdAt)
                : undefined,
            updatedAt: record.updatedAt
                ? record.updatedAt instanceof Date
                    ? record.updatedAt.toISOString()
                    : String(record.updatedAt)
                : undefined,
            customerName: record.customerName,
            itemCount: record.itemCount,
        };
    }
    /**
     * Map database record to SalesItem entity
     */
    mapToSalesItemEntity(record) {
        return {
            id: record.id,
            salesTransactionId: record.salesTransactionId,
            productId: record.productId,
            quantity: record.quantity,
            price: record.price,
            unitId: record.unitId || undefined,
            productName: record.productName,
            unitName: record.unitName,
        };
    }
    /**
     * Create a new sale using sp_Sales_Create
     * Requirements: 2.1
     *
     * @param input - Sale data to create
     * @returns Created sale with ID and invoice number
     */
    async create(input) {
        const id = input.id || crypto.randomUUID();
        const invoiceNumber = input.invoiceNumber || `INV-${Date.now().toString(36).toUpperCase()}`;
        const params = {
            id,
            storeId: input.storeId,
            invoiceNumber,
            customerId: input.customerId || null,
            shiftId: input.shiftId || null,
            totalAmount: input.totalAmount,
            vatAmount: input.vatAmount ?? 0,
            finalAmount: input.finalAmount,
            discount: input.discount ?? 0,
            discountType: input.discountType || null,
            discountValue: input.discountValue ?? null,
            tierDiscountPercentage: input.tierDiscountPercentage ?? null,
            tierDiscountAmount: input.tierDiscountAmount ?? null,
            pointsUsed: input.pointsUsed ?? 0,
            pointsDiscount: input.pointsDiscount ?? 0,
            customerPayment: input.customerPayment ?? 0,
            previousDebt: input.previousDebt ?? 0,
            remainingDebt: input.remainingDebt ?? 0,
            status: input.status || 'pending',
        };
        const result = await this.executeSPSingle('sp_Sales_Create', params);
        return {
            id: result?.Id || id,
            invoiceNumber: result?.InvoiceNumber || invoiceNumber,
        };
    }
    /**
     * Create a sales item using sp_SalesItems_Create
     * This also deducts inventory automatically
     * Requirements: 2.1, 2.5
     *
     * @param input - Sales item data to create
     * @returns Created sales item ID
     */
    async createItem(input) {
        const id = input.id || crypto.randomUUID();
        const params = {
            id,
            salesTransactionId: input.salesTransactionId,
            productId: input.productId,
            quantity: input.quantity,
            price: input.price,
            unitId: input.unitId,
        };
        const result = await this.executeSPSingle('sp_SalesItems_Create', params);
        return result?.Id || id;
    }
    /**
     * Create a sale with items in a single transaction
     * Requirements: 2.1, 2.5
     *
     * @param saleInput - Sale data
     * @param items - Array of sales items
     * @returns Created sale with items
     */
    async createWithItems(saleInput, items) {
        return this.withSPTransaction(async (helpers) => {
            const id = saleInput.id || crypto.randomUUID();
            const invoiceNumber = saleInput.invoiceNumber || `INV-${Date.now().toString(36).toUpperCase()}`;
            // Create sale
            await helpers.executeSP('sp_Sales_Create', {
                id,
                storeId: saleInput.storeId,
                invoiceNumber,
                customerId: saleInput.customerId || null,
                shiftId: saleInput.shiftId || null,
                totalAmount: saleInput.totalAmount,
                vatAmount: saleInput.vatAmount ?? 0,
                finalAmount: saleInput.finalAmount,
                discount: saleInput.discount ?? 0,
                discountType: saleInput.discountType || null,
                discountValue: saleInput.discountValue ?? null,
                tierDiscountPercentage: saleInput.tierDiscountPercentage ?? null,
                tierDiscountAmount: saleInput.tierDiscountAmount ?? null,
                pointsUsed: saleInput.pointsUsed ?? 0,
                pointsDiscount: saleInput.pointsDiscount ?? 0,
                customerPayment: saleInput.customerPayment ?? 0,
                previousDebt: saleInput.previousDebt ?? 0,
                remainingDebt: saleInput.remainingDebt ?? 0,
                status: saleInput.status || 'pending',
            });
            // Create items
            for (const item of items) {
                const itemId = crypto.randomUUID();
                await helpers.executeSP('sp_SalesItems_Create', {
                    id: itemId,
                    salesTransactionId: id,
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price,
                    unitId: item.unitId,
                });
            }
            // Fetch and return the created sale with items
            const result = await this.getById(id, saleInput.storeId);
            if (!result) {
                throw new Error('Failed to create sale');
            }
            return result;
        });
    }
    /**
     * Get a sale by ID with items using sp_Sales_GetById
     * Returns multiple result sets: sale and items
     * Requirements: 2.2
     *
     * @param id - Sale ID
     * @param storeId - Store ID
     * @returns Sale with items or null if not found
     */
    async getById(id, storeId) {
        const result = await this.executeSPMultiple('sp_Sales_GetById', { id, storeId });
        // First recordset is the sale, second is the items
        const saleRecords = result.recordsets[0];
        const itemRecords = (result.recordsets[1] || []);
        if (!saleRecords || saleRecords.length === 0) {
            return null;
        }
        return {
            sale: this.mapToSaleEntity(saleRecords[0]),
            items: itemRecords.map((r) => this.mapToSalesItemEntity(r)),
        };
    }
    /**
     * Get sales for a store using sp_Sales_GetByStore
     * Requirements: 2.3
     *
     * @param storeId - Store ID
     * @param filters - Optional filters (date range, customer, status)
     * @returns Array of sales with customer names
     */
    async getByStore(storeId, filters) {
        const params = {
            storeId,
            startDate: filters?.startDate || null,
            endDate: filters?.endDate || null,
            customerId: filters?.customerId || null,
            status: filters?.status || null,
            page: 1,
            pageSize: 10000, // Get all records, pagination is done in the route
        };
        // SP returns 2 recordsets: [0] = total count, [1] = sales data
        const result = await this.executeSPMultiple('sp_Sales_GetByStore', params);
        // Get sales from second recordset (index 1)
        const salesRecords = (result.recordsets[1] || []);
        return salesRecords.map((r) => this.mapToSaleEntity(r));
    }
    /**
     * Update sale status using sp_Sales_UpdateStatus
     * Requirements: 2.4
     *
     * @param id - Sale ID
     * @param storeId - Store ID
     * @param status - New status
     * @returns True if updated, false if not found
     */
    async updateStatus(id, storeId, status) {
        const result = await this.executeSPSingle('sp_Sales_UpdateStatus', { id, storeId, status });
        return (result?.AffectedRows ?? 0) > 0;
    }
    /**
     * Get sales by date range
     * Convenience method using getByStore with date filters
     *
     * @param storeId - Store ID
     * @param startDate - Start date
     * @param endDate - End date
     * @returns Array of sales
     */
    async getByDateRange(storeId, startDate, endDate) {
        return this.getByStore(storeId, { startDate, endDate });
    }
    /**
     * Get sales by customer
     * Convenience method using getByStore with customer filter
     *
     * @param storeId - Store ID
     * @param customerId - Customer ID
     * @returns Array of sales
     */
    async getByCustomer(storeId, customerId) {
        return this.getByStore(storeId, { customerId });
    }
}
exports.SalesSPRepository = SalesSPRepository;
// Export singleton instance
exports.salesSPRepository = new SalesSPRepository();
//# sourceMappingURL=sales-sp-repository.js.map