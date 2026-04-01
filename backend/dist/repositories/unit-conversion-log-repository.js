"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unitConversionLogRepository = exports.UnitConversionLogRepository = void 0;
const base_repository_1 = require("./base-repository");
const db_1 = require("../db");
/**
 * UnitConversionLog repository for tracking conversion history
 */
class UnitConversionLogRepository extends base_repository_1.BaseRepository {
    constructor() {
        super('UnitConversionLog', 'Id');
    }
    /**
     * Map database record to UnitConversionLog entity
     */
    mapToEntity(record) {
        const r = record;
        return {
            id: r.Id,
            productId: r.ProductId,
            storeId: r.StoreId,
            salesTransactionId: r.SalesTransactionId || undefined,
            conversionDate: r.ConversionDate
                ? r.ConversionDate instanceof Date
                    ? r.ConversionDate.toISOString()
                    : String(r.ConversionDate)
                : new Date().toISOString(),
            conversionType: r.ConversionType || 'auto_deduct',
            conversionUnitChange: r.ConversionUnitChange || 0,
            baseUnitChange: r.BaseUnitChange || 0,
            beforeConversionUnitStock: r.BeforeConversionUnitStock || 0,
            beforeBaseUnitStock: r.BeforeBaseUnitStock || 0,
            afterConversionUnitStock: r.AfterConversionUnitStock || 0,
            afterBaseUnitStock: r.AfterBaseUnitStock || 0,
            notes: r.Notes || undefined,
        };
    }
    /**
     * Map UnitConversionLog entity to database record
     */
    mapToRecord(entity) {
        const record = {};
        if (entity.id !== undefined)
            record.Id = entity.id;
        if (entity.productId !== undefined)
            record.ProductId = entity.productId;
        if (entity.storeId !== undefined)
            record.StoreId = entity.storeId;
        if (entity.salesTransactionId !== undefined)
            record.SalesTransactionId = entity.salesTransactionId || null;
        if (entity.conversionType !== undefined)
            record.ConversionType = entity.conversionType;
        if (entity.conversionUnitChange !== undefined)
            record.ConversionUnitChange = entity.conversionUnitChange;
        if (entity.baseUnitChange !== undefined)
            record.BaseUnitChange = entity.baseUnitChange;
        if (entity.beforeConversionUnitStock !== undefined)
            record.BeforeConversionUnitStock = entity.beforeConversionUnitStock;
        if (entity.beforeBaseUnitStock !== undefined)
            record.BeforeBaseUnitStock = entity.beforeBaseUnitStock;
        if (entity.afterConversionUnitStock !== undefined)
            record.AfterConversionUnitStock = entity.afterConversionUnitStock;
        if (entity.afterBaseUnitStock !== undefined)
            record.AfterBaseUnitStock = entity.afterBaseUnitStock;
        if (entity.notes !== undefined)
            record.Notes = entity.notes || null;
        return record;
    }
    /**
     * Create a new conversion log entry
     */
    async create(entity, storeId) {
        const id = crypto.randomUUID();
        await (0, db_1.query)(`INSERT INTO UnitConversionLog 
       (Id, ProductId, StoreId, SalesTransactionId, ConversionDate, ConversionType,
        ConversionUnitChange, BaseUnitChange, BeforeConversionUnitStock, BeforeBaseUnitStock,
        AfterConversionUnitStock, AfterBaseUnitStock, Notes)
       VALUES (@id, @productId, @storeId, @salesTransactionId, GETDATE(), @conversionType,
               @conversionUnitChange, @baseUnitChange, @beforeConversionUnitStock, @beforeBaseUnitStock,
               @afterConversionUnitStock, @afterBaseUnitStock, @notes)`, {
            id,
            productId: entity.productId,
            storeId,
            salesTransactionId: entity.salesTransactionId || null,
            conversionType: entity.conversionType,
            conversionUnitChange: entity.conversionUnitChange,
            baseUnitChange: entity.baseUnitChange,
            beforeConversionUnitStock: entity.beforeConversionUnitStock,
            beforeBaseUnitStock: entity.beforeBaseUnitStock,
            afterConversionUnitStock: entity.afterConversionUnitStock,
            afterBaseUnitStock: entity.afterBaseUnitStock,
            notes: entity.notes || null,
        });
        const result = await (0, db_1.queryOne)(`SELECT * FROM UnitConversionLog WHERE Id = @id`, { id });
        return this.mapToEntity(result);
    }
    /**
     * Find conversion logs by product
     */
    async findByProduct(productId, storeId, limit) {
        let queryString = `
      SELECT * FROM UnitConversionLog 
      WHERE ProductId = @productId AND StoreId = @storeId
      ORDER BY ConversionDate DESC
    `;
        if (limit) {
            queryString = `
        SELECT TOP (@limit) * FROM UnitConversionLog 
        WHERE ProductId = @productId AND StoreId = @storeId
        ORDER BY ConversionDate DESC
      `;
        }
        const results = await (0, db_1.query)(queryString, {
            productId,
            storeId,
            limit: limit || 50,
        });
        return results.map((r) => this.mapToEntity(r));
    }
    /**
     * Find conversion logs by product with details
     */
    async findByProductWithDetails(productId, storeId, options) {
        const page = options?.page || 1;
        const pageSize = options?.pageSize || 50;
        const offset = (page - 1) * pageSize;
        // Get total count
        const countResult = await (0, db_1.queryOne)(`SELECT COUNT(*) as total FROM UnitConversionLog 
       WHERE ProductId = @productId AND StoreId = @storeId`, { productId, storeId });
        const total = countResult?.total ?? 0;
        // Get paginated results with details
        const results = await (0, db_1.query)(`SELECT ucl.*, 
              p.Name as ProductName,
              bu.Name as BaseUnitName,
              cu.Name as ConversionUnitName,
              s.InvoiceNumber
       FROM UnitConversionLog ucl
       LEFT JOIN Products p ON ucl.ProductId = p.Id
       LEFT JOIN ProductUnits pu ON ucl.ProductId = pu.ProductId AND ucl.StoreId = pu.StoreId
       LEFT JOIN Units bu ON pu.BaseUnitId = bu.Id
       LEFT JOIN Units cu ON pu.ConversionUnitId = cu.Id
       LEFT JOIN Sales s ON ucl.SalesTransactionId = s.Id
       WHERE ucl.ProductId = @productId AND ucl.StoreId = @storeId
       ORDER BY ucl.ConversionDate DESC
       OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`, { productId, storeId, offset, pageSize });
        return {
            data: results.map((r) => ({
                ...this.mapToEntity(r),
                productName: r.ProductName,
                baseUnitName: r.BaseUnitName,
                conversionUnitName: r.ConversionUnitName,
                salesInvoiceNumber: r.InvoiceNumber,
            })),
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        };
    }
    /**
     * Find conversion logs by sales transaction
     */
    async findBySalesTransaction(salesTransactionId) {
        const results = await (0, db_1.query)(`SELECT * FROM UnitConversionLog 
       WHERE SalesTransactionId = @salesTransactionId
       ORDER BY ConversionDate DESC`, { salesTransactionId });
        return results.map((r) => this.mapToEntity(r));
    }
    /**
     * Find all conversion logs for a store
     */
    async findAllByStore(storeId, options) {
        const page = options?.page || 1;
        const pageSize = options?.pageSize || 50;
        const offset = (page - 1) * pageSize;
        // Get total count
        const countResult = await (0, db_1.queryOne)(`SELECT COUNT(*) as total FROM UnitConversionLog WHERE StoreId = @storeId`, { storeId });
        const total = countResult?.total ?? 0;
        // Get paginated results with details
        const results = await (0, db_1.query)(`SELECT ucl.*, 
              p.Name as ProductName,
              bu.Name as BaseUnitName,
              cu.Name as ConversionUnitName,
              s.InvoiceNumber
       FROM UnitConversionLog ucl
       LEFT JOIN Products p ON ucl.ProductId = p.Id
       LEFT JOIN ProductUnits pu ON ucl.ProductId = pu.ProductId AND ucl.StoreId = pu.StoreId
       LEFT JOIN Units bu ON pu.BaseUnitId = bu.Id
       LEFT JOIN Units cu ON pu.ConversionUnitId = cu.Id
       LEFT JOIN Sales s ON ucl.SalesTransactionId = s.Id
       WHERE ucl.StoreId = @storeId
       ORDER BY ucl.ConversionDate DESC
       OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`, { storeId, offset, pageSize });
        return {
            data: results.map((r) => ({
                ...this.mapToEntity(r),
                productName: r.ProductName,
                baseUnitName: r.BaseUnitName,
                conversionUnitName: r.ConversionUnitName,
                salesInvoiceNumber: r.InvoiceNumber,
            })),
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        };
    }
    /**
     * Get conversion statistics for a product
     */
    async getConversionStats(productId, storeId, startDate, endDate) {
        let queryString = `
      SELECT 
        COUNT(*) as totalConversions,
        SUM(ConversionUnitChange) as totalConversionUnitChange,
        SUM(BaseUnitChange) as totalBaseUnitChange,
        SUM(CASE WHEN ConversionType = 'auto_deduct' THEN 1 ELSE 0 END) as autoConversions,
        SUM(CASE WHEN ConversionType = 'manual_adjust' THEN 1 ELSE 0 END) as manualAdjustments
      FROM UnitConversionLog
      WHERE ProductId = @productId AND StoreId = @storeId
    `;
        const params = { productId, storeId };
        if (startDate) {
            queryString += ` AND ConversionDate >= @startDate`;
            params.startDate = startDate;
        }
        if (endDate) {
            queryString += ` AND ConversionDate <= @endDate`;
            params.endDate = endDate;
        }
        const result = await (0, db_1.queryOne)(queryString, params);
        return {
            totalConversions: result?.totalConversions ?? 0,
            totalConversionUnitChange: result?.totalConversionUnitChange ?? 0,
            totalBaseUnitChange: result?.totalBaseUnitChange ?? 0,
            autoConversions: result?.autoConversions ?? 0,
            manualAdjustments: result?.manualAdjustments ?? 0,
        };
    }
    /**
     * Get recent conversions for a store
     */
    async getRecentConversions(storeId, limit = 10) {
        const results = await (0, db_1.query)(`SELECT TOP (@limit) ucl.*, 
              p.Name as ProductName,
              bu.Name as BaseUnitName,
              cu.Name as ConversionUnitName,
              s.InvoiceNumber
       FROM UnitConversionLog ucl
       LEFT JOIN Products p ON ucl.ProductId = p.Id
       LEFT JOIN ProductUnits pu ON ucl.ProductId = pu.ProductId AND ucl.StoreId = pu.StoreId
       LEFT JOIN Units bu ON pu.BaseUnitId = bu.Id
       LEFT JOIN Units cu ON pu.ConversionUnitId = cu.Id
       LEFT JOIN Sales s ON ucl.SalesTransactionId = s.Id
       WHERE ucl.StoreId = @storeId
       ORDER BY ucl.ConversionDate DESC`, { storeId, limit });
        return results.map((r) => ({
            ...this.mapToEntity(r),
            productName: r.ProductName,
            baseUnitName: r.BaseUnitName,
            conversionUnitName: r.ConversionUnitName,
            salesInvoiceNumber: r.InvoiceNumber,
        }));
    }
}
exports.UnitConversionLogRepository = UnitConversionLogRepository;
// Export singleton instance
exports.unitConversionLogRepository = new UnitConversionLogRepository();
//# sourceMappingURL=unit-conversion-log-repository.js.map