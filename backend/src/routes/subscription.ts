import { Router, Response } from 'express';
import { query, queryOne } from '../db';
import { authenticate, storeContext, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/subscription/current - Get current subscription plan
router.get('/current', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get user's subscription details
    const userQuery = `
      SELECT 
        ISNULL(max_stores, 999) as max_stores,
        subscription_plan_id,
        subscription_start_date,
        subscription_end_date,
        auto_renewal,
        subscription_status
      FROM Users
      WHERE id = @userId
    `;

    const user = await queryOne(userQuery, { userId });
    const maxStores = user?.max_stores || 999;
    const planId = user?.subscription_plan_id || 'basic';
    const startDate = user?.subscription_start_date;
    const endDate = user?.subscription_end_date;
    // Handle auto_renewal: convert to boolean properly
    // SQL Server BIT can return true/false or 1/0 depending on driver
    const autoRenewal = user?.auto_renewal === null ? true : Boolean(user?.auto_renewal);
    const status = user?.subscription_status || 'active';

    // Count current stores
    const storesQuery = `
      SELECT COUNT(DISTINCT us.store_id) as count
      FROM UserStores us
      INNER JOIN Stores s ON us.store_id = s.id
      WHERE us.user_id = @userId AND s.status = 'active'
    `;

    const storesResult = await queryOne(storesQuery, { userId });
    const currentStores = storesResult?.count || 0;

    // Calculate days remaining
    let daysRemaining = null;
    let isExpired = false;
    if (endDate) {
      const now = new Date();
      const end = new Date(endDate);
      const diffTime = end.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      isExpired = daysRemaining < 0;
    }

    res.json({
      maxStores,
      currentStores,
      planId,
      startDate: startDate ? new Date(startDate).toISOString() : null,
      endDate: endDate ? new Date(endDate).toISOString() : null,
      daysRemaining,
      isExpired,
      autoRenewal,
      status,
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription' });
  }
});

// POST /api/subscription/upgrade - Upgrade subscription plan
router.post('/upgrade', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { planId, maxStores, paymentMethod } = req.body;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!planId || !maxStores) {
      res.status(400).json({ error: 'Missing planId or maxStores' });
      return;
    }

    console.log(`[Subscription] User ${userId} upgrading to plan ${planId} (${maxStores} stores) via ${paymentMethod}`);

    // For bank transfer, update immediately
    const now = new Date();
    const startDate = now;
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1); // Add 1 month
    
    const updateQuery = `
      UPDATE Users
      SET max_stores = @maxStores,
          subscription_plan_id = @planId,
          subscription_start_date = @startDate,
          subscription_end_date = @endDate,
          subscription_status = 'active',
          auto_renewal = 1,
          updated_at = GETDATE()
      WHERE id = @userId
    `;
    
    await query(updateQuery, { 
      userId,
      maxStores,
      planId,
      startDate,
      endDate,
    });

    // Create subscription history record
    const planPrice = getPlanPrice(planId);
    await query(
      `INSERT INTO SubscriptionHistory (id, user_id, plan_id, max_stores, amount, payment_method, start_date, end_date, status, auto_renewal, created_at)
       VALUES (NEWID(), @userId, @planId, @maxStores, @amount, @paymentMethod, @startDate, @endDate, 'active', 1, GETDATE())`,
      {
        userId,
        planId,
        maxStores,
        amount: planPrice,
        paymentMethod: paymentMethod || 'direct',
        startDate,
        endDate,
      }
    );

    // Log the subscription change
    await query(
      `INSERT INTO AuditLogs (id, user_id, action, entity_type, entity_id, details, created_at)
       VALUES (NEWID(), @userId, 'subscription_upgrade', 'subscription', @planId, @details, GETDATE())`,
      {
        userId,
        planId,
        details: JSON.stringify({ 
          planId, 
          maxStores, 
          paymentMethod,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          timestamp: new Date().toISOString() 
        })
      }
    );

    res.json({
      success: true,
      message: 'Subscription upgraded successfully',
      maxStores,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
  } catch (error) {
    console.error('Upgrade subscription error:', error);
    res.status(500).json({ error: 'Failed to upgrade subscription' });
  }
});

// Helper function to get plan price
function getPlanPrice(planId: string): number {
  const prices: Record<string, number> = {
    basic: 199000,
    pro: 499000,
    enterprise: 1999000,
  };
  return prices[planId] || 0;
}

// POST /api/subscription/toggle-auto-renewal - Toggle auto-renewal
router.post('/toggle-auto-renewal', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { autoRenewal } = req.body;

    console.log('[Toggle Auto-Renewal] Request received:', { userId, autoRenewal, body: req.body });

    if (!userId) {
      console.log('[Toggle Auto-Renewal] Unauthorized - no userId');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (typeof autoRenewal !== 'boolean') {
      console.log('[Toggle Auto-Renewal] Invalid autoRenewal type:', typeof autoRenewal);
      res.status(400).json({ error: 'autoRenewal must be a boolean' });
      return;
    }

    console.log('[Toggle Auto-Renewal] Updating user:', { userId, autoRenewal: autoRenewal ? 1 : 0 });

    await query(
      `UPDATE Users SET auto_renewal = @autoRenewal, updated_at = GETDATE() WHERE id = @userId`,
      { userId, autoRenewal: autoRenewal ? 1 : 0 }
    );

    console.log('[Toggle Auto-Renewal] Update successful');

    // Log the change
    await query(
      `INSERT INTO AuditLogs (id, user_id, action, entity_type, entity_id, details, created_at)
       VALUES (NEWID(), @userId, 'subscription_auto_renewal_toggle', 'subscription', @userId, @details, GETDATE())`,
      {
        userId,
        details: JSON.stringify({ 
          autoRenewal,
          timestamp: new Date().toISOString() 
        })
      }
    );

    console.log('[Toggle Auto-Renewal] Audit log created');

    res.json({
      success: true,
      autoRenewal,
      message: autoRenewal ? 'Đã bật tự động gia hạn' : 'Đã tắt tự động gia hạn',
    });
  } catch (error) {
    console.error('[Toggle Auto-Renewal] Error:', error);
    res.status(500).json({ error: 'Failed to toggle auto-renewal' });
  }
});

// POST /api/subscription/cancel - Cancel subscription
router.post('/cancel', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get current subscription
    const user = await queryOne(
      `SELECT subscription_plan_id, subscription_end_date FROM Users WHERE id = @userId`,
      { userId }
    );

    if (!user || user.subscription_plan_id === 'basic') {
      res.status(400).json({ error: 'Cannot cancel basic plan' });
      return;
    }

    // Update subscription status to cancelled and disable auto-renewal
    await query(
      `UPDATE Users 
       SET subscription_status = 'cancelled',
           auto_renewal = 0,
           updated_at = GETDATE()
       WHERE id = @userId`,
      { userId }
    );

    // Update subscription history
    await query(
      `UPDATE SubscriptionHistory
       SET status = 'cancelled'
       WHERE user_id = @userId AND status = 'active'`,
      { userId }
    );

    // Log the cancellation
    await query(
      `INSERT INTO AuditLogs (id, user_id, action, entity_type, entity_id, details, created_at)
       VALUES (NEWID(), @userId, 'subscription_cancelled', 'subscription', @userId, @details, GETDATE())`,
      {
        userId,
        details: JSON.stringify({ 
          planId: user.subscription_plan_id,
          endDate: user.subscription_end_date,
          timestamp: new Date().toISOString() 
        })
      }
    );

    res.json({
      success: true,
      message: 'Đã hủy gói dịch vụ. Gói sẽ hết hạn vào ngày đã thanh toán.',
      endDate: user.subscription_end_date,
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

export default router;
