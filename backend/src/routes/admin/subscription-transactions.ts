/**
 * Admin Subscription Transactions Routes
 * 
 * API cho Admin và Quản lý xem lịch sử giao dịch gói dịch vụ
 * Chỉ có quyền owner, company_manager mới được truy cập
 */

import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { requireModulePermission } from '../../middleware/permission';
import { subscriptionTransactionService, type SubscriptionTransactionFilter } from '../../services/subscription-transaction-service';
import { autoRenewalService } from '../../services/auto-renewal-service';

const router = Router();

router.use(authenticate);

// GET /api/admin/subscription-transactions - Lấy danh sách giao dịch gói dịch vụ
router.get('/', requireModulePermission('users', 'view'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      userId,
      tenantId,
      transactionType,
      planId,
      paymentStatus,
      paymentMethod,
      processedByRole,
      fromDate,
      toDate,
      limit = 50,
      offset = 0,
    } = req.query;

    const filter: SubscriptionTransactionFilter = {};

    if (userId && typeof userId === 'string') filter.userId = userId;
    if (tenantId && typeof tenantId === 'string') filter.tenantId = tenantId;
    if (transactionType && typeof transactionType === 'string') {
      filter.transactionType = transactionType as any;
    }
    if (planId && typeof planId === 'string') filter.planId = planId;
    if (paymentStatus && typeof paymentStatus === 'string') {
      filter.paymentStatus = paymentStatus as any;
    }
    if (paymentMethod && typeof paymentMethod === 'string') {
      filter.paymentMethod = paymentMethod as any;
    }
    if (processedByRole && typeof processedByRole === 'string') {
      filter.processedByRole = processedByRole as any;
    }
    if (fromDate && typeof fromDate === 'string') {
      filter.fromDate = new Date(fromDate);
    }
    if (toDate && typeof toDate === 'string') {
      filter.toDate = new Date(toDate);
    }

    filter.limit = Math.min(parseInt(limit as string) || 50, 200); // Max 200 records
    filter.offset = parseInt(offset as string) || 0;

    const transactions = await subscriptionTransactionService.getTransactions(filter);

    // Lấy thông tin user cho mỗi giao dịch
    const transactionsWithUserInfo = await Promise.all(
      transactions.map(async (transaction) => {
        try {
          const userInfo = await subscriptionTransactionService.getUserInfo(transaction.userId);
          return {
            ...transaction,
            userInfo: {
              fullName: userInfo?.fullName || 'N/A',
              email: userInfo?.email || 'N/A',
              phone: userInfo?.phone || null,
            }
          };
        } catch (error) {
          console.error(`Failed to get user info for ${transaction.userId}:`, error);
          return {
            ...transaction,
            userInfo: {
              fullName: 'N/A',
              email: 'N/A',
              phone: null,
            }
          };
        }
      })
    );

    res.json({
      transactions: transactionsWithUserInfo,
      pagination: {
        limit: filter.limit,
        offset: filter.offset,
        hasMore: transactions.length === filter.limit,
      }
    });
  } catch (error) {
    console.error('Get subscription transactions error:', error);
    res.status(500).json({ error: 'Failed to get subscription transactions' });
  }
});

// GET /api/admin/subscription-transactions/stats - Lấy thống kê giao dịch
router.get('/stats', requireModulePermission('users', 'view'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      userId,
      tenantId,
      fromDate,
      toDate,
    } = req.query;

    const filter: SubscriptionTransactionFilter = {};

    if (userId && typeof userId === 'string') filter.userId = userId;
    if (tenantId && typeof tenantId === 'string') filter.tenantId = tenantId;
    if (fromDate && typeof fromDate === 'string') {
      filter.fromDate = new Date(fromDate);
    }
    if (toDate && typeof toDate === 'string') {
      filter.toDate = new Date(toDate);
    }

    const stats = await subscriptionTransactionService.getTransactionStats(filter);

    res.json(stats);
  } catch (error) {
    console.error('Get subscription transaction stats error:', error);
    res.status(500).json({ error: 'Failed to get subscription transaction stats' });
  }
});

// GET /api/admin/subscription-transactions/:id - Lấy chi tiết giao dịch
router.get('/:id', requireModulePermission('users', 'view'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const transaction = await subscriptionTransactionService.getTransactionById(id);
    
    if (!transaction) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    // Lấy thông tin user
    const userInfo = await subscriptionTransactionService.getUserInfo(transaction.userId);

    res.json({
      ...transaction,
      userInfo: {
        fullName: userInfo?.fullName || 'N/A',
        email: userInfo?.email || 'N/A',
        phone: userInfo?.phone || null,
      }
    });
  } catch (error) {
    console.error('Get subscription transaction error:', error);
    res.status(500).json({ error: 'Failed to get subscription transaction' });
  }
});

// PUT /api/admin/subscription-transactions/:id/status - Cập nhật trạng thái thanh toán
router.put('/:id/status', requireModulePermission('users', 'edit'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentStatus, transactionReference, notes } = req.body;

    if (!paymentStatus || !['pending', 'completed', 'failed', 'refunded'].includes(paymentStatus)) {
      res.status(400).json({ error: 'Invalid payment status' });
      return;
    }

    await subscriptionTransactionService.updatePaymentStatus(
      id,
      paymentStatus,
      transactionReference,
      notes
    );

    res.json({
      success: true,
      message: 'Payment status updated successfully'
    });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({ error: 'Failed to update payment status' });
  }
});

// GET /api/admin/subscription-transactions/expiring/list - Lấy danh sách gói sắp hết hạn
router.get('/expiring/list', requireModulePermission('users', 'view'), async (req: AuthRequest, res: Response) => {
  try {
    const expiringSubscriptions = await autoRenewalService.getExpiringSubscriptions();
    
    res.json({
      subscriptions: expiringSubscriptions,
      count: expiringSubscriptions.length,
    });
  } catch (error) {
    console.error('Get expiring subscriptions error:', error);
    res.status(500).json({ error: 'Failed to get expiring subscriptions' });
  }
});

// GET /api/admin/subscription-transactions/expired/list - Lấy danh sách gói đã hết hạn
router.get('/expired/list', requireModulePermission('users', 'view'), async (req: AuthRequest, res: Response) => {
  try {
    const expiredSubscriptions = await autoRenewalService.getExpiredSubscriptions();
    
    res.json({
      subscriptions: expiredSubscriptions,
      count: expiredSubscriptions.length,
    });
  } catch (error) {
    console.error('Get expired subscriptions error:', error);
    res.status(500).json({ error: 'Failed to get expired subscriptions' });
  }
});

// POST /api/admin/subscription-transactions/auto-renewal/run - Chạy quy trình tự động gia hạn (manual trigger)
router.post('/auto-renewal/run', requireModulePermission('users', 'edit'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await autoRenewalService.runAutoRenewalProcess();
    
    res.json({
      success: true,
      message: 'Auto-renewal process completed',
      result,
    });
  } catch (error) {
    console.error('Run auto-renewal process error:', error);
    res.status(500).json({ error: 'Failed to run auto-renewal process' });
  }
});

// POST /api/admin/subscription-transactions/expired/mark - Đánh dấu gói hết hạn
router.post('/expired/mark', requireModulePermission('users', 'edit'), async (req: AuthRequest, res: Response) => {
  try {
    const affectedRows = await autoRenewalService.markSubscriptionsAsExpired();
    
    res.json({
      success: true,
      message: `Marked ${affectedRows} subscriptions as expired`,
      affectedRows,
    });
  } catch (error) {
    console.error('Mark expired subscriptions error:', error);
    res.status(500).json({ error: 'Failed to mark expired subscriptions' });
  }
});

export default router;