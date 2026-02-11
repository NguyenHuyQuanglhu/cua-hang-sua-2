import cron from 'node-cron';
import { query, queryOne } from '../db';
import { shiftRepository } from '../repositories/shift-repository';

/**
 * Service tự động đóng ca làm việc khi hết thời gian
 */
export class AutoCloseShiftService {
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;

  /**
   * Khởi động service - chạy mỗi phút để kiểm tra
   */
  start() {
    if (this.cronJob) {
      console.log('⚠️  Auto-close shift service đã đang chạy');
      return;
    }

    // Chạy mỗi phút
    this.cronJob = cron.schedule('* * * * *', async () => {
      if (this.isRunning) {
        return; // Skip nếu lần trước chưa xong
      }

      this.isRunning = true;
      try {
        await this.checkAndCloseExpiredShifts();
      } catch (error) {
        console.error('❌ Lỗi khi kiểm tra ca làm việc:', error);
      } finally {
        this.isRunning = false;
      }
    });

    console.log('✅ Auto-close shift service đã khởi động');
  }

  /**
   * Dừng service
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('🛑 Auto-close shift service đã dừng');
    }
  }

  /**
   * Kiểm tra và đóng các ca đã hết thời gian
   */
  private async checkAndCloseExpiredShifts() {
    try {
      // Lấy tất cả ca đang active
      const activeShifts = await query<{
        id: string;
        store_id: string;
        user_id: string;
        user_name: string;
        start_time: Date;
        starting_cash: number;
        max_shift_hours: number;
      }>(
        `SELECT s.*, u.max_shift_hours
         FROM Shifts s
         LEFT JOIN Users u ON s.user_id = u.Id
         WHERE s.status = 'active'`
      );

      if (!activeShifts || activeShifts.length === 0) {
        return;
      }

      const now = new Date();
      let closedCount = 0;

      for (const shift of activeShifts) {
        const maxShiftHours = shift.max_shift_hours || 8.0;
        const startTime = new Date(shift.start_time);
        const hoursWorked = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);

        // Nếu đã vượt quá thời gian cho phép
        if (hoursWorked >= maxShiftHours) {
          try {
            await this.autoCloseShift(shift.id, shift.store_id, shift.starting_cash);
            closedCount++;
            console.log(
              `✅ Đã tự động đóng ca cho ${shift.user_name} (${hoursWorked.toFixed(2)}/${maxShiftHours} giờ)`
            );
          } catch (error) {
            console.error(`❌ Lỗi khi đóng ca ${shift.id}:`, error);
          }
        }
      }

      if (closedCount > 0) {
        console.log(`📊 Đã tự động đóng ${closedCount} ca làm việc`);
      }
    } catch (error) {
      console.error('❌ Lỗi khi kiểm tra ca làm việc:', error);
      throw error;
    }
  }

  /**
   * Tự động đóng ca
   */
  private async autoCloseShift(shiftId: string, storeId: string, startingCash: number) {
    // Tính toán doanh thu và tiền mặt
    const salesSummary = await queryOne<{
      total_revenue: number;
      sales_count: number;
      cash_sales: number;
    }>(
      `SELECT 
        ISNULL(SUM(final_amount), 0) as total_revenue,
        COUNT(*) as sales_count,
        ISNULL(SUM(customer_payment), 0) as cash_sales
       FROM Sales 
       WHERE shift_id = @shiftId AND store_id = @storeId`,
      { shiftId, storeId }
    );

    const shiftRecord = await queryOne<{ start_time: Date }>(
      `SELECT start_time FROM Shifts WHERE id = @shiftId`,
      { shiftId }
    );

    const paymentsSummary = await queryOne<{ cash_payments: number }>(
      `SELECT ISNULL(SUM(amount), 0) as cash_payments
       FROM Payments 
       WHERE store_id = @storeId 
         AND payment_date >= @startTime 
         AND payment_date <= GETDATE()`,
      { storeId, startTime: shiftRecord?.start_time }
    );

    const totalRevenue = salesSummary?.total_revenue || 0;
    const salesCount = salesSummary?.sales_count || 0;
    const cashSales = salesSummary?.cash_sales || 0;
    const cashPayments = paymentsSummary?.cash_payments || 0;
    const totalCashInDrawer = startingCash + cashSales + cashPayments;

    // Đóng ca với ending_cash = calculated cash (không có chênh lệch)
    await query(
      `UPDATE Shifts 
       SET status = 'closed',
           end_time = GETDATE(),
           ending_cash = @endingCash,
           cash_sales = @cashSales,
           cash_payments = @cashPayments,
           total_cash_in_drawer = @totalCashInDrawer,
           cash_difference = 0,
           total_revenue = @totalRevenue,
           sales_count = @salesCount,
           updated_at = GETDATE(),
           notes = CONCAT(ISNULL(notes, ''), ' [Tự động đóng ca khi hết thời gian]')
       WHERE id = @shiftId AND store_id = @storeId`,
      {
        shiftId,
        storeId,
        endingCash: totalCashInDrawer,
        cashSales,
        cashPayments,
        totalCashInDrawer,
        totalRevenue,
        salesCount,
      }
    );
  }
}

// Export singleton instance
export const autoCloseShiftService = new AutoCloseShiftService();
