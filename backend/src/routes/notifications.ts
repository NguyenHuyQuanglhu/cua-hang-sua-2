import { Router, Request, Response } from 'express';
import { authenticate, storeContext } from '../middleware/auth';
import * as notificationService from '../services/notification-service';
import { getConnection } from '../db/connection';

const router = Router();

router.use(authenticate);
router.use(storeContext);

// POST /api/notifications/send - Send a notification
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { email, type, data } = req.body;

    if (!email || !type) {
      return res.status(400).json({ error: 'Email and type are required' });
    }

    const validTypes = [
      'order_confirmation',
      'order_shipped',
      'order_delivered',
      'low_stock_alert',
      'payment_received',
      'refund_processed',
      'welcome_customer',
      'password_reset',
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid notification type' });
    }

    const result = await notificationService.sendEmailNotification(email, type, data);

    if (result.success) {
      res.json({ success: true, message: 'Notification sent successfully' });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// POST /api/notifications/check-low-stock - Check and send low stock alerts
router.post('/check-low-stock', async (req: Request, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const tenantId = (req as any).user?.tenantId;
    const { alertEmail } = req.body;

    if (!storeId || !tenantId) {
      return res.status(400).json({ error: 'Store context required' });
    }

    if (!alertEmail) {
      return res.status(400).json({ error: 'Alert email is required' });
    }

    const result = await notificationService.checkAndSendLowStockAlerts(
      storeId,
      tenantId,
      alertEmail
    );

    res.json({
      success: true,
      message: result.sent
        ? `Low stock alert sent for ${result.productCount} products`
        : 'No low stock products found',
      ...result,
    });
  } catch (error) {
    console.error('Check low stock error:', error);
    res.status(500).json({ error: 'Failed to check low stock' });
  }
});

// GET /api/notifications/logs - Get notification logs
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const { page = '1', pageSize = '20', type, status } = req.query;

    const pageNum = parseInt(page as string);
    const pageSizeNum = parseInt(pageSize as string);
    const offset = (pageNum - 1) * pageSizeNum;

    let whereClause = '1=1';
    const params: Record<string, any> = { offset, pageSize: pageSizeNum };

    if (type) {
      whereClause += ' AND Type = @type';
      params.type = type;
    }

    if (status) {
      whereClause += ' AND Status = @status';
      params.status = status;
    }

    const pool = await getConnection();
    const countResult = await pool.request()
      .input('type', type || null)
      .input('status', status || null)
      .query(`SELECT COUNT(*) as total FROM NotificationLogs WHERE ${whereClause}`);

    const total = countResult.recordset?.[0]?.total || 0;

    const logsResult = await pool.request()
      .input('offset', offset)
      .input('pageSize', pageSizeNum)
      .input('type', type || null)
      .input('status', status || null)
      .query(`SELECT * FROM NotificationLogs
       WHERE ${whereClause}
       ORDER BY CreatedAt DESC
       OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`);

    res.json({
      success: true,
      data: logsResult.recordset || [],
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages: Math.ceil(total / pageSizeNum),
    });
  } catch (error) {
    // Table may not exist
    res.json({
      success: true,
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    });
  }
});

export default router;
