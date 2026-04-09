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
import { query, queryOne } from '../../db';

const router = Router();

router.use(authenticate);

type SubscriptionTransactionRecord = Awaited<ReturnType<typeof subscriptionTransactionService.getTransactions>>[number];

interface TransactionPersonInfo {
  fullName: string;
  email: string;
  phone: string | null;
}

const DELETED_OR_INACTIVE_USER_LABEL = 'Người dùng đã bị xóa hoặc không hoạt động';
const UNKNOWN_USER_LABEL = 'Người dùng không xác định';

function normalizeDisplayLabel(rawValue: string, fallbackLabel: string): string {
  const normalized = String(rawValue || '').trim();
  if (!normalized) {
    return '';
  }

  return /^ID:\s*[A-F0-9]{8}$/i.test(normalized) ? fallbackLabel : normalized;
}

function extractMetadataPerson(
  metadata: Record<string, any> | undefined,
  key: 'assignedBy' | 'assignedTo'
): { fullName?: string; email?: string } {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }

  const rawPerson = metadata[key];
  if (!rawPerson || typeof rawPerson !== 'object') {
    return {};
  }

  const person = rawPerson as Record<string, unknown>;
  const fullName = typeof person.fullName === 'string' ? person.fullName.trim() : '';
  const email = typeof person.email === 'string' ? person.email.trim() : '';

  return {
    fullName: fullName || undefined,
    email: email || undefined,
  };
}

async function enrichTransactionWithActors(
  transaction: SubscriptionTransactionRecord
): Promise<SubscriptionTransactionRecord & { userInfo: TransactionPersonInfo; processedByInfo: TransactionPersonInfo }> {
  const assignedBySnapshot = extractMetadataPerson(transaction.metadata, 'assignedBy');
  const assignedToSnapshot = extractMetadataPerson(transaction.metadata, 'assignedTo');

  const fallbackUserLabel = transaction.userId
    ? DELETED_OR_INACTIVE_USER_LABEL
    : UNKNOWN_USER_LABEL;

  const fallbackUserName =
    normalizeDisplayLabel(
      String(transaction.userNameSnapshot || assignedToSnapshot.fullName || ''),
      DELETED_OR_INACTIVE_USER_LABEL
    ) || fallbackUserLabel;
  const fallbackUserEmail = String(
    transaction.userEmailSnapshot || assignedToSnapshot.email || ''
  ).trim() || '-';

  let userInfo: TransactionPersonInfo = {
    fullName: fallbackUserName,
    email: fallbackUserEmail,
    phone: null,
  };

  if (transaction.userId) {
    try {
      const resolvedUserInfo = await subscriptionTransactionService.getUserInfo(transaction.userId);
      if (resolvedUserInfo) {
        userInfo = {
          fullName: resolvedUserInfo.fullName || fallbackUserName,
          email: resolvedUserInfo.email || fallbackUserEmail,
          phone: resolvedUserInfo.phone || null,
        };
      }
    } catch (error) {
      console.error(`Failed to get user info for ${transaction.userId}:`, error);
    }
  }

  const hasProcessedBy = Boolean(transaction.processedBy && String(transaction.processedBy).trim());
  const processedById = hasProcessedBy ? String(transaction.processedBy).trim() : '';
  const processedByFallbackLabel = hasProcessedBy
    ? DELETED_OR_INACTIVE_USER_LABEL
    : (transaction.processedByRole === 'system' ? 'He thong' : 'Quan tri vien');

  const fallbackProcessedByName =
    normalizeDisplayLabel(
      String(transaction.processedByName || assignedBySnapshot.fullName || ''),
      DELETED_OR_INACTIVE_USER_LABEL
    ) || processedByFallbackLabel;
  const fallbackProcessedByEmail = String(
    transaction.processedByEmail || assignedBySnapshot.email || ''
  ).trim() || '-';

  let processedByInfo: TransactionPersonInfo = {
    fullName: fallbackProcessedByName,
    email: fallbackProcessedByEmail,
    phone: null,
  };

  if (hasProcessedBy) {
    try {
      const resolvedProcessedByInfo = await subscriptionTransactionService.getUserInfo(processedById);
      if (resolvedProcessedByInfo) {
        processedByInfo = {
          fullName: resolvedProcessedByInfo.fullName || fallbackProcessedByName,
          email: resolvedProcessedByInfo.email || fallbackProcessedByEmail,
          phone: resolvedProcessedByInfo.phone || null,
        };
      }
    } catch (error) {
      console.error(`Failed to get processedBy info for ${processedById}:`, error);
    }
  }

  return {
    ...transaction,
    userInfo,
    processedByInfo,
  };
}

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

    let transactions: Awaited<ReturnType<typeof subscriptionTransactionService.getTransactions>> = [];
    try {
      transactions = await subscriptionTransactionService.getTransactions(filter);
    } catch (transactionQueryError) {
      console.warn('Primary query SubscriptionTransactions failed, fallback to SubscriptionHistory:', transactionQueryError);
      transactions = [];
    }

    try {
      const historyColumns = await queryOne<{
        hasProcessedBy: number;
        hasProcessedByName: number;
        hasProcessedByEmail: number;
        hasCreatedBy: number;
        hasCreatedByName: number;
        hasCreatedByEmail: number;
        hasMetadata: number;
      }>(`
        SELECT
          CASE WHEN COL_LENGTH('SubscriptionHistory', 'processed_by') IS NOT NULL THEN 1 ELSE 0 END AS hasProcessedBy,
          CASE WHEN COL_LENGTH('SubscriptionHistory', 'processed_by_name') IS NOT NULL THEN 1 ELSE 0 END AS hasProcessedByName,
          CASE WHEN COL_LENGTH('SubscriptionHistory', 'processed_by_email') IS NOT NULL THEN 1 ELSE 0 END AS hasProcessedByEmail,
          CASE WHEN COL_LENGTH('SubscriptionHistory', 'created_by') IS NOT NULL THEN 1 ELSE 0 END AS hasCreatedBy,
          CASE WHEN COL_LENGTH('SubscriptionHistory', 'created_by_name') IS NOT NULL THEN 1 ELSE 0 END AS hasCreatedByName,
          CASE WHEN COL_LENGTH('SubscriptionHistory', 'created_by_email') IS NOT NULL THEN 1 ELSE 0 END AS hasCreatedByEmail,
          CASE WHEN COL_LENGTH('SubscriptionHistory', 'metadata') IS NOT NULL THEN 1 ELSE 0 END AS hasMetadata
      `);

      const processedBySelect = (historyColumns?.hasProcessedBy || 0) === 1
        ? 'h.processed_by AS processed_by'
        : (historyColumns?.hasCreatedBy || 0) === 1
          ? 'h.created_by AS processed_by'
          : 'CAST(NULL AS NVARCHAR(36)) AS processed_by';

      const processedByNameSelect = (historyColumns?.hasProcessedByName || 0) === 1
        ? 'h.processed_by_name AS processed_by_name'
        : (historyColumns?.hasCreatedByName || 0) === 1
          ? 'h.created_by_name AS processed_by_name'
          : 'CAST(NULL AS NVARCHAR(255)) AS processed_by_name';

      const processedByEmailSelect = (historyColumns?.hasProcessedByEmail || 0) === 1
        ? 'h.processed_by_email AS processed_by_email'
        : (historyColumns?.hasCreatedByEmail || 0) === 1
          ? 'h.created_by_email AS processed_by_email'
          : 'CAST(NULL AS NVARCHAR(255)) AS processed_by_email';

      const metadataSelect = (historyColumns?.hasMetadata || 0) === 1
        ? 'h.metadata AS metadata'
        : 'CAST(NULL AS NVARCHAR(MAX)) AS metadata';

      const fallbackRows = await query(
        `SELECT TOP (@limit)
           h.id,
           h.user_id,
           h.plan_id,
           h.max_stores,
           h.amount,
           h.payment_method,
           h.status,
           h.start_date,
           h.end_date,
           h.auto_renewal,
           ${processedBySelect},
           ${processedByNameSelect},
           ${processedByEmailSelect},
           ${metadataSelect},
           h.created_at
         FROM SubscriptionHistory h
         ORDER BY h.created_at DESC`,
        { limit: filter.limit || 50 }
      );

      const fallbackTransactions = fallbackRows.map((row: Record<string, unknown>) => {
        const rawStatus = String(row.status || '').toLowerCase();
        const paymentStatus = ['pending', 'completed', 'failed', 'refunded'].includes(rawStatus)
          ? (rawStatus as 'pending' | 'completed' | 'failed' | 'refunded')
          : 'completed';

        let metadata: Record<string, any> | undefined;
        if (typeof row.metadata === 'string' && row.metadata.trim()) {
          try {
            metadata = JSON.parse(row.metadata) as Record<string, any>;
          } catch {
            metadata = undefined;
          }
        }

        return ({
        id: `history_${String(row.id)}`,
        userId: row.user_id as string,
        transactionType: 'manual_purchase' as const,
        planId: row.plan_id as string,
        maxStores: Number(row.max_stores || 1),
        amount: Number(row.amount || 0),
        currency: 'VND',
        paymentMethod: (row.payment_method as 'auto_payment' | 'bank_transfer' | 'credit_card' | 'cash' | 'admin_assign') || 'cash',
        paymentStatus,
        startDate: new Date(row.start_date as string),
        endDate: new Date(row.end_date as string),
        autoRenewal: Boolean(row.auto_renewal),
        processedBy: (row.processed_by as string) || undefined,
        processedByRole: 'system' as const,
        processedByName: (row.processed_by_name as string) || undefined,
        processedByEmail: (row.processed_by_email as string) || undefined,
        notes:
          String(row.payment_method || '').toLowerCase() === 'admin_assign'
            ? 'Cấp gói (nguồn SubscriptionHistory)'
            : 'Nguon du lieu: SubscriptionHistory',
        metadata,
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.created_at as string),
      });
      });

      const existingKeys = new Set(
        transactions.map(
          (t) => `${t.userId}|${t.planId}|${Number(t.amount || 0)}|${new Date(t.startDate).toISOString()}`
        )
      );

      const missingFallbackTransactions = fallbackTransactions.filter((t) => {
        const key = `${t.userId}|${t.planId}|${Number(t.amount || 0)}|${new Date(t.startDate).toISOString()}`;
        return !existingKeys.has(key);
      });

      transactions = [...transactions, ...missingFallbackTransactions]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, filter.limit || 50);
    } catch (fallbackError) {
      console.warn('Fallback query SubscriptionHistory failed:', fallbackError);
    }

    const transactionsWithUserInfo = await Promise.all(
      transactions.map((transaction) => enrichTransactionWithActors(transaction))
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

    const enrichedTransaction = await enrichTransactionWithActors(transaction);

    res.json(enrichedTransaction);
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