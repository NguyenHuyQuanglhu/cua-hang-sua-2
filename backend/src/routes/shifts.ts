import { Router, Response } from 'express';
import { query, queryOne } from '../db';
import { authenticate, storeContext, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(storeContext);

// GET /api/shifts
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    
    const shifts = await query(
      'SELECT * FROM Shifts WHERE store_id = @storeId ORDER BY start_time DESC',
      { storeId }
    );

    res.json(shifts.map((s: Record<string, unknown>) => ({
      id: s.id,
      storeId: s.store_id,
      userId: s.user_id,
      userName: s.user_name,
      status: s.status,
      startTime: s.start_time,
      endTime: s.end_time,
      startingCash: s.starting_cash,
      endingCash: s.ending_cash,
      cashSales: s.cash_sales,
      cashPayments: s.cash_payments,
      totalCashInDrawer: s.total_cash_in_drawer,
      cashDifference: s.cash_difference,
      totalRevenue: s.total_revenue,
      salesCount: s.sales_count,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    })));
  } catch (error) {
    console.error('Get shifts error:', error);
    res.status(500).json({ error: 'Failed to get shifts' });
  }
});

// GET /api/shifts/active
router.get('/active', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const userId = req.user!.id;
    
    const shift = await queryOne(
      `SELECT * FROM Shifts 
       WHERE store_id = @storeId AND user_id = @userId AND status = 'open'
       ORDER BY start_time DESC`,
      { storeId, userId }
    );

    if (!shift) {
      res.json(null);
      return;
    }

    // Calculate real-time cash sales and payments
    const salesResult = await queryOne<{
      cashSales: number;
      totalRevenue: number;
      salesCount: number;
    }>(
      `SELECT 
        ISNULL(SUM(customer_payment), 0) as cashSales,
        ISNULL(SUM(final_amount), 0) as totalRevenue,
        COUNT(*) as salesCount
       FROM Sales
       WHERE store_id = @storeId AND shift_id = @shiftId`,
      { storeId, shiftId: shift.id }
    );

    const paymentsResult = await queryOne<{ total: number }>(
      `SELECT ISNULL(SUM(amount), 0) as total
       FROM Payments
       WHERE store_id = @storeId AND payment_date >= @startTime`,
      { storeId, startTime: shift.start_time }
    );

    const cashSales = salesResult?.cashSales || 0;
    const totalRevenue = salesResult?.totalRevenue || 0;
    const salesCount = salesResult?.salesCount || 0;
    const cashPayments = paymentsResult?.total || 0;

    res.json({
      id: shift.id,
      storeId: shift.store_id,
      userId: shift.user_id,
      userName: shift.user_name,
      status: shift.status,
      startTime: shift.start_time,
      endTime: shift.end_time,
      startingCash: shift.starting_cash,
      endingCash: shift.ending_cash,
      cashSales: cashSales, // Real-time calculation
      cashPayments: cashPayments, // Real-time calculation
      totalCashInDrawer: shift.starting_cash + cashSales + cashPayments,
      cashDifference: shift.cash_difference,
      totalRevenue: totalRevenue, // Real-time calculation
      salesCount: salesCount, // Real-time calculation
    });
  } catch (error) {
    console.error('Get active shift error:', error);
    res.status(500).json({ error: 'Failed to get active shift' });
  }
});

// POST /api/shifts/start
router.post('/start', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const userId = req.user!.id;
    const userName = req.user!.displayName || req.user!.email;
    const { startingCash } = req.body;

    // Check if there's already an open shift
    const existingShift = await queryOne(
      `SELECT id FROM Shifts WHERE store_id = @storeId AND user_id = @userId AND status = 'open'`,
      { storeId, userId }
    );

    if (existingShift) {
      res.status(400).json({ error: 'Bạn đã có ca làm việc đang mở' });
      return;
    }

    // Use JavaScript Date to get current time (will be in server's timezone)
    const now = new Date();
    
    const result = await query(
      `INSERT INTO Shifts (id, store_id, user_id, user_name, status, start_time, starting_cash, created_at, updated_at)
       OUTPUT INSERTED.*
       VALUES (NEWID(), @storeId, @userId, @userName, 'open', @startTime, @startingCash, @createdAt, @updatedAt)`,
      { storeId, userId, userName, startTime: now, startingCash, createdAt: now, updatedAt: now }
    );

    const shift = result[0];
    res.status(201).json({
      id: shift.id,
      storeId: shift.store_id,
      userId: shift.user_id,
      userName: shift.user_name,
      status: shift.status,
      startTime: shift.start_time,
      startingCash: shift.starting_cash,
    });
  } catch (error) {
    console.error('Start shift error:', error);
    res.status(500).json({ error: 'Failed to start shift' });
  }
});

// POST /api/shifts/:id/close
router.post('/:id/close', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = req.storeId!;
    const { endingCash } = req.body;

    const shift = await queryOne(
      `SELECT * FROM Shifts WHERE id = @id AND store_id = @storeId`,
      { id, storeId }
    );

    if (!shift) {
      res.status(404).json({ error: 'Shift not found' });
      return;
    }

    if (shift.status === 'closed') {
      res.status(400).json({ error: 'Ca làm việc đã được đóng' });
      return;
    }

    // Calculate totals
    const salesResult = await queryOne<{
      cashSales: number;
      totalRevenue: number;
      salesCount: number;
    }>(
      `SELECT 
        ISNULL(SUM(customer_payment), 0) as cashSales,
        ISNULL(SUM(final_amount), 0) as totalRevenue,
        COUNT(*) as salesCount
       FROM Sales 
       WHERE store_id = @storeId 
         AND shift_id = @id`,
      { storeId, id }
    );

    const cashPayments = await queryOne<{ total: number }>(
      `SELECT ISNULL(SUM(amount), 0) as total
       FROM Payments 
       WHERE store_id = @storeId 
         AND created_at >= (SELECT start_time FROM Shifts WHERE id = @id)
         AND created_at <= GETDATE()`,
      { storeId, id }
    );

    const cashSales = salesResult?.cashSales || 0;
    const totalRevenue = salesResult?.totalRevenue || 0;
    const salesCount = salesResult?.salesCount || 0;
    const cashPaymentsTotal = cashPayments?.total || 0;
    const startingCash = (shift as { starting_cash?: number }).starting_cash || 0;
    const totalCashInDrawer = startingCash + cashSales + cashPaymentsTotal;
    const cashDifference = endingCash - totalCashInDrawer;

    await query(
      `UPDATE Shifts SET 
        status = 'closed',
        end_time = GETDATE(),
        ending_cash = @endingCash,
        cash_sales = @cashSales,
        cash_payments = @cashPayments,
        total_cash_in_drawer = @totalCashInDrawer,
        cash_difference = @cashDifference,
        total_revenue = @totalRevenue,
        sales_count = @salesCount,
        updated_at = GETDATE()
       WHERE id = @id`,
      { 
        id, 
        endingCash, 
        cashSales, 
        cashPayments: cashPaymentsTotal, 
        totalCashInDrawer, 
        cashDifference, 
        totalRevenue, 
        salesCount 
      }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Close shift error:', error);
    res.status(500).json({ error: 'Failed to close shift' });
  }
});

export default router;
