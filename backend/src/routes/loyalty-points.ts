import { Router, Response } from 'express';
import { authenticate, storeContext, AuthRequest } from '../middleware/auth';
import { loyaltyPointsService } from '../services/loyalty-points-service';
import { loyaltyPointsRepository } from '../repositories/loyalty-points-repository';

const router = Router();

router.use(authenticate);
router.use(storeContext);

// GET /api/loyalty-points/balance/:customerId - Get customer points balance
router.get('/balance/:customerId', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const { customerId } = req.params;

    const balance = await loyaltyPointsService.getBalance(customerId, storeId);
    res.json({ balance });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ error: 'Failed to get points balance' });
  }
});

// GET /api/loyalty-points/history/:customerId - Get customer points history
router.get('/history/:customerId', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const { customerId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const history = await loyaltyPointsService.getHistory(customerId, storeId, limit);
    res.json(history);
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to get points history' });
  }
});

// POST /api/loyalty-points/adjust - Manually adjust points (admin only)
router.post('/adjust', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const userId = req.user!.id;
    const { customerId, points, reason } = req.body;

    if (!customerId || points === undefined || !reason) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const result = await loyaltyPointsService.adjustPoints(
      customerId,
      storeId,
      points,
      reason,
      userId
    );

    res.json({ success: true, newBalance: result.newBalance });
  } catch (error) {
    console.error('Adjust points error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to adjust points' 
    });
  }
});

// POST /api/loyalty-points/validate-redemption - Validate points redemption
router.post('/validate-redemption', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const { customerId, pointsToRedeem, orderAmount } = req.body;

    if (!customerId || !pointsToRedeem || !orderAmount) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const validation = await loyaltyPointsService.validateRedemption(
      customerId,
      storeId,
      pointsToRedeem,
      orderAmount
    );

    res.json(validation);
  } catch (error) {
    console.error('Validate redemption error:', error);
    res.status(500).json({ error: 'Failed to validate redemption' });
  }
});

// GET /api/loyalty-points/transaction/:transactionId - Get transaction details
router.get('/transaction/:transactionId', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const { transactionId } = req.params;

    const transaction = await loyaltyPointsRepository.getTransactionById(
      transactionId,
      storeId
    );

    if (!transaction) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    res.json(transaction);
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ error: 'Failed to get transaction' });
  }
});

// GET /api/loyalty-points/settings - Get loyalty points settings
router.get('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const settings = await loyaltyPointsService.getSettings(storeId);

    if (!settings) {
      res.status(404).json({ error: 'Settings not found' });
      return;
    }

    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// PUT /api/loyalty-points/settings - Update loyalty points settings
router.put('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const settings = req.body;

    const updated = await loyaltyPointsService.updateSettings(storeId, settings);
    res.json({ success: true, settings: updated });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to update settings' 
    });
  }
});

// POST /api/loyalty-points/recalculate-tiers - Recalculate loyalty tiers for all customers
router.post('/recalculate-tiers', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;

    const result = await loyaltyPointsService.recalculateAllTiers(storeId);
    res.json({ 
      success: true, 
      message: `Updated ${result.updated} customers`,
      updated: result.updated 
    });
  } catch (error) {
    console.error('Recalculate tiers error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to recalculate tiers' 
    });
  }
});

// GET /api/loyalty-points/tier-info/:tier - Get tier information
router.get('/tier-info/:tier', async (req: AuthRequest, res: Response) => {
  try {
    const { tier } = req.params;
    const tierInfo = loyaltyPointsService.getTierInfo(tier);
    res.json(tierInfo);
  } catch (error) {
    console.error('Get tier info error:', error);
    res.status(500).json({ error: 'Failed to get tier info' });
  }
});

// POST /api/loyalty-points/deploy-sp - Deploy customer update stored procedure (admin only)
router.post('/deploy-sp', async (req: AuthRequest, res: Response) => {
  try {
    const { getConnection } = require('../db/connection');
    const fs = require('fs');
    const path = require('path');
    
    console.log('🚀 Deploying sp_Customers_Update stored procedure...');

    const pool = await getConnection();
    
    // Read the stored procedure file
    const spPath = path.join(__dirname, '../../scripts/stored-procedures/sp_Customers_Update.sql');
    const spContent = fs.readFileSync(spPath, 'utf8');
    
    // Execute the stored procedure
    await pool.request().query(spContent);
    
    console.log('✅ Successfully deployed sp_Customers_Update');
    
    res.json({ 
      success: true, 
      message: 'Successfully deployed sp_Customers_Update stored procedure' 
    });
  } catch (error) {
    console.error('Deploy SP error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to deploy stored procedure' 
    });
  }
});

export default router;
