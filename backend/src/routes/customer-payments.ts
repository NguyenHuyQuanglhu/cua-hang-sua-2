import { Router, Response } from 'express';
import { query, queryOne } from '../db';
import { authenticate, storeContext, AuthRequest } from '../middleware/auth';
import { cashTransactionRepository } from '../repositories/cash-transaction-repository';

const router = Router();

router.use(authenticate);
router.use(storeContext);

// GET /api/customer-payments (alias for /api/payments)
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
      id: p.Id,
      storeId: p.StoreId,
      customerId: p.CustomerId,
      customerName: p.customer_name,
      amount: p.Amount,
      paymentDate: p.PaymentDate,
      paymentMethod: 'cash', // Default since not in schema
      notes: p.Notes,
      createdAt: p.CreatedAt,
    })));
  } catch (error) {
    console.error('Get customer payments error:', error);
    res.status(500).json({ error: 'Failed to get customer payments' });
  }
});

// POST /api/customer-payments (alias for /api/payments)
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const { customerId, amount, paymentDate, notes } = req.body;

    const paymentId = crypto.randomUUID();
    const paymentDateValue = paymentDate || new Date();

    // Insert payment record
    await query(
      `INSERT INTO Payments (Id, StoreId, CustomerId, Amount, PaymentDate, Notes, CreatedAt)
       VALUES (@paymentId, @storeId, @customerId, @amount, @paymentDate, @notes, GETDATE())`,
      {
        paymentId,
        storeId,
        customerId,
        amount,
        paymentDate: paymentDateValue,
        notes: notes || null
      }
    );

    // Update customer debt
    if (customerId) {
      await query(
        `UPDATE Customers
         SET total_debt = CASE
           WHEN total_debt - @amount < 0 THEN 0
           ELSE total_debt - @amount
         END,
         total_paid = ISNULL(total_paid, 0) + @amount,
         updated_at = GETDATE()
         WHERE id = @customerId AND store_id = @storeId`,
        { customerId, amount, storeId }
      );
    }

    // Get customer name for cash transaction description
    const customer = await queryOne<{ full_name: string }>(
      `SELECT full_name FROM Customers WHERE id = @customerId AND store_id = @storeId`,
      { customerId, storeId }
    );
    const customerName = customer?.full_name || 'Khách hàng';

    // Create cash transaction for the payment (income)
    try {
      await cashTransactionRepository.create(
        {
          storeId,
          type: 'thu',
          transactionDate: paymentDateValue instanceof Date ? paymentDateValue.toISOString() : new Date(paymentDateValue).toISOString(),
          amount: amount,
          reason: `Thu tiền từ ${customerName}${notes ? ` - ${notes}` : ''}`,
          category: 'Thu tiền khách hàng',
          relatedInvoiceId: paymentId,
        },
        storeId
      );
      console.log(`[CustomerPayments] Created cash transaction for payment from ${customerName}: ${amount}`);
    } catch (cashError) {
      // Log but don't fail the payment if cash transaction fails
      console.error('[CustomerPayments] Failed to create cash transaction:', cashError);
    }

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Create customer payment error:', error);
    res.status(500).json({ error: 'Failed to create customer payment' });
  }
});

export default router;
/** */