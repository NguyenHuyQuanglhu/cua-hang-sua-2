"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shiftRepository = exports.ShiftRepository = void 0;
const base_repository_1 = require("./base-repository");
const db_1 = require("../db");
/**
 * Shift repository for managing shift operations
 */
class ShiftRepository extends base_repository_1.BaseRepository {
    constructor() {
        super('Shifts', 'id');
    }
    /**
     * Map database record to Shift entity
     */
    mapToEntity(record) {
        const r = record;
        return {
            id: r.id,
            storeId: r.store_id,
            userId: r.user_id,
            userName: r.user_name || '',
            status: r.status || 'active',
            startTime: r.start_time instanceof Date ? r.start_time.toISOString() : String(r.start_time),
            endTime: r.end_time instanceof Date ? r.end_time.toISOString() : (r.end_time ? String(r.end_time) : undefined),
            startingCash: r.starting_cash || 0,
            endingCash: r.ending_cash ?? undefined,
            cashSales: r.cash_sales || 0,
            cashPayments: r.cash_payments || 0,
            totalCashInDrawer: r.total_cash_in_drawer ?? undefined,
            cashDifference: r.cash_difference ?? undefined,
            totalRevenue: r.total_revenue || 0,
            salesCount: r.sales_count || 0,
        };
    }
    /**
     * Map Shift entity to database record
     */
    mapToRecord(entity) {
        const record = {};
        if (entity.id !== undefined)
            record.id = entity.id;
        if (entity.storeId !== undefined)
            record.store_id = entity.storeId;
        if (entity.userId !== undefined)
            record.user_id = entity.userId;
        if (entity.userName !== undefined)
            record.user_name = entity.userName || null;
        if (entity.status !== undefined)
            record.status = entity.status;
        if (entity.startTime !== undefined)
            record.start_time = new Date(entity.startTime);
        if (entity.endTime !== undefined)
            record.end_time = entity.endTime ? new Date(entity.endTime) : null;
        if (entity.startingCash !== undefined)
            record.starting_cash = entity.startingCash;
        if (entity.endingCash !== undefined)
            record.ending_cash = entity.endingCash ?? null;
        if (entity.cashSales !== undefined)
            record.cash_sales = entity.cashSales;
        if (entity.cashPayments !== undefined)
            record.cash_payments = entity.cashPayments;
        if (entity.totalCashInDrawer !== undefined)
            record.total_cash_in_drawer = entity.totalCashInDrawer ?? null;
        if (entity.cashDifference !== undefined)
            record.cash_difference = entity.cashDifference ?? null;
        if (entity.totalRevenue !== undefined)
            record.total_revenue = entity.totalRevenue;
        if (entity.salesCount !== undefined)
            record.sales_count = entity.salesCount;
        return record;
    }
    /**
     * Get active shift for a user in a store
     */
    async getActiveShift(userId, storeId) {
        const result = await (0, db_1.queryOne)(`SELECT * FROM Shifts WHERE user_id = @userId AND store_id = @storeId AND status = 'active'`, { userId, storeId });
        return result ? this.mapToEntity(result) : null;
    }
    /**
     * Get any active shift for a store (regardless of user)
     */
    async getAnyActiveShift(storeId) {
        const result = await (0, db_1.queryOne)(`SELECT TOP 1 * FROM Shifts WHERE store_id = @storeId AND status = 'active' ORDER BY start_time DESC`, { storeId });
        return result ? this.mapToEntity(result) : null;
    }
    /**
     * Start a new shift
     */
    async startShift(input, storeId) {
        const existingShift = await this.getActiveShift(input.userId, storeId);
        if (existingShift) {
            throw new Error('Bạn đã có một ca làm việc đang hoạt động.');
        }
        const shiftId = crypto.randomUUID();
        const result = await (0, db_1.query)(`INSERT INTO Shifts (id, store_id, user_id, user_name, status, start_time, starting_cash, cash_sales, cash_payments, total_revenue, sales_count, created_at, updated_at)
       OUTPUT INSERTED.*
       VALUES (@id, @storeId, @userId, @userName, 'active', GETDATE(), @startingCash, 0, 0, 0, 0, GETDATE(), GETDATE())`, {
            id: shiftId,
            storeId,
            userId: input.userId,
            userName: input.userName,
            startingCash: input.startingCash,
        });
        if (!result || result.length === 0) {
            throw new Error('Failed to create shift');
        }
        return this.mapToEntity(result[0]);
    }
    /**
     * Close a shift with ending cash and calculate differences
     */
    async closeShift(shiftId, input, storeId) {
        // Get the shift
        const shiftResult = await (0, db_1.queryOne)(`SELECT * FROM Shifts WHERE id = @shiftId AND store_id = @storeId`, { shiftId, storeId });
        if (!shiftResult) {
            throw new Error('Không tìm thấy ca làm việc.');
        }
        if (shiftResult.status === 'closed') {
            throw new Error('Ca làm việc này đã được đóng.');
        }
        // Calculate totals from sales in this shift
        const salesSummary = await (0, db_1.queryOne)(`SELECT 
        ISNULL(SUM(final_amount), 0) as total_revenue,
        COUNT(*) as sales_count,
        ISNULL(SUM(customer_payment), 0) as cash_sales
       FROM Sales 
       WHERE shift_id = @shiftId AND store_id = @storeId`, { shiftId, storeId });
        // Calculate totals from customer payments in this shift period
        const paymentsSummary = await (0, db_1.queryOne)(`SELECT ISNULL(SUM(amount), 0) as cash_payments
       FROM Payments 
       WHERE store_id = @storeId 
         AND payment_date >= @startTime 
         AND payment_date <= GETDATE()`, { storeId, startTime: shiftResult.start_time });
        const totalRevenue = salesSummary?.total_revenue || 0;
        const salesCount = salesSummary?.sales_count || 0;
        const cashSales = salesSummary?.cash_sales || 0;
        const cashPayments = paymentsSummary?.cash_payments || 0;
        // Calculate theoretical cash in drawer
        const totalCashInDrawer = shiftResult.starting_cash + cashSales + cashPayments;
        const cashDifference = input.endingCash - totalCashInDrawer;
        // Update the shift
        const updatedResult = await (0, db_1.query)(`UPDATE Shifts 
       SET status = 'closed',
           end_time = GETDATE(),
           ending_cash = @endingCash,
           cash_sales = @cashSales,
           cash_payments = @cashPayments,
           total_cash_in_drawer = @totalCashInDrawer,
           cash_difference = @cashDifference,
           total_revenue = @totalRevenue,
           sales_count = @salesCount,
           updated_at = GETDATE()
       OUTPUT INSERTED.*
       WHERE id = @shiftId AND store_id = @storeId`, {
            shiftId,
            storeId,
            endingCash: input.endingCash,
            cashSales,
            cashPayments,
            totalCashInDrawer,
            cashDifference,
            totalRevenue,
            salesCount,
        });
        if (!updatedResult || updatedResult.length === 0) {
            throw new Error('Failed to close shift');
        }
        const shift = this.mapToEntity(updatedResult[0]);
        return {
            ...shift,
            calculatedCashInDrawer: totalCashInDrawer,
            calculatedCashDifference: cashDifference,
        };
    }
    /**
     * Get shift with calculated summary
     */
    async getShiftWithSummary(shiftId, storeId) {
        const shift = await this.findById(shiftId, storeId);
        if (!shift) {
            return null;
        }
        const salesSummary = await (0, db_1.queryOne)(`SELECT 
        ISNULL(SUM(final_amount), 0) as total_revenue,
        COUNT(*) as sales_count,
        ISNULL(SUM(customer_payment), 0) as cash_sales
       FROM Sales 
       WHERE shift_id = @shiftId AND store_id = @storeId`, { shiftId, storeId });
        const cashSales = salesSummary?.cash_sales || 0;
        const cashPayments = shift.cashPayments || 0;
        const calculatedCashInDrawer = shift.startingCash + cashSales + cashPayments;
        const calculatedCashDifference = shift.endingCash !== undefined
            ? shift.endingCash - calculatedCashInDrawer
            : 0;
        return {
            ...shift,
            totalRevenue: salesSummary?.total_revenue || shift.totalRevenue,
            salesCount: salesSummary?.sales_count || shift.salesCount,
            cashSales,
            calculatedCashInDrawer,
            calculatedCashDifference,
        };
    }
    /**
     * Get all shifts with pagination and filtering
     */
    async findAllShifts(storeId, options) {
        const page = options?.page || 1;
        const pageSize = options?.pageSize || 20;
        const offset = (page - 1) * pageSize;
        const conditions = ['store_id = @storeId'];
        const params = { storeId };
        if (options?.userId) {
            conditions.push('user_id = @userId');
            params.userId = options.userId;
        }
        if (options?.status) {
            conditions.push('status = @status');
            params.status = options.status;
        }
        if (options?.dateFrom) {
            conditions.push('start_time >= @dateFrom');
            params.dateFrom = new Date(options.dateFrom);
        }
        if (options?.dateTo) {
            conditions.push('start_time <= @dateTo');
            params.dateTo = new Date(options.dateTo);
        }
        const whereClause = conditions.join(' AND ');
        const countResult = await (0, db_1.queryOne)(`SELECT COUNT(*) as total FROM Shifts WHERE ${whereClause}`, params);
        const total = countResult?.total ?? 0;
        const orderBy = options?.orderBy || 'start_time';
        const direction = options?.orderDirection || 'DESC';
        const results = await (0, db_1.query)(`SELECT * FROM Shifts WHERE ${whereClause} ORDER BY ${orderBy} ${direction} OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`, { ...params, offset, pageSize });
        return {
            data: results.map(r => this.mapToEntity(r)),
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        };
    }
    /**
     * Update shift totals (called when a sale is made)
     */
    async updateShiftTotals(shiftId, storeId, saleAmount, customerPayment) {
        await (0, db_1.query)(`UPDATE Shifts 
       SET total_revenue = ISNULL(total_revenue, 0) + @saleAmount,
           sales_count = ISNULL(sales_count, 0) + 1,
           cash_sales = ISNULL(cash_sales, 0) + @customerPayment,
           updated_at = GETDATE()
       WHERE id = @shiftId AND store_id = @storeId AND status = 'active'`, { shiftId, storeId, saleAmount, customerPayment });
    }
    /**
     * Revert shift totals (called when a sale is deleted)
     */
    async revertShiftTotals(shiftId, storeId, saleAmount, customerPayment) {
        await (0, db_1.query)(`UPDATE Shifts 
       SET total_revenue = ISNULL(total_revenue, 0) - @saleAmount,
           sales_count = ISNULL(sales_count, 0) - 1,
           cash_sales = ISNULL(cash_sales, 0) - @customerPayment,
           updated_at = GETDATE()
       WHERE id = @shiftId AND store_id = @storeId`, { shiftId, storeId, saleAmount, customerPayment });
    }
    /**
     * Update shift with new starting/ending cash values
     */
    async updateShiftCash(shiftId, storeId, startingCash, endingCash) {
        const shift = await this.findById(shiftId, storeId);
        if (!shift) {
            throw new Error('Không tìm thấy ca làm việc.');
        }
        const totalCashInDrawer = startingCash + (shift.cashSales || 0) + (shift.cashPayments || 0);
        const cashDifference = endingCash !== undefined ? endingCash - totalCashInDrawer : null;
        const result = await (0, db_1.query)(`UPDATE Shifts 
       SET starting_cash = @startingCash,
           ending_cash = @endingCash,
           total_cash_in_drawer = @totalCashInDrawer,
           cash_difference = @cashDifference,
           updated_at = GETDATE()
       OUTPUT INSERTED.*
       WHERE id = @shiftId AND store_id = @storeId`, {
            shiftId,
            storeId,
            startingCash,
            endingCash: endingCash ?? null,
            totalCashInDrawer,
            cashDifference,
        });
        if (!result || result.length === 0) {
            throw new Error('Failed to update shift');
        }
        return this.mapToEntity(result[0]);
    }
}
exports.ShiftRepository = ShiftRepository;
// Export singleton instance
exports.shiftRepository = new ShiftRepository();
//# sourceMappingURL=shift-repository.js.map