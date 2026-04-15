import { BaseRepository, PaginationOptions, PaginatedResult } from './base-repository';
import { query, queryOne, SqlValue, QueryParams } from '../db';

/**
 * Shift entity interface
 */
export interface Shift {
  id: string;
  storeId: string;
  userId: string;
  userName: string;
  status: 'active' | 'closed';
  startTime: string;
  endTime?: string;
  startingCash: number;
  endingCash?: number;
  cashSales: number;
  cashPayments: number;
  totalCashInDrawer?: number;
  cashDifference?: number;
  totalRevenue: number;
  salesCount: number;
  notes?: string;
}

/**
 * Shift with summary info
 */
export interface ShiftWithSummary extends Shift {
  calculatedCashInDrawer: number;
  calculatedCashDifference: number;
}

/**
 * Input for creating a shift
 */
export interface CreateShiftInput {
  userId: string;
  userName: string;
  startingCash: number;
}

/**
 * Input for closing a shift
 */
export interface CloseShiftInput {
  endingCash: number;
}

/**
 * Database record interface (snake_case to match database schema)
 */
interface ShiftRecord {
  id: string;
  store_id: string;
  user_id: string;
  user_name: string | null;
  status: string;
  start_time: Date;
  end_time: Date | null;
  starting_cash: number;
  ending_cash: number | null;
  cash_sales: number;
  cash_payments: number;
  total_cash_in_drawer: number | null;
  cash_difference: number | null;
  total_revenue: number;
  sales_count: number;
  notes: string | null;
  [key: string]: SqlValue;
}

/**
 * Shift repository for managing shift operations
 */
export class ShiftRepository extends BaseRepository<Shift> {
  constructor() {
    super('Shifts', 'id');
  }

  /**
   * Map database record to Shift entity
   */
  protected mapToEntity(record: Record<string, unknown>): Shift {
    const r = record as unknown as ShiftRecord;
    return {
      id: r.id,
      storeId: r.store_id,
      userId: r.user_id,
      userName: r.user_name || '',
      status: (r.status as 'active' | 'closed') || 'active',
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
  protected mapToRecord(entity: Partial<Shift>): Record<string, SqlValue> {
    const record: Record<string, SqlValue> = {};
    
    if (entity.id !== undefined) record.id = entity.id;
    if (entity.storeId !== undefined) record.store_id = entity.storeId;
    if (entity.userId !== undefined) record.user_id = entity.userId;
    if (entity.userName !== undefined) record.user_name = entity.userName || null;
    if (entity.status !== undefined) record.status = entity.status;
    if (entity.startTime !== undefined) record.start_time = new Date(entity.startTime);
    if (entity.endTime !== undefined) record.end_time = entity.endTime ? new Date(entity.endTime) : null;
    if (entity.startingCash !== undefined) record.starting_cash = entity.startingCash;
    if (entity.endingCash !== undefined) record.ending_cash = entity.endingCash ?? null;
    if (entity.cashSales !== undefined) record.cash_sales = entity.cashSales;
    if (entity.cashPayments !== undefined) record.cash_payments = entity.cashPayments;
    if (entity.totalCashInDrawer !== undefined) record.total_cash_in_drawer = entity.totalCashInDrawer ?? null;
    if (entity.cashDifference !== undefined) record.cash_difference = entity.cashDifference ?? null;
    if (entity.totalRevenue !== undefined) record.total_revenue = entity.totalRevenue;
    if (entity.salesCount !== undefined) record.sales_count = entity.salesCount;
    
    return record;
  }

  /**
   * Get active shift for a user in a store
   */
  async getActiveShift(userId: string, storeId: string): Promise<Shift | null> {
    const result = await queryOne<ShiftRecord>(
      `SELECT * FROM Shifts WHERE user_id = @userId AND store_id = @storeId AND status = 'active'`,
      { userId, storeId }
    );
    return result ? this.mapToEntity(result as unknown as Record<string, unknown>) : null;
  }

  /**
   * Get any active shift for a store (regardless of user)
   */
  async getAnyActiveShift(storeId: string): Promise<Shift | null> {
    const result = await queryOne<ShiftRecord>(
      `SELECT TOP 1 * FROM Shifts WHERE store_id = @storeId AND status = 'active' ORDER BY start_time DESC`,
      { storeId }
    );
    return result ? this.mapToEntity(result as unknown as Record<string, unknown>) : null;
  }

  /**
   * Start a new shift
   */
  async startShift(input: CreateShiftInput, storeId: string): Promise<Shift> {
    const existingShift = await this.getActiveShift(input.userId, storeId);
    if (existingShift) {
      throw new Error('Bạn đã có một ca làm việc đang hoạt động.');
    }

    const shiftId = crypto.randomUUID();

    const result = await query<ShiftRecord>(
      `INSERT INTO Shifts (id, store_id, user_id, user_name, status, start_time, starting_cash, cash_sales, cash_payments, total_revenue, sales_count, created_at, updated_at)
       OUTPUT INSERTED.*
       VALUES (@id, @storeId, @userId, @userName, 'active', GETDATE(), @startingCash, 0, 0, 0, 0, GETDATE(), GETDATE())`,
      {
        id: shiftId,
        storeId,
        userId: input.userId,
        userName: input.userName,
        startingCash: input.startingCash,
      }
    );

    if (!result || result.length === 0) {
      throw new Error('Failed to create shift');
    }

    return this.mapToEntity(result[0] as unknown as Record<string, unknown>);
  }

  /**
   * Close a shift with ending cash and calculate differences
   */
  async closeShift(shiftId: string, input: CloseShiftInput, storeId: string): Promise<ShiftWithSummary> {
    // Get the shift
    const shiftResult = await queryOne<ShiftRecord>(
      `SELECT * FROM Shifts WHERE id = @shiftId AND store_id = @storeId`,
      { shiftId, storeId }
    );

    if (!shiftResult) {
      throw new Error('Không tìm thấy ca làm việc.');
    }

    if (shiftResult.status === 'closed') {
      throw new Error('Ca làm việc này đã được đóng.');
    }

    // Calculate totals from sales in this shift
    const salesSummary = await queryOne<{ total_revenue: number; sales_count: number; cash_sales: number }>(
      `SELECT 
        ISNULL(SUM(final_amount), 0) as total_revenue,
        COUNT(*) as sales_count,
        ISNULL(SUM(customer_payment), 0) as cash_sales
       FROM Sales 
       WHERE shift_id = @shiftId AND store_id = @storeId`,
      { shiftId, storeId }
    );

    // Calculate totals from customer payments in this shift period
    const paymentsSummary = await queryOne<{ cash_payments: number }>(
      `SELECT ISNULL(SUM(amount), 0) as cash_payments
       FROM Payments 
       WHERE store_id = @storeId 
         AND payment_date >= @startTime 
         AND payment_date <= GETDATE()`,
      { storeId, startTime: shiftResult.start_time }
    );

    const totalRevenue = salesSummary?.total_revenue || 0;
    const salesCount = salesSummary?.sales_count || 0;
    const cashSales = salesSummary?.cash_sales || 0;
    const cashPayments = paymentsSummary?.cash_payments || 0;

    // Calculate theoretical cash in drawer
    const totalCashInDrawer = shiftResult.starting_cash + cashSales + cashPayments;
    const cashDifference = input.endingCash - totalCashInDrawer;

    // Update the shift
    const updatedResult = await query<ShiftRecord>(
      `UPDATE Shifts 
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
       WHERE id = @shiftId AND store_id = @storeId`,
      {
        shiftId,
        storeId,
        endingCash: input.endingCash,
        cashSales,
        cashPayments,
        totalCashInDrawer,
        cashDifference,
        totalRevenue,
        salesCount,
      }
    );

    if (!updatedResult || updatedResult.length === 0) {
      throw new Error('Failed to close shift');
    }

    const shift = this.mapToEntity(updatedResult[0] as unknown as Record<string, unknown>);

    return {
      ...shift,
      calculatedCashInDrawer: totalCashInDrawer,
      calculatedCashDifference: cashDifference,
    };
  }

  /**
   * Get shift with calculated summary
   */
  async getShiftWithSummary(shiftId: string, storeId: string): Promise<ShiftWithSummary | null> {
    const shift = await this.findById(shiftId, storeId);
    if (!shift) {
      return null;
    }

    const salesSummary = await queryOne<{ total_revenue: number; sales_count: number; cash_sales: number }>(
      `SELECT 
        ISNULL(SUM(final_amount), 0) as total_revenue,
        COUNT(*) as sales_count,
        ISNULL(SUM(customer_payment), 0) as cash_sales
       FROM Sales 
       WHERE shift_id = @shiftId AND store_id = @storeId`,
      { shiftId, storeId }
    );

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
  async findAllShifts(
    storeId: string,
    options?: PaginationOptions & {
      userId?: string;
      status?: 'active' | 'closed';
      dateFrom?: string;
      dateTo?: string;
    }
  ): Promise<PaginatedResult<Shift>> {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const conditions: string[] = ['store_id = @storeId'];
    const params: QueryParams = { storeId };

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

    const countResult = await queryOne<{ total: number }>(
      `SELECT COUNT(*) as total FROM Shifts WHERE ${whereClause}`,
      params
    );
    const total = countResult?.total ?? 0;

    const orderBy = options?.orderBy || 'start_time';
    const direction = options?.orderDirection || 'DESC';

    const results = await query<ShiftRecord>(
      `SELECT * FROM Shifts WHERE ${whereClause} ORDER BY ${orderBy} ${direction} OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`,
      { ...params, offset, pageSize }
    );

    return {
      data: results.map(r => this.mapToEntity(r as unknown as Record<string, unknown>)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Update shift totals (called when a sale is made)
   */
  async updateShiftTotals(
    shiftId: string,
    storeId: string,
    saleAmount: number,
    customerPayment: number
  ): Promise<void> {
    await query(
      `UPDATE Shifts 
       SET total_revenue = ISNULL(total_revenue, 0) + @saleAmount,
           sales_count = ISNULL(sales_count, 0) + 1,
           cash_sales = ISNULL(cash_sales, 0) + @customerPayment,
           updated_at = GETDATE()
       WHERE id = @shiftId AND store_id = @storeId AND status = 'active'`,
      { shiftId, storeId, saleAmount, customerPayment }
    );
  }

  /**
   * Revert shift totals (called when a sale is deleted)
   */
  async revertShiftTotals(
    shiftId: string,
    storeId: string,
    saleAmount: number,
    customerPayment: number
  ): Promise<void> {
    await query(
      `UPDATE Shifts 
       SET total_revenue = ISNULL(total_revenue, 0) - @saleAmount,
           sales_count = ISNULL(sales_count, 0) - 1,
           cash_sales = ISNULL(cash_sales, 0) - @customerPayment,
           updated_at = GETDATE()
       WHERE id = @shiftId AND store_id = @storeId`,
      { shiftId, storeId, saleAmount, customerPayment }
    );
  }

  /**
   * Update shift with new starting/ending cash values
   */
  async updateShiftCash(
    shiftId: string,
    storeId: string,
    startingCash: number,
    endingCash?: number
  ): Promise<Shift> {
    const shift = await this.findById(shiftId, storeId);
    if (!shift) {
      throw new Error('Không tìm thấy ca làm việc.');
    }

    const totalCashInDrawer = startingCash + (shift.cashSales || 0) + (shift.cashPayments || 0);
    const cashDifference = endingCash !== undefined ? endingCash - totalCashInDrawer : null;

    const result = await query<ShiftRecord>(
      `UPDATE Shifts 
       SET starting_cash = @startingCash,
           ending_cash = @endingCash,
           total_cash_in_drawer = @totalCashInDrawer,
           cash_difference = @cashDifference,
           updated_at = GETDATE()
       OUTPUT INSERTED.*
       WHERE id = @shiftId AND store_id = @storeId`,
      {
        shiftId,
        storeId,
        startingCash,
        endingCash: endingCash ?? null,
        totalCashInDrawer,
        cashDifference,
      }
    );

    if (!result || result.length === 0) {
      throw new Error('Failed to update shift');
    }

    return this.mapToEntity(result[0] as unknown as Record<string, unknown>);
  }
}

// Export singleton instance
export const shiftRepository = new ShiftRepository();
