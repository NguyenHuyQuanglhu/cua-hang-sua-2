import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, storeContext, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(storeContext);

// GET /api/payments
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    
    const payments = await query(
      `SELECT p.*, c.full_name as customer_name
       FROM Payments p
       LEFT JOIN Customers c ON p.customer_id = c.id
       WHERE p.store_id = @storeId
       ORDER BY p.created_at DESC`,
      { storeId }
    );

    res.json(payments.map((p: Record<string, unknown>) => ({
      id: p.id,
      storeId: p.store_id,
      customerId: p.customer_id,
      customerName: p.customer_name,
      amount: p.amount,
      paymentDate: p.payment_date,
      notes: p.notes,
      createdAt: p.created_at,
    })));
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Failed to get payments' });
  }
});

// POST /api/payments
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const { customerId, amount, paymentDate, paymentMethod, notes } = req.body;

    const result = await query(
      `INSERT INTO Payments (id, store_id, customer_id, amount, payment_date, payment_method, notes, created_at)
       OUTPUT INSERTED.*
       VALUES (NEWID(), @storeId, @customerId, @amount, @paymentDate, @paymentMethod, @notes, GETDATE())`,
      { 
        storeId, 
        customerId, 
        amount, 
        paymentDate: paymentDate || new Date(), 
        paymentMethod: paymentMethod || 'cash',
        notes 
      }
    );

    res.status(201).json({ success: true, payment: result[0] });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

export default router;
