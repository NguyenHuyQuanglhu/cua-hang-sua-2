"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supplierPaymentRepository = exports.SupplierPaymentRepository = void 0;
const base_repository_1 = require("./base-repository");
const db_1 = require("../db");
/**
 * Supplier Payment repository for managing payments to suppliers
 * Extends BaseRepository with store-scoped CRUD operations
 */
class SupplierPaymentRepository extends base_repository_1.BaseRepository {
    constructor() {
        super('SupplierPayments', 'Id');
    }
    /**
     * Map database record to SupplierPayment entity
     */
    mapToEntity(record) {
        const r = record;
        return {
            id: r.Id,
            storeId: r.StoreId,
            supplierId: r.SupplierId,
            paymentDate: r.PaymentDate instanceof Date ? r.PaymentDate.toISOString() : String(r.PaymentDate),
            amount: r.Amount,
            notes: r.Notes || undefined,
            createdBy: r.CreatedBy || undefined,
            createdAt: r.CreatedAt instanceof Date ? r.CreatedAt.toISOString() : String(r.CreatedAt),
        };
    }
    /**
     * Map SupplierPayment entity to database record
     */
    mapToRecord(entity) {
        const record = {};
        if (entity.id !== undefined)
            record.Id = entity.id;
        if (entity.storeId !== undefined)
            record.StoreId = entity.storeId;
        if (entity.supplierId !== undefined)
            record.SupplierId = entity.supplierId;
        if (entity.paymentDate !== undefined)
            record.PaymentDate = new Date(entity.paymentDate);
        if (entity.amount !== undefined)
            record.Amount = entity.amount;
        if (entity.notes !== undefined)
            record.Notes = entity.notes || null;
        if (entity.createdBy !== undefined)
            record.CreatedBy = entity.createdBy || null;
        return record;
    }
    /**
     * Find payments by supplier
     */
    async findBySupplier(supplierId, storeId, options) {
        let queryString = `
      SELECT * FROM SupplierPayments 
      WHERE SupplierId = @supplierId AND StoreId = @storeId
    `;
        if (options?.orderBy) {
            const direction = options.orderDirection || 'DESC';
            queryString += ` ORDER BY ${options.orderBy} ${direction}`;
        }
        else {
            queryString += ` ORDER BY PaymentDate DESC`;
        }
        const results = await (0, db_1.query)(queryString, { supplierId, storeId });
        return results.map(r => this.mapToEntity(r));
    }
    /**
     * Find all payments with supplier information
     */
    async findAllWithSupplier(storeId, options) {
        const page = options?.page || 1;
        const pageSize = options?.pageSize || 20;
        const offset = (page - 1) * pageSize;
        let whereClause = 'sp.StoreId = @storeId';
        const params = { storeId };
        if (options?.supplierId) {
            whereClause += ' AND sp.SupplierId = @supplierId';
            params.supplierId = options.supplierId;
        }
        if (options?.dateFrom) {
            whereClause += ' AND sp.PaymentDate >= @dateFrom';
            params.dateFrom = new Date(options.dateFrom);
        }
        if (options?.dateTo) {
            whereClause += ' AND sp.PaymentDate <= @dateTo';
            params.dateTo = new Date(options.dateTo);
        }
        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM SupplierPayments sp WHERE ${whereClause}`;
        const countResult = await (0, db_1.queryOne)(countQuery, params);
        const total = countResult?.total ?? 0;
        // Get paginated results with supplier info
        const orderBy = options?.orderBy || 'sp.PaymentDate';
        const direction = options?.orderDirection || 'DESC';
        const dataQuery = `
      SELECT sp.*, s.Name as SupplierName, s.Phone as SupplierPhone
      FROM SupplierPayments sp
      LEFT JOIN Suppliers s ON sp.SupplierId = s.Id
      WHERE ${whereClause}
      ORDER BY ${orderBy} ${direction}
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `;
        const results = await (0, db_1.query)(dataQuery, { ...params, offset, pageSize });
        return {
            data: results.map(r => ({
                ...this.mapToEntity(r),
                supplierName: r.SupplierName,
                supplierPhone: r.SupplierPhone || undefined,
            })),
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        };
    }
    /**
     * Get total payments for a supplier
     */
    async getTotalPayments(supplierId, storeId) {
        const result = await (0, db_1.queryOne)(`SELECT ISNULL(SUM(Amount), 0) as Total 
       FROM SupplierPayments 
       WHERE SupplierId = @supplierId AND StoreId = @storeId`, { supplierId, storeId });
        return result?.Total ?? 0;
    }
    /**
     * Get payments summary by date range
     */
    async getPaymentsSummary(storeId, dateFrom, dateTo) {
        const result = await (0, db_1.queryOne)(`SELECT 
         ISNULL(SUM(Amount), 0) as TotalAmount,
         COUNT(*) as Count
       FROM SupplierPayments 
       WHERE StoreId = @storeId 
         AND PaymentDate >= @dateFrom 
         AND PaymentDate <= @dateTo`, { storeId, dateFrom: new Date(dateFrom), dateTo: new Date(dateTo) });
        return {
            totalAmount: result?.TotalAmount ?? 0,
            count: result?.Count ?? 0,
        };
    }
}
exports.SupplierPaymentRepository = SupplierPaymentRepository;
// Export singleton instance
exports.supplierPaymentRepository = new SupplierPaymentRepository();
//# sourceMappingURL=supplier-payment-repository.js.map